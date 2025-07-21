const express = require("express");
const { authMiddleware } = require("../middleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const { createStatus, getStatus, deleteStatus, viewStatus } = require("../controllers/statusController");
const router = express.Router();

//protected routes
router.post("/",authMiddleware,multerMiddleware, createStatus);
router.get("/",authMiddleware, getStatus);
router.put("/:statusId/view",authMiddleware, viewStatus);
router.delete("/:statusId",authMiddleware, deleteStatus);


module.exports = router;