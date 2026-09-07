// Import mongoose.
const mongoose = require("mongoose");

// Tạo cấu trúc dữ liệu cho phòng chat.
const roomSchema = new mongoose.Schema(
  {
    // Tên phòng chat.
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Mô tả ngắn của phòng.
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Người tạo phòng.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Danh sách thành viên trong phòng.
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isDirect: {
      type: Boolean,
      default: false,
    },

    directKey: {
      type: String,
      default: null,
    },
  },
  {
    // Tự tạo createdAt và updatedAt.
    timestamps: true,
  }
);

roomSchema.index(
  { directKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDirect: true,
      directKey: { $type: "string" },
    },
  }
);

// Xuất model Room.
module.exports = mongoose.model("Room", roomSchema);
