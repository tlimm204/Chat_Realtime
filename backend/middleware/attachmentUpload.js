const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(__dirname, "../uploads/attachments");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
];

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = allowedTypes.includes(file.mimetype);
    callback(allowed ? null : new Error("Loại file không được hỗ trợ"), allowed);
  },
});
