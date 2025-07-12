// Step-1: Send OTP

const User = require("../modals/User"); 
const sendOtpToEmail = require("../services/emailService"); // Email OTP service
const { sendOtpToPhoneNumber, verifyPhoneOtp } = require("../services/twilioService"); // Twilio phone OTP services
const { otpGenerate, response } = require("../utils"); // Utility functions (OTP generator and response helper)

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
      user.emailOtp = null;   // Clear stored OTP after successful verification
      await user.save();      // Save changes to DB

      return response(res, 200, "Email verified successfully", user);
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
      await user.save();      // Save changes

      return response(res, 200, "Phone verified successfully", user);
    }

  } catch (error) {
    console.error("Verify OTP error: ", error.message); // Log error
    return response(res, 500, "Internal server error"); // Respond with server error
  }
};

module.exports = { sendOtp, verifyOtp }; // Export controller functions
