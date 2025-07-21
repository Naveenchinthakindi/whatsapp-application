const { Server } = require("socket.io");
const User = require("../modals/User");
const Message = require("../modals/Message");

//Map to store the online users --> userId, socketId
const onlineUsers = new Map();

//Map to track the typing status --> userId -> [conversation]:boolean
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL, // allow only ths origin
      credentials: true, //check the token or cookie is included in header
      methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000, // disconnect after 1 min when user is offline
  });

  //when a new socket connection is established
  io.on("connection", (socket) => {
    console.log("User connected ", socket.id);
    let userId = null;

    //handle user connection and mark then online in db
    socket.on("user_connection", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        // Add the user to the onlineUsers map
        onlineUsers.set(userId, socket.id); // This lets us track which users are currently connected and their socket IDs

        // A room is a way to group sockets together in Socket.IO.
        // Once a socket joins a room, you can send messages just to that room, instead of broadcasting to everyone.
        // Socket.IO rooms allow us to target this specific user later using io.to(userId)
        socket.join(userId); // join a personal room for direct emits

        // Update this user's online status in the database
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        //notify all users that this user is now online
        io.emit("user_status", { userId, isOnline: true });
      } catch (error) {
        console.error("Error handling fro user connection ", error);
      }
    });

    //Return the online status of a specific user when requested
    socket.on("get_user_status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId); //This checks if their userId exists in the onlineUsers map

      //Send the status back using the provided callback function
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    //forward message to receiver if online
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);
        //  If the receiver is online, emit the message directly to their socket
        // Sends the message only to that user, not to all users
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("received_message", message);
        }
      } catch (error) {
        console.error("Error sending message ", error.message);
        socket.emit("error_message", { error: error.message });
      }
    });

    // Listen for "message_read" event from a client and update message as read and notify sender
    socket.on("message_read", async ({ messageIds, senderId }) => {
      try {
        //  Update all messages in the DB as "read" where the ID is in messageIds
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );

        //  Get the sender's socket ID from the onlineUsers map
        const senderSocketId = onlineUsers.get(senderId);

        //  If sender is online, notify them about the read status of each message
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.log("Error updating message read status", error.message);
      }
    });

    // Handle typing_start event and auto-stop typing after a timeout
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      // Initialize tracking object for this user if not already present
      if (!typingUsers.has(userId)) {
        typingUsers.set(userId, {});
      }

      const userTyping = typingUsers.get(userId);

      // Mark user as typing in this conversation
      userTyping[conversationId] = true;

      // Clear any previous timeout for this conversation to avoid overlap
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      // Set a timeout to automatically mark the user as not typing after 3 seconds
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;

        // Notify the receiver that typing has stopped
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });

        console.log(
          `Auto-stopped typing for user ${userId} in conversation ${conversationId}`
        );
      }, 3000);

      // Notify the receiver that this user is typing
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
      console.log(`User ${userId} is typing in conversation ${conversationId}`);
    });

    // Handle manual stop typing event from the client
    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      // If any of the required values are missing, exit early
      if (!userId || !conversationId || !receiverId) return;

      // Check if we have a typing record for this user
      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);

        // Set typing status to false for the conversation
        userTyping[conversationId] = false;

        // Clear any existing timeout for this conversation (used for auto-stop)
        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`]; // Clean up to free memory
        }
      }

      // Notify the receiver that the user has stopped typing manually
      socket.to(receiverId).emit("user_typing", {
        userId, // Who stopped typing
        conversationId, // In which conversation
        isTyping: false, // Typing status
      });

      console.log(
        `User ${userId} manually stopped typing in conversation ${conversationId}`
      );
    });

    // Handle "add_reaction" event from client
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId, reactionUserId }) => {
        try {
          // Find the message document by its ID
          const message = await Message.findById(messageId);

          // If message doesn't exist, exit early
          if (!message) return;

          // Check if the user has already reacted to the message
          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId
          );

          if (existingIndex > -1) {
            // User has already reacted
            // Get the existing reaction
            const existing = message.reactions[existingIndex];

            if (existing.emoji === emoji) {
              // If the same emoji is sent again, remove the reaction (toggle off)
              message.reactions.splice(existingIndex, 1);
            } else {
              // If a different emoji is sent, update the emoji for this user's reaction
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            // If user has not reacted yet, add a new reaction
            message.reactions.push({ user: reactionUserId, emoji });
          }

          // Save the updated message document
          await message.save();

          // Re-fetch the message with related fields populated for broadcasting
          const populateMessage = await Message.findOne({ _id: message?._id })
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")
            .populate("reactions.user", "username"); // populate user info in reactions

          // Construct the payload to send via socket
          const reactionUpdated = {
            messageId,
            reactions: populateMessage.reactions,
          };

          // Look up the socket IDs of the sender and receiver from the online users map
          const senderSocket = onlineUsers.get(
            populateMessage.sender._id.toString()
          );
          const receiverSocket = onlineUsers.get(
            populateMessage.receiver?._id.toString()
          );

          // Send the updated reactions to both sender and receiver (if they are online)
          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionUpdated);
          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_update", reactionUpdated);
        } catch (error) {
          // Log any errors that occur during this process
          console.error("Error handling reaction ", error.message);
        }
      }
    );

    // Handle user disconnection
    const handleDisconnect = async () => {
      if (!userId) return; // If user ID doesn't exist, exit early

      try {
        // Remove user from the online users map
        onlineUsers.delete(userId);

        // If the user is currently marked as typing
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);

          // Loop through the properties of the user's typing object
          // For example: { chat123_timeout: timeoutId }
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              clearTimeout(userTyping[key]); // Cancel any typing timeout
            }
          });

          // Remove the user from the typing users map
          typingUsers.delete(userId);
        }

        // 3. Update user status in the database (MongoDB)
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // 4. Notify all connected clients that the user went offline
        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        // 5. Remove user from their private socket room (if used)
        socket.leave(userId);

        console.log("User ID Disconnected:", userId);
      } catch (error) {
        console.log("handleDisconnect error:", error.message);
      }
    };

    // Listen for the "disconnect" event from the client
    socket.on("disconnect", handleDisconnect);
  });

  // Attach the map of online users to the Socket.IO instance
  // This allows other modules to access the currently online users
  io.socketUserMap = onlineUsers;

  return io;
};

module.exports = initializeSocket;