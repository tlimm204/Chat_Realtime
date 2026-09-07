// Import Express.
const express = require("express");

// Import controller phòng chat.
const {
  createRoom,
  getRooms,
  getRoomById,
  findRoomById,
  searchChatTarget,
  createDirectRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
} = require("../controllers/roomController");

// Import middleware kiểm tra JWT.
const authMiddleware = require("../middleware/authMiddleware");

// Tạo router.
const router = express.Router();

// Tạo phòng chat mới.
// POST /api/rooms
router.post("/", authMiddleware, createRoom);

// Lấy danh sách phòng chat.
// GET /api/rooms
router.get("/", authMiddleware, getRooms);

// Tìm phòng chưa tham gia bằng Room ID.
router.get("/find/:roomId", authMiddleware, findRoomById);

router.get("/search/:query", authMiddleware, searchChatTarget);

router.post("/direct/:userId", authMiddleware, createDirectRoom);

// Xem chi tiết một phòng chat.
// GET /api/rooms/:roomId
router.get("/:roomId", authMiddleware, getRoomById);

// Tham gia phòng chat.
// POST /api/rooms/:roomId/join
router.post("/:roomId/join", authMiddleware, joinRoom);

// Rời khỏi phòng chat.
// POST /api/rooms/:roomId/leave
router.post("/:roomId/leave", authMiddleware, leaveRoom);

// Chỉ chủ phòng được phép xóa.
router.delete("/:roomId", authMiddleware, deleteRoom);

// Xuất router.
module.exports = router;
