const express = require("express");
const fs = require("fs");
const path = require("path");

const Message = require(
  "../models/Message"
);

const Room = require("../models/Room");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const upload = require(
  "../middleware/uploadMiddleware"
);

const attachmentUpload = require(
  "../middleware/attachmentUpload"
);

const router = express.Router();

router.delete(
  "/:messageId/revoke",
  authMiddleware,
  async (req, res) => {
    try {
      const message = await Message.findById(req.params.messageId);

      if (!message) {
        return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
      }

      if (String(message.sender) !== String(req.userId)) {
        return res.status(403).json({
          message: "Bạn chỉ có thể thu hồi tin nhắn của mình",
        });
      }

      if (message.isRevoked) {
        return res.status(200).json({ message: "Tin nhắn đã được thu hồi" });
      }

      const storedFile = message.image || message.fileUrl;
      if (storedFile?.startsWith("/uploads/")) {
        const relativePath = storedFile.replace(/^\/uploads\//, "");
        const absolutePath = path.join(__dirname, "../uploads", relativePath);
        fs.promises.unlink(absolutePath).catch(() => {});
      }

      message.content = "";
      message.image = "";
      message.fileUrl = "";
      message.fileName = "";
      message.fileSize = 0;
      message.mimeType = "";
      message.isRevoked = true;
      message.revokedAt = new Date();
      await message.save({ validateBeforeSave: false });

      const payload = {
        messageId: String(message._id),
        roomId: String(message.room),
        revokedAt: message.revokedAt,
      };

      const io = req.app.get("io");
      if (io) io.to(String(message.room)).emit("messageRevoked", payload);

      return res.status(200).json({
        message: "Thu hồi tin nhắn thành công",
        data: payload,
      });
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn:", error);
      return res.status(500).json({ message: "Không thể thu hồi tin nhắn" });
    }
  }
);

// LẤY LỊCH SỬ TIN NHẮN
// GET /api/messages/:roomId

router.get(
  "/:roomId",
  authMiddleware,
  async (req, res) => {
    try {
      const { roomId } = req.params;

      const room = await Room.findById(
        roomId
      );

      if (!room) {
        return res.status(404).json({
          message:
            "Không tìm thấy phòng chat",
        });
      }

      // Chỉ thành viên mới xem được tin nhắn.
      const isMember =
        room.members.some(
          (memberId) =>
            String(memberId) ===
            String(req.userId)
        );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Bạn chưa tham gia phòng này",
        });
      }

      const messages =
        await Message.find({
          room: roomId,
        })
          .populate({
            path: "sender",
            select: "fullName avatar",
          })
          .sort({
            createdAt: 1,
          });

      return res.status(200).json({
        messages,
      });
    } catch (error) {
      console.error(
        "Lỗi lấy tin nhắn:",
        error
      );

      return res.status(500).json({
        message:
          "Không thể lấy lịch sử tin nhắn",
      });
    }
  }
);

// GỬI TIN NHẮN CHỮ BẰNG API
// POST /api/messages
// Phần giao diện chính vẫn gửi chữ qua Socket.IO.

router.post(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const { roomId, content } =
        req.body;

      if (!roomId) {
        return res.status(400).json({
          message:
            "Thiếu ID phòng chat",
        });
      }

      if (!content?.trim()) {
        return res.status(400).json({
          message:
            "Nội dung không được để trống",
        });
      }

      const room = await Room.findById(
        roomId
      );

      if (!room) {
        return res.status(404).json({
          message:
            "Không tìm thấy phòng chat",
        });
      }

      const isMember =
        room.members.some(
          (memberId) =>
            String(memberId) ===
            String(req.userId)
        );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Bạn chưa tham gia phòng này",
        });
      }

      const createdMessage =
        await Message.create({
          room: roomId,
          sender: req.userId,
          content: content.trim(),
          image: "",
          messageType: "text",
        });

      const populatedMessage =
        await createdMessage.populate({
          path: "sender",
          select: "fullName avatar",
        });

      // Phát realtime nếu io đã được gắn trong server.js.
      const io = req.app.get("io");

      if (io) {
        io.to(String(roomId)).emit(
          "receiveMessage",
          populatedMessage
        );
      }

      return res.status(201).json({
        message:
          "Gửi tin nhắn thành công",
        data: populatedMessage,
      });
    } catch (error) {
      console.error(
        "Lỗi gửi tin nhắn:",
        error
      );

      return res.status(500).json({
        message:
          "Không thể gửi tin nhắn",
      });
    }
  }
);

