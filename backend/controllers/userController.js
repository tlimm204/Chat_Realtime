const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");

const publicUser = (user) => ({
  id: user._id,
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  avatar: user.avatar,
});

const getMe = async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
  return res.json({ user });
};

const updateProfile = async (req, res) => {
  const fullName = req.body.fullName?.trim();
  if (!fullName || fullName.length < 2 || fullName.length > 60) {
    return res.status(400).json({ message: "Họ tên phải có từ 2 đến 60 ký tự" });
  }
  const user = await User.findByIdAndUpdate(req.userId, { fullName }, { new: true, runValidators: true });
  return res.json({ message: "Cập nhật hồ sơ thành công", user: publicUser(user) });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
  }
  const user = await User.findById(req.userId);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ message: "Đổi mật khẩu thành công" });
};

const uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Vui lòng chọn ảnh đại diện" });
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

  const oldAvatar = user.avatar;
  user.avatar = `/uploads/avatars/${req.file.filename}`;
  await user.save();

  if (oldAvatar?.startsWith("/uploads/avatars/")) {
    fs.promises.unlink(path.join(__dirname, "../uploads/avatars", path.basename(oldAvatar))).catch(() => {});
  }
  return res.json({ message: "Đổi avatar thành công", user: publicUser(user) });
};

module.exports = { getMe, updateProfile, changePassword, uploadAvatar };
