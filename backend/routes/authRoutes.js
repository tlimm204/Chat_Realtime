// Import Express.
const express = require("express");

// Import controller đăng ký, đăng nhập và lấy thông tin người dùng.
const { register, login, getProfile } = require("../controllers/authController");

// Import middleware xác thực người dùng.
const authMiddleware = require("../middleware/authMiddleware");

// Tạo router.
const router = express.Router();

// API đăng ký tài khoản.
// POST /api/auth/register
router.post("/register", register);

// API đăng nhập tài khoản.
// POST /api/auth/login
router.post("/login", login);

// API lấy thông tin người dùng đang đăng nhập.
// GET /api/auth/profile
router.get("/profile", authMiddleware, getProfile);

// Xuất router.
module.exports = router;