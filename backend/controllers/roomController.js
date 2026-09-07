// Import model Room.
const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Tạo phòng chat mới.
const createRoom = async (req, res) => {
  try {
    // Lấy dữ liệu từ request.
    const { name, description } = req.body;

    // Kiểm tra tên phòng.
    if (!name) {
      return res.status(400).json({
        message: "Vui lòng nhập tên phòng",
      });
    }

    const joinedGroupRoomCount = await Room.countDocuments({
      members: req.userId,
      isDirect: { $ne: true },
    });

    if (joinedGroupRoomCount >= 10) {
      return res.status(400).json({
        message: "Mỗi tài khoản chỉ được tham gia tối đa 10 phòng chat",
      });
    }

    // Tạo phòng mới.
    const room = await Room.create({
      name,
      description,
      createdBy: req.userId,

      // Tự động thêm người tạo vào danh sách thành viên.
      members: [req.userId],
    });

    await room.populate("createdBy", "fullName email avatar");
    await room.populate("members", "fullName email avatar");

    return res.status(201).json({
      message: "Tạo phòng chat thành công",
      room,
    });
  } catch (error) {
    console.log("Lỗi tạo phòng:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi tạo phòng",
    });
  }
};

// Lấy danh sách tất cả phòng chat.
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.userId })
      .populate("createdBy", "fullName email avatar")
      .populate("members", "fullName email avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json(rooms);
  } catch (error) {
    console.log("Lỗi lấy danh sách phòng:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách phòng",
    });
  }
};

// Lấy chi tiết một phòng chat.
const getRoomById = async (req, res) => {
  try {
    // Lấy roomId từ URL.
    const { roomId } = req.params;

    // Tìm phòng và lấy thêm thông tin người tạo, thành viên.
    const room = await Room.findById(roomId)
      .populate("createdBy", "fullName email avatar")
      .populate("members", "fullName email avatar isOnline");

    // Không tìm thấy phòng.
    if (!room) {
      return res.status(404).json({
        message: "Không tìm thấy phòng chat",
      });
    }

    // Kiểm tra user hiện tại có trong phòng không.
    const isMember = room.members.some(
      (member) => member._id.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Bạn chưa tham gia phòng này",
      });
    }

    // Trả thông tin phòng.
    return res.status(200).json(room);
  } catch (error) {
    console.log("Lỗi lấy chi tiết phòng:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi lấy chi tiết phòng",
    });
  }
};

// Tham gia phòng chat.
const joinRoom = async (req, res) => {
  try {
    // Lấy roomId từ URL.
    const { roomId } = req.params;

    // Tìm phòng chat.
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Không tìm thấy phòng chat",
      });
    }

    // Kiểm tra người dùng đã ở trong phòng chưa.
    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.userId
    );

    if (isMember) {
      return res.status(200).json({
        message: "Bạn đã ở trong phòng này",
        room,
      });
    }

    if (!room.isDirect) {
      const joinedGroupRoomCount = await Room.countDocuments({
        members: req.userId,
        isDirect: { $ne: true },
      });

      if (joinedGroupRoomCount >= 10) {
        return res.status(400).json({
          message: "Mỗi tài khoản chỉ được tham gia tối đa 10 phòng chat",
        });
      }
    }

    // $addToSet giúp an toàn khi nhiều request tham gia chạy cùng lúc.
    const joinedRoom = await Room.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: req.userId } },
      { new: true }
    );

    await joinedRoom.populate("createdBy", "fullName email avatar");
    await joinedRoom.populate("members", "fullName email avatar");

    const io = req.app.get("io");
    if (io) io.emit("roomMembersUpdated", joinedRoom);

    return res.status(200).json({
      message: "Tham gia phòng thành công",
      room: joinedRoom,
    });
  } catch (error) {
    console.log("Lỗi tham gia phòng:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi tham gia phòng",
    });
  }
};

// Rời khỏi phòng chat.
const leaveRoom = async (req, res) => {
  try {
    // Lấy roomId từ URL.
    const { roomId } = req.params;

    // Tìm phòng chat.
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Không tìm thấy phòng chat",
      });
    }

    // Kiểm tra người dùng có trong phòng không.
    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.userId
    );

    if (!isMember) {
      return res.status(400).json({
        message: "Bạn chưa tham gia phòng này",
      });
    }

    // Không cho người tạo phòng tự rời phòng.
    if (room.createdBy.toString() === req.userId) {
      return res.status(400).json({
        message: "Người tạo phòng không thể rời phòng",
      });
    }

    // Xóa user khỏi danh sách thành viên.
    room.members = room.members.filter(
      (memberId) => memberId.toString() !== req.userId
    );

    // Lưu lại thay đổi.
    await room.save();

    await room.populate("createdBy", "fullName email avatar");
    await room.populate("members", "fullName email avatar");

    const io = req.app.get("io");
    if (io) io.emit("roomMembersUpdated", room);

    return res.status(200).json({
      message: "Rời phòng thành công",
      room,
    });
  } catch (error) {
    console.log("Lỗi rời phòng:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi rời phòng",
    });
  }
};

const findRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Room ID không hợp lệ" });
    }

    const room = await Room.findById(roomId)
      .populate("createdBy", "fullName email avatar")
      .populate("members", "fullName email avatar");

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng chat" });
    }

    return res.status(200).json({ room });
  } catch (error) {
    return res.status(500).json({ message: "Không thể tìm phòng chat" });
  }
};

const searchChatTarget = async (req, res) => {
  try {
    const query = req.params.query?.trim();

    if (!mongoose.Types.ObjectId.isValid(query)) {
      return res.status(400).json({
        message: "ID phòng hoặc ID tài khoản không hợp lệ",
      });
    }

    const room = await Room.findById(query)
      .populate("createdBy", "fullName email avatar")
      .populate("members", "fullName email avatar");

    if (room) {
      if (room.isDirect) {
        const isMember = room.members.some(
          (member) => String(member._id) === String(req.userId)
        );

        if (!isMember) {
          return res.status(404).json({
            message: "Không tìm thấy phòng hoặc tài khoản",
          });
        }
      }

      return res.status(200).json({
        type: "room",
        room,
      });
    }

    const user = await User.findById(query).select("fullName email avatar");

    if (!user || String(user._id) === String(req.userId)) {
      return res.status(404).json({
        message: "Không tìm thấy phòng hoặc tài khoản",
      });
    }

    return res.status(200).json({
      type: "user",
      user,
    });
  } catch (error) {
    console.error("Lỗi tìm phòng hoặc tài khoản:", error);
    return res.status(500).json({
      message: "Không thể tìm phòng hoặc tài khoản",
    });
  }
};

const createDirectRoom = async (req, res) => {
  try {
    const { userId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      String(userId) === String(req.userId)
    ) {
      return res.status(400).json({
        message: "Tài khoản trò chuyện không hợp lệ",
      });
    }

    const otherUser = await User.findById(userId).select("fullName email avatar");

    if (!otherUser) {
      return res.status(404).json({
        message: "Không tìm thấy tài khoản",
      });
    }

    const memberIds = [String(req.userId), String(userId)].sort();
    const directKey = memberIds.join(":");
    let room = await Room.findOne({ directKey });

    if (!room) {
      try {
        room = await Room.create({
          name: "Trò chuyện riêng",
          description: "Cuộc trò chuyện 1–1",
          createdBy: req.userId,
          members: memberIds,
          isDirect: true,
          directKey,
        });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        room = await Room.findOne({ directKey });
      }
    }

    await room.populate("createdBy", "fullName email avatar");
    await room.populate("members", "fullName email avatar");

    const io = req.app.get("io");
    if (io) {
      memberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("directRoomCreated", room);
      });
    }

    return res.status(200).json({
      message: "Đã mở cuộc trò chuyện 1–1",
      room,
    });
  } catch (error) {
    console.error("Lỗi tạo phòng 1–1:", error);
    return res.status(500).json({
      message: "Không thể mở cuộc trò chuyện 1–1",
    });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng chat" });
    }

    if (String(room.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: "Chỉ người tạo phòng mới được xóa phòng" });
    }

    const imageMessages = await Message.find({
      room: roomId,
      image: { $exists: true, $nin: ["", null] },
    }).select("image");

    await Promise.all(imageMessages.map(async (message) => {
      const imagePath = path.join(__dirname, "../uploads", path.basename(message.image));
      try {
        await fs.promises.unlink(imagePath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }));

    const attachmentMessages = await Message.find({
      room: roomId,
      fileUrl: { $exists: true, $nin: ["", null] },
    }).select("fileUrl");

    await Promise.all(attachmentMessages.map(async (message) => {
      const filePath = path.join(
        __dirname,
        "../uploads/attachments",
        path.basename(message.fileUrl)
      );

      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }));

    await Message.deleteMany({ room: roomId });
    await Room.findByIdAndDelete(roomId);

    const io = req.app.get("io");
    if (io) io.to(String(roomId)).emit("roomDeleted", { roomId: String(roomId) });

    return res.status(200).json({ message: "Xóa phòng thành công", roomId });
  } catch (error) {
    console.error("Lỗi xóa phòng:", error);
    return res.status(500).json({ message: "Không thể xóa phòng" });
  }
};

// Xuất các hàm để route sử dụng.
module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  findRoomById,
  searchChatTarget,
  createDirectRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
};
