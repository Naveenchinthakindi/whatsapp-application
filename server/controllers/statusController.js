const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Status = require("../modals/Status");
const { response } = require("../utils"); // Custom response utility

// Controller to create a new status (text, image, or video)
exports.createStatus = async (req, res) => {
  const { content, contentType } = req.body;
  const userId = req.user.userId;

  let mediaUrl = null;
  let finalContentType = contentType || "text";

  try {
    const file = req.file; // Multer will place uploaded file here

    // If media file is uploaded, process it
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file); // Upload to Cloudinary

      //  Check if upload succeeded
      if (!uploadFile?.secure_url) {
        return response(res, 400, "File is not uploaded in Cloudinary");
      }

      mediaUrl = uploadFile.secure_url;

      // Determine the actual content type from MIME
      if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    }

    // If no file, check that text content exists
    else if (content && content.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    // Set expiry time (24 hours from now)
    const expiryAt = new Date();
    expiryAt.setHours(expiryAt.getHours() + 24);

    // Create and save the new status document
    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiryAt: expiryAt,
    });

    await status.save();

    // Fetch the newly created status with populated user and viewers
    const populateStatus = await Status.findOne({ _id: status._id })
      .populate("user", "username profilePicture") // Get user info
      .populate("viewers", "username profilePicture"); // Get viewer info

    // Emit a socket event to notify all connected users of a new status
    if (req.io && req.socketUserMap) {
      // Loop through all currently connected users (userId => socketId)
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        // Skip the user who created the status (they don't need to see their own notification)
        if (connectedUserId !== userId) {
          // Emit the 'new_status' event to that user's socket
          req.io.to(socketId).emit("new_status", populateStatus);
        }
      }
    }

    // Send back the populated status as response
    return response(res, 200, "Status created successfully", populateStatus);
  } catch (error) {
    console.log("createStatus error:", error.message);
    return response(res, 500, "Internal server error", error.message);
  }
};

// Controller to get all active (non-expired) statuses
exports.getStatus = async (req, res) => {
  try {
    // Find all statuses that have not yet expired
    const statuses = await Status.find({
      expiryAt: { $gte: new Date() }, // Only fetch statuses valid right now
    })
      .populate("user", "username profilePicture") // Populate user info (owner of status)
      .populate("viewers", "username profilePicture") // Populate viewer details
      .sort({ createdAt: -1 }); // Sort by creation date, most recent first

    return response(res, 200, "Statuses retrieved successfully", statuses);
  } catch (error) {
    console.error("getStatus error:", error.message);
    return response(res, 500, "Internal server error", error.message);
  }
};

// Mark a status as viewed by the current user
exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    // Only add user if they haven't viewed it yet
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      // Return updated status with user and viewer info
      const updatedStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture  ")
        .populate("viewers", "username profilePicture");

      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString()
        );

        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };

          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("status owner is not connected");
        }
      }
    } else {
      console.log("User already viewed the status");
    }

    return response(res, 200, "Status viewed", updatedStatus);
  } catch (error) {
    console.error("viewStatus error:", error.message);
    return response(res, 500, "Internal server error", error.message);
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;

    const status = await Status.findById(statusId);

    if (!status) return response(res, 404, "Status not found");

    if (status.user?.toString() !== userId) {
      return response(res, 400, "User not authorized to delete the status");
    }

    await Status.deleteOne({ _id: statusId });

    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "Status deleted successfully", status);
  } catch (error) {
    console.error("delete Status error: ", error);
    return response(res, 500, "Internal server error ", error.message);
  }
};
