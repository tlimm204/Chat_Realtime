const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const avatarUpload = require("../middleware/avatarUpload");
const { getMe, updateProfile, changePassword, uploadAvatar } = require("../controllers/userController");

const router = express.Router();
router.get("/me", authMiddleware, getMe);
router.put("/profile", authMiddleware, updateProfile);
router.put("/password", authMiddleware, changePassword);
router.post("/avatar", authMiddleware, avatarUpload.single("avatar"), uploadAvatar);

module.exports = router;
