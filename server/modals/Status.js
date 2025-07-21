const mongoose = require('mongoose');
const Schema =  mongoose.Schema;

// Define the schema for a user's status (like WhatsApp or Instagram story)
const statusSchema = new Schema({
    // Reference to the user who posted the status
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",        // Refers to the User model
        required: true
    },

    // The content of the status (could be text or URL of image/video)
    content: {
        type: String,
        required: true
    },

    // Array of user IDs who have viewed this status
    viewers: [{
        type: mongoose.Schema.Types.ObjectId, ref:"User", default: [] 
    }],

    // Time when the status should expire (usually 24 hours after posting)
    expiryAt: {
        type: Date,
        required: true
    }
}, {
    // Automatically adds createdAt and updatedAt timestamps
    timestamps: true
});

// Create and export the Status model
const Status = mongoose.model("Status", statusSchema);
module.exports = Status;
