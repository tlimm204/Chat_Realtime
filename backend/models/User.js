// Import mongoose để tạo Model.
const mongoose = require("mongoose");

// Tạo cấu trúc dữ liệu của User.
const userSchema = new mongoose.Schema(
{
    // Họ và tên.
    fullName: {
        type: String,
        required: true
    },

    // Email đăng nhập.
    email: {
        type: String,
        required: true,
        unique: true
    },

    // Mật khẩu đã mã hóa.
    password: {
        type: String,
        required: true
    },

    // Ảnh đại diện.
    avatar: {
        type: String,
        default: ""
    },

    // Trạng thái Online.
    isOnline: {
        type: Boolean,
        default: false
    }
},
{
    // Tự tạo createdAt và updatedAt.
    timestamps: true
}
);

// Xuất Model.
module.exports = mongoose.model("User", userSchema);