const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Đường dẫn thư mục lưu ảnh.
const uploadDirectory = path.join(
  __dirname,
  "../uploads"
);

// Tự tạo thư mục nếu chưa tồn tại.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// Cấu hình nơi lưu file.
const storage = multer.diskStorage({
  destination: (
    req,
    file,
    callback
  ) => {
    callback(null, uploadDirectory);
  },

  filename: (
    req,
    file,
    callback
  ) => {
    const extension =
      path.extname(file.originalname);

    const uniqueName = `${
      Date.now()
    }-${Math.round(
      Math.random() * 1e9
    )}${extension}`;

    callback(null, uniqueName);
  },
});

// Chỉ nhận ảnh.
const fileFilter = (
  req,
  file,
  callback
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (
    allowedTypes.includes(file.mimetype)
  ) {
    callback(null, true);
    return;
  }

  callback(
    new Error(
      "Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WEBP"
    )
  );
};

const upload = multer({
  storage,
  fileFilter,

  // Giới hạn 5 MB.
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;