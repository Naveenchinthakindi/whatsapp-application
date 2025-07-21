const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const { response } = require("../utils");
const Conversation = require("../modals/Conversation");
const Message = require("../modals/Message");

// Controller function to handle sending a message
exports.sendMessage = async (req, res) => {
  const { senderId, receiverId, content, messageStatus } = req.body;

  try {
    const file = req.file;

    // Sort participants to maintain a consistent order for one-to-one conversation check
    const participants = [senderId, receiverId].sort();

    // Check if a conversation between sender and receiver already exists
    let conversation = await Conversation.findOne({ participants });

    // If not, create a new conversation
    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    // If a file is attached (image or video)
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "File is not uploaded to Cloudinary");
      }

      imageOrVideoUrl = uploadFile.secure_url;

      // Detect the type of uploaded file
      if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else {
        return response(res, 400, "Unsupported file type");
      }

      // If it's a text message (no file, but content provided)
    } else if (content && content.trim()) {
      contentType = "text";

      // If neither content nor file is present, return error
    } else {
      return response(res, 400, "Message content is required");
    }

    // Create a new message document
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    // Save the message to the database
    await message.save();

    // Update lastMessage in the conversation
    if (message?.content) {
      conversation.lastMessage = message._id;
    }

    // Increment unread message count (assumes unreadCount is initialized in schema)
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;

    // Save updated conversation
    await conversation.save();

    // Find the newly created message by its ID
    // and populate the sender and receiver fields with selected user data
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture") // Replace sender's ObjectId with actual user document, only include username and profilePicture of sender
      .populate("receiver", "username profilePicture"); // Replace receiver's ObjectId with actual user document, only include username and profilePicture of receiver

    //emit socket event for realtime
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("receive_message", populatedMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    // Send success response with the new message
    return response(res, 201, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("sendMessage error: ", error.message);
    return response(res, 500, "Internal server error", error);
  }
};

// Controller to fetch all conversations for the logged-in user
exports.getConversation = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Find all conversations where this user is a participant
    const conversations = await Conversation.find({
      participants: userId, // Matches any conversation where this user is involved
    })
      // Populate participant details with selected fields (for performance & privacy)
      .populate(
        "participants", // The field that stores user references
        "username profilePicture isOnline lastSeen" // Only these fields will be fetched from User model
      )
      // Populate the lastMessage field with message details
      .populate({
        path: "lastMessage", // Populate the lastMessage reference
        populate: {
          path: "sender receiver", // Further populate sender and receiver inside the message
          select: "username profilePicture", // Only include username and profilePicture of sender/receiver
        },
      })
      // Sort conversations by latest activity (most recently updated first)
      .sort({ updatedAt: -1 });

    // Send success response with all fetched conversations
    return response(
      res,
      200,
      "All conversations fetched successfully",
      conversations
    );
  } catch (error) {
    // Handle any unexpected errors and log for debugging
    console.error("getConversation API error: ", error);
    return response(res, 500, "Internal server error", error);
  }
};

// Controller to get all messages for a specific conversation
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  try {
    // Check if the conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }

    // Verify that the user is a participant in the conversation
    if (!conversation.participants.includes(userId)) {
      return response(
        res,
        403,
        "User is not authorized to view this conversation"
      );
    }

    // Fetch all messages in this conversation
    // Also populate sender and receiver details (username and profile picture only)
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt"); // Sort messages in the order they were sent (oldest first)

    // Update message status to 'read' for messages that:
    // - Belong to this conversation
    // - Are received by the current user(YOU)
    // - Have a status of "send" or "delivered" (i.e., not yet read)
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] }, // Only update messages that are not yet "read"
      },
      {
        $set: { messageStatus: "read" }, // Change their status to "read"
      }
    );

    // Reset the unread message count for this conversation
    // This helps keep the notification badge accurate
    conversation.unreadCount = 0;
    await conversation.save();

    // Return the retrieved messages in the response
    return response(res, 200, "Messages retrieved successfully", messages);
  } catch (error) {
    // Log and return a server error if something goes wrong
    console.error("getMessages error:", error.message);
    return response(res, 500, "Internal Server Error", error.message);
  }
};

// Controller to mark specific messages as "read" by the receiver
exports.markAsRead = async (req, res) => {
  const { messageIds } = req.body; // Array of message IDs to mark as read
  const userId = req.user.userId; // ID of the currently logged-in user

  try {
    // Fetch messages that match the given IDs and were sent to the current user
    // This helps confirm that the user is authorized to mark them as read
    const messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId, // Ensure these messages were received by this user
    });

    if (!messages.length) {
      return response(res, 404, "No messaged Found", messages);
    }

    // Update the message status to "read" only for messages:
    // - With the given IDs
    // - That were actually received by this user
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      {
        $set: { messageStatus: "read" }, // Set the message status to "read"
      }
    );

    if (req.io && req.socketUserMap) {
      for (const message of messageIds) {
        const senderSocketId = req.socketUserMap?.get(
          message.sender.toString()
        );
        if (senderSocketId) {
          const updatedMessage = {
            _id: message._id,
            messageStatus: "read",
          };

          req.io.to(senderSocketId).emit("message_read", updatedMessage);
          await message.save();
        }
      }
    }

    // Respond with success and the messages that were marked as read
    return response(res, 200, "Messages marked as read successfully", messages);
  } catch (error) {
    // Catch and log any unexpected errors
    console.error("markAsRead error: ", error.message);
    return response(res, 500, "Internal server error", error.message);
  }
};

//delete the message
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    // Attempt to find the message in the database by its ID
    const message = await Message.findById(messageId);

    if (!message) return response(res, 404, "Message not found");

    // Check if the current user is the sender of the message
    if (message.sender.toString() !== userId) {
      return response(res, 403, "Not authorized to delete message");
    }

    // Delete the message from the database
    await message.deleteOne();

    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap?.get(
        message.receiver.toString()
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
      }
    }

    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    // Log any unexpected errors to the console
    console.error("deleteMessage error:", error.message);
  }
};
