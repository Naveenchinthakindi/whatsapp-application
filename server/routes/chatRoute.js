const express = require('express');
const { authMiddleware } = require('../middleware');
const { sendMessage, getConversation, getMessages, markAsRead, deleteMessage } = require('../controllers/chatController');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const router = express.Router();

// ==========================
// Chat Routes (Protected)
// ==========================

// Route to send a message (with optional file upload)
// Applies authentication and file upload middleware
router.post("/send-message", authMiddleware, multerMiddleware, sendMessage);

// Route to get all conversations for the authenticated user
router.get("/conversations", authMiddleware, getConversation);

// Route to get all messages from a specific conversation
router.get("/conversation/:conversationId/messages", authMiddleware, getMessages);

// Route to mark messages as read
router.put("/messages/read", authMiddleware, markAsRead);

// Route to delete a message by ID (only if user is the sender)
router.delete("/messages/:messageId", authMiddleware, deleteMessage);

// Export the router to be used in the main app
module.exports = router;