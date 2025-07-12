// 🔎 Summary:
// This schema is useful for a real-time chat or messaging system. It supports:
// One-on-one conversations.
// Text, image, and video messages.
// Message reactions.
// Tracking the status of a message (sent, delivered, etc.).

const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define schema for a message in a conversation
const messageSchema = new Schema(
  {
    // Reference to the conversation this message belongs to
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    // Sender of the message (User ID)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Receiver of the message (User ID)
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Text content of the message (if any)
    content: { type: String },

    // URL to an image or video file attached to the message
    imageOrVideoUrl: { type: String },

    // Type of the message: image, video, or text
    contentType: { type: String, enum: ["image", "video", "text"] },

    // Reactions to this message (e.g., emojis by different users)
    reactions: [
      {
        // User who reacted
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        // Emoji used for the reaction
        emoji: String,
      },
    ],

    // Status of the message (e.g., 'send', 'delivered', 'seen')
    messageStatus: { type: String, default: "send" },
  },
  {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Create the Message model
const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
