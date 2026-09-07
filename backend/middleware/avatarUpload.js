const multer = require("multer");
const path = require("path");
const fs = require("fs");

const avatarDirectory = path.join(__dirname, "../uploads/avatars");
fs.mkdirSync(avatarDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, avatarDirectory),
  filename: (req, file, callback) => {
    callback(null, `${req.userId}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const isAllowed = allowed.includes(file.mimetype);

    callback(
      isAllowed
        ? null
        : new Error("Avatar chỉ hỗ trợ JPG, PNG hoặc WEBP"),
      isAllowed
    );
  },
});