// UPLOAD ẢNH VÀ GỬI REALTIME
// POST /api/messages/upload

router.post(
  "/upload",
  authMiddleware,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({
          message: err.message || "Lỗi upload file",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { roomId } = req.body;

      const content =
        req.body.content?.trim() || "";

      console.log(
        "=== UPLOAD IMAGE DEBUG ==="
      );
      console.log(
        "roomId:",
        roomId
      );
      console.log(
        "content:",
        content
      );
      console.log(
        "file:",
        req.file?.filename
      );
      console.log(
        "req.userId:",
        req.userId
      );

      if (!roomId) {
        return res.status(400).json({
          message: "Thiếu ID phòng chat",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Bạn chưa chọn ảnh",
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return res.status(404).json({
          message: "Không tìm thấy phòng chat",
        });
      }

      const currentUserId =
        req.userId ||
        req.user?._id ||
        req.user?.id;

      if (!currentUserId) {
        console.error(
          "Lỗi: Không xác định được người gửi"
        );
        return res.status(401).json({
          message:
            "Không xác định được người gửi",
        });
      }

      const isMember = room.members.some(
        (memberId) =>
          String(memberId) ===
          String(currentUserId)
      );

      if (!isMember) {
        return res.status(403).json({
          message:
            "Bạn chưa tham gia phòng này",
        });
      }

      if (!req.file?.filename) {
        console.error(
          "Lỗi: Tên file không hợp lệ"
        );
        return res.status(400).json({
          message:
            "Tên file ảnh không hợp lệ",
        });
      }

      const imagePath =
        `/uploads/${req.file.filename}`;

      const createdMessage =
        await Message.create({
          room: roomId,
          sender: currentUserId,
          content,
          image: imagePath,
          messageType: "image",
        });

      console.log(
        "Tin nhắn được tạo:",
        createdMessage
      );

      const populatedMessage =
        await createdMessage.populate({
          path: "sender",
          select: "fullName avatar",
        });

      console.log(
        "Tin nhắn sau populate:",
        populatedMessage
      );

      // Phát realtime sang toàn bộ người trong phòng.
      const io = req.app.get("io");

      if (io) {
        io.to(String(roomId)).emit(
          "receiveMessage",
          populatedMessage
        );
      }

      console.log(
        "Đã upload ảnh:",
        populatedMessage._id
      );

      return res.status(201).json({
        message: "Gửi ảnh thành công",
        data: populatedMessage,
      });
    } catch (error) {
      console.error(
        "=== UPLOAD IMAGE ERROR ==="
      );
      console.error(
        "Error:",
        error.message
      );

      return res.status(500).json({
        message:
          error.message ||
          "Không thể gửi ảnh",
      });
    }
  }
);

router.post(
  "/attachment",
  authMiddleware,
  (req, res, next) => {
    attachmentUpload.single("file")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.code === "LIMIT_FILE_SIZE"
            ? "File không được lớn hơn 8 MB"
            : error.message,
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      const { roomId } = req.body;

      if (!roomId || !req.file) {
        return res.status(400).json({
          message: "Thiếu phòng chat hoặc file đính kèm",
        });
      }

      const room = await Room.findById(roomId);
      const isMember = room?.members.some(
        (memberId) => String(memberId) === String(req.userId)
      );

      if (!room) {
        return res.status(404).json({ message: "Không tìm thấy phòng chat" });
      }

      if (!isMember) {
        return res.status(403).json({ message: "Bạn chưa tham gia phòng này" });
      }

      const createdMessage = await Message.create({
        room: roomId,
        sender: req.userId,
        fileUrl: `/uploads/attachments/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      const populatedMessage = await createdMessage.populate({
        path: "sender",
        select: "fullName avatar",
      });

      const io = req.app.get("io");
      if (io) {
        io.to(String(roomId)).emit("receiveMessage", populatedMessage);
      }

      return res.status(201).json({
        message: createdMessage.messageType === "audio"
          ? "Gửi voice thành công"
          : "Gửi file thành công",
        data: populatedMessage,
      });
    } catch (error) {
      console.error("Lỗi gửi file:", error);
      return res.status(500).json({ message: "Không thể gửi file" });
    }
  }
);

module.exports = router;
