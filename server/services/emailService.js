const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// =========================
// ✅ Email Transport Setup
// =========================

// Create a transporter using Gmail service and authentication credentials from .env
const transporter = nodemailer.createTransport({
  service: "gmail", // Use Gmail as the email service
  port: 587, // Port for TLS (not SSL)
  secure: false, // false for port 587, true for port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify if transporter is working (used once at startup)
transporter.verify((error, success) => {
  if (error) {
    console.error("Gmail services connection failed"); // Connection failed
  } else {
    console.log("Gmail configuration verified and ready to send email"); // Transporter is ready
  }
});

// ===================================
// ✅ Function to Send OTP to Email
// ===================================
const sendOtpToEmail = async (email, otp) => {
  // HTML email template with inline styles
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">🔐 WhatsApp Web Verification</h2>
      
      <p>Hi there,</p>
      
      <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>
      
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>WhatsApp Web Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;

  // Send the email using transporter
  await transporter.sendMail({
    from: `whatsapp web ${process.env.SMTP_USER}`, // Sender name and address
    to: email, // Recipient's email address
    subject: "whatsapp verification code", // Subject line
    html: html, // HTML content of the email
  });
};

module.exports = sendOtpToEmail;
