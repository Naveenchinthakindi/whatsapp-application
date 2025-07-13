const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

// Cloudinary configuration using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Uploads a media file (image or video) to Cloudinary
const uploadFileToCloudinary = (file) => {
  const isVideo = file.mimetype.startsWith("video");
  const options = {
    resource_type: isVideo ? "video" : "image",
  };

  return new Promise((resolve, reject) => {
    const uploader = isVideo
      ? cloudinary.uploader.upload_large // For videos (supports chunked upload)
      : cloudinary.uploader.upload; // For images or small files

    uploader(file.path, options, (error, result) => {
      // Clean up the temp file after upload
      fs.unlink(file.path, (err) => {
        if (err) console.warn("Temp file deletion failed:", err);
      });

      if (error) {
        return reject(error);
      }
      resolve(result); // Cloudinary result includes URL, public_id, etc.
    });
  });
};

// Multer middleware to handle single file upload (under field name "media")
const multerMiddleware = multer({ dest: "uploads/" }).single("media"); //Creates a Multer instance that saves uploaded files to a local folder called uploads/.

// Export both the Cloudinary uploader and multer middleware

module.exports = {
  uploadFileToCloudinary,
  multerMiddleware,
};
