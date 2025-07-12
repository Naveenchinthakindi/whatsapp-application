const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    // Optional phone number - must be unique if provided
    // 'sparse: true' means MongoDB will only enforce uniqueness on documents where this field is set
    // Only apply the unique rule to documents that actually have a phoneNumber.
    // If the field is null or missing, MongoDB ignores it for uniqueness.
    phoneNumber: { type: String, unique: true, sparse: true },

    // Optional suffix for phone number (e.g., country code)
    phoneSuffix: { type: String, unique: false },
    username: { type: String },

    // Email address - must be unique and lowercase
    email: {
      type: String,
      unique: true, // ensures no two users can register with the same email
      lowercase: true, // stores email in lowercase
      validate: {
        validator: function (value) {
          // Validates basic email format
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Invalid email address format",
      },
    },
    emailOtp: { type: String },
    emailOtpExpiry: { type: Date },
    profilePicture: { type: String },

    // User bio or description
    about: { type: String },

    // Last seen timestamp for activity tracking
    lastSeen: { type: Date },

    // Online status flag
    isOnline: { type: Boolean, default: false },

    // Whether the user has verified their account (e.g., email or phone)
    isVerified: { type: Boolean, default: false },

    // Whether the user agreed to terms of service or similar
    agree: { type: Boolean, default: false },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
