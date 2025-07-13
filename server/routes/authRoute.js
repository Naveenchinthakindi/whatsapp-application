const express = require("express");
const {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
} = require("../controllers/authController");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const {authMiddleware} = require("../middleware");
const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/logout", logout);

//protected route
router.put("/update-profile", authMiddleware, multerMiddleware, updateProfile);
router.get("/check-auth", authMiddleware,checkAuthenticated)

module.exports = router;
