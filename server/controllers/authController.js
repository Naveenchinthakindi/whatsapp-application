// Step-1: Send OTP
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const { sendOtpToPhoneNumber, verifyPhoneOtp } = require("../services/twilioService"); // Twilio phone OTP services
const { otpGenerate, response, generateJwtToken } = require("../utils");
const sendOtpToEmail = require("../services/emailService"); // Email OTP service
const User = require("../modals/User");
const Conversation = require("../modals/Conversation");

// Controller function to handle sending OTP to either email or phone
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerate(); // Generate a new OTP
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // Set OTP expiry time (5 minutes from now)
  let user;

  try {
    // ======= EMAIL OTP FLOW =======
    if (email) {
      user = await User.findOne({ email }); // Find existing user by email

      if (!user) {
        user = new User({ email }); // Create new user if not found
      }

      // Assign OTP and its expiry to the user
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;

      await user.save(); // Save user with OTP info
      await sendOtpToEmail(email, otp); // Send the OTP via email

      return response(res, 200, "OTP sent to your email", { email }); // Respond with success
    }

    // ======= PHONE OTP FLOW =======
    if (!phoneSuffix || !phoneNumber) {
      return response(res, 400, "Phone number and Suffix is required"); // Validation check
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`; // Build full phone number (e.g., +91 + 9876543210)

    // Find existing user by phone info
    user = await User.findOne({ phoneNumber, phoneSuffix });

    // If not found, create a new user with the phone info
    if (!user) {
      user = new User({ phoneNumber, phoneSuffix });
    }

    await user.save(); // Save user before sending OTP
    await sendOtpToPhoneNumber(fullPhoneNumber); // Use Twilio to send SMS OTP

    return response(res, 200, "Otp sent successfully", user); // Respond with success
  } catch (error) {
    console.error(error.message); // Log the error for debugging
    return response(res, 500, "Internal server error"); // Handle failure gracefully
  }
};

// Step-2: Verify OTP
const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;
  try {
    let user;

    // ======= EMAIL VERIFICATION FLOW =======
    if (email) {
      user = await User.findOne({ email }); // Find user by email

      if (!user) {
        return response(res, 404, "User not found");
      }

      const now = new Date();

      // Validate OTP: check if it matches and hasn't expired
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== otp ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid or Expired OTP");
      }

      user.isVerified = true; // Mark user as verified
      user.emailOtp = null; // Clear stored OTP after successful verification
      await user.save(); // Save changes to DB
    }
    // ======= PHONE VERIFICATION FLOW =======
    else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and phone suffix are required");
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`; // Build full phone number
      user = await User.findOne({ phoneNumber, phoneSuffix }); // Find user by phone

      if (!user) {
        return response(res, 404, "User not found");
      }

      const result = await verifyPhoneOtp(fullPhoneNumber, otp); // Call Twilio to verify OTP

      if (result.status !== "approved") {
        return response(res, 400, "Invalid OTP"); // If not approved, return error
      }

      user.isVerified = true; // Mark user as verified
      await user.save(); // Save changes
    }

    // Generate a JWT (JSON Web Token) using the user's _id
    const token = generateJwtToken(user?._id);

    // Set a cookie named "auth_token" on the response
    res.cookie("auth_token", token, {
      httpOnly: true, // Ensures the cookie is not accessible via JavaScript (mitigates XSS attacks)
      maxAge: 1000 * 60 * 60 * 24 * 365, // Cookie expiration set to 1 year (in milliseconds)
    });

    return response(res, 200, "OTP verified successfully", { token, user });
  } catch (error) {
    console.error("Verify OTP error: ", error.message); // Log error
    return response(res, 500, "Internal server error"); // Respond with server error
  }
};

// Step-3: Update User Profile
const updateProfile = async (req, res) => {
  try {
    // Destructure user input from the request body
    const {
      agree,
      username,
      about,
      email,
      phoneNumber,
      phoneSuffix,
      profilePicture,
    } = req.body;

    // Get the authenticated user's ID from the decoded JWT (added by middleware)
    const userId = req.user?.userId;

    // Fetch the user from the database
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }

    // ===============================
    // 1. Handle Profile Picture Upload
    // ===============================
    const file = req.file;

    if (file) {
      // If a file is uploaded, upload it to Cloudinary
      const uploadResult = await uploadFileToCloudinary(file);
      console.log("Cloudinary upload result:", uploadResult);

      // Save Cloudinary URL to user profile
      user.profilePicture = uploadResult?.secure_url;
    } else if (profilePicture) {
      // If profilePicture is provided as a URL in the request body
      user.profilePicture = profilePicture;
    }

    // ===============================
    // 2. Update Other Profile Fields
    // ===============================
    if (username) user.username = username;
    if (about) user.about = about;
    if (agree !== undefined) user.agree = agree;

    // Save updated user data
    await user.save();

    // Return updated user object (you may want to exclude sensitive fields)
    return response(res, 200, "User profile updated successfully", user);
  } catch (error) {
    console.error("Update profile API error:", error.message);
    return response(res, 500, "Internal server error");
  }
};

// Step-4: Logout Controller
const logout = async (req, res) => {
  try {
    // Clear the JWT cookie by setting it to an empty string and expiring it immediately
    res.cookie("auth_token", "", {
      httpOnly: true, // Make sure cookie can't be accessed via client-side JS
      expires: new Date(0), // Set expiration date in the past to invalidate the cookie
    });

    // Respond with success message
    return response(res, 200, "User logged out successfully");
  } catch (error) {
    console.error("Logout error:", error.message);
    return response(res, 500, "Internal server error");
  }
};

// Method to check if the user is authenticated
const checkAuthenticated = async (req, res) => {
  try {
    // Extract user ID from decoded JWT (injected by auth middleware)
    const userId = req.user?.userId;

    // If userId is not available, they are not authenticated
    if (!userId) {
      return response(
        res,
        401,
        "Unauthorized! Please log in before accessing the application"
      );
    }

    // Fetch user from the database
    const user = await User.findById(userId);

    if (!user) {
      return response(res, 404, "User not found. Please log in again.");
    }

    return response(
      res,
      200,
      "User is authenticated and allowed to use WhatsApp",
      user
    );
  } catch (error) {
    console.error("checkAuthenticated error:", error.message);
    return response(res, 500, "Internal server error");
  }
};

// Get all users except the logged-in user and their conversation info
const getAllUsers = async (req, res) => {
  try {
    // Get the logged-in user's ID from the decoded JWT
    const loggedInUserId = req.user?.userId;

    //If user ID is missing (JWT issue), return unauthorized
    if (!loggedInUserId) {
      return response(res, 401, "Unauthorized access");
    }

    // Fetch all users EXCEPT the logged-in user
    // Select only relevant profile fields to return
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("username email profilePicture about lastSeen isOnline phoneSuffix phoneNumber")
      .lean(); // Return plain JS objects for performance and easier manipulation

    //  For each user, find existing conversation with logged-in user
    const usersWithConversations = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUserId, user._id] }, // Find conversation where both users are participants
        })
          .populate({
            path: 'lastMessage', // Populate lastMessage document
            select: "content createdAt sender receiver", // Select only important fields
          })
          .lean(); // Also return plain object

        // Return user profile + conversation (or null if no chat exists)
        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );

    // 4. Send final response
    return response(res, 200, "All users retrieved successfully", usersWithConversations);

  } catch (error) {
    console.error("getAllUsers error:", error.message);
    return response(res, 500, "Internal server error");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};
