// 🔎 Summary:
// This Conversation model is for a messaging/chat app, 
// Each conversation has participants (users involved).
// You can store the ID of the last message to optimize performance.
// unreadCount helps manage or display notification badges in the UI.
// timestamps is useful to track when the conversation started or was last updated.

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for a conversation between users
const conversationShema = new Schema({
  
  // Array of User IDs participating in the conversation
  // Refers to the "User" model using ObjectId references
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // The ID of the last message sent in this conversation
  // Can be used to quickly show previews in a chat list
  lastMessage: { type: mongoose.Schema.Types.ObjectId },

  // Optional field to track total unread messages in the conversation
  unreadCount: { type: Number, default: 0 }

}, {
  // Automatically adds 'createdAt' and 'updatedAt' timestamps
  timestamps: true
});

// Create the Conversation model
const Conversation = mongoose.model("Conversation", conversationShema);

module.exports = Conversation;