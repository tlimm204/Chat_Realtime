// Import Model Message.
const Message = require("../models/Message");

// Import Model Room.
const Room = require("../models/Room");

// Gửi tin nhắn
const sendMessage = async (req, res) => {
    try {

        const { roomId, content } = req.body;

        // Kiểm tra dữ liệu.
        if (!roomId || !content) {
            return res.status(400).json({
                message: "Thiếu roomId hoặc content"
            });
        }

        // Kiểm tra phòng có tồn tại không.
        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                message: "Không tìm thấy phòng chat"
            });
        }

        // Tạo tin nhắn.
        const message = await Message.create({
            sender: req.userId,
            room: roomId,
            content
        });

        return res.status(201).json({
            message: "Gửi tin nhắn thành công",
            data: message
        });

    } catch (error) {

        console.log(error.message);

        return res.status(500).json({
            message: "Lỗi server"
        });

    }
};

// Lấy lịch sử tin nhắn
const getMessages = async (req, res) => {

    try {

        const { roomId } = req.params;

        const messages = await Message.find({
            room: roomId
        })
        .populate({
            path: "sender",
            select: "fullName avatar"
        })
        .sort({ createdAt: 1 });

        return res.status(200).json(messages);

    } catch (error) {

        console.log(error.message);

        return res.status(500).json({
            message: "Lỗi server"
        });

    }

};

// Export
module.exports = {
    sendMessage,
    getMessages
};