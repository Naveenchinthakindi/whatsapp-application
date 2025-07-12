const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;    
const serviceSid = process.env.TWILIO_SERVICE_SID; 

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// ==========================
// ✅ Send OTP to phone number
// ==========================
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("Sending OTP to this number:", phoneNumber);

    // Check if phone number is provided
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Send verification code via SMS using Twilio Verify
    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,   // Phone number must include country code (e.g. +14155552671)
        channel: "sms",    // Send via SMS (can also be 'call' or 'email' if enabled)
      });

    console.log("Twilio response:", response);
    return response;  // Returns Twilio's verification object
  } catch (error) {
    console.error("sendOtpToPhoneNumber error:", error.message);
    throw new Error("Failed to send OTP");  // Throw a user-friendly error
  }
};

// =======================
// ✅ Verify the OTP code
// =======================
const verifyPhoneOtp = async (phoneNumber, otp) => {
  try {
    // Check the entered code against Twilio's Verify service
    const response = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,  // OTP code user entered
      });

    console.log("OTP verification result:", response);
    return response;  // Returns verification check object (status will be 'approved' if correct)
  } catch (error) {
    console.error("verifyPhoneOtp error:", error.message);
    throw new Error("OTP verification failed");  // Generic error message for client
  }
};

// Export the functions to use in other parts of the app
module.exports = { sendOtpToPhoneNumber, verifyPhoneOtp };
