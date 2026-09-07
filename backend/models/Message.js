const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Phòng chứa tin nhắn.
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    // Người gửi.
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Nội dung chữ, không bắt buộc nếu chỉ gửi ảnh.
    content: {
      type: String,
      trim: true,
      default: "",
    },

    // Đường dẫn ảnh trên server.
    image: {
      type: String,
      default: "",
    },

    fileUrl: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    mimeType: {
      type: String,
      default: "",
    },

    isRevoked: {
      type: Boolean,
      default: false,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    // Loại tin nhắn.
    messageType: {
      type: String,
      enum: ["text", "image", "audio", "file"],
      default: "text",
    },
  },
  {
    timestamps: true,
  }
);

// Tin nhắn phải có chữ hoặc ảnh.
messageSchema.pre("validate", function () {
  const hasContent =
    typeof this.content === "string" &&
    this.content.trim() !== "";

  const hasImage =
    typeof this.image === "string" &&
    this.image.trim() !== "";

  const hasFile =
    typeof this.fileUrl === "string" &&
    this.fileUrl.trim() !== "";

  if (!hasContent && !hasImage && !hasFile) {
    throw new Error(
      "Tin nhắn phải có nội dung hoặc hình ảnh"
    );
  }

  if (hasImage) {
    this.messageType = "image";
  } else if (hasFile) {
    this.messageType = this.mimeType.startsWith("audio/") ? "audio" : "file";
  } else {
    this.messageType = "text";
  }

});

module.exports = mongoose.model(
  "Message",
  messageSchema
);
