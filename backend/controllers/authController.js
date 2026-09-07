// Import model User để làm việc với collection users.
const User = require("../models/User");

// Import bcryptjs để mã hóa mật khẩu.
const bcrypt = require("bcryptjs");

// Import jsonwebtoken để tạo token xác thực.
const jwt = require("jsonwebtoken");

// Hàm đăng ký tài khoản.
const register = async (req, res) => {
  try {
    // Lấy dữ liệu người dùng gửi lên.
    const { fullName, email, password } = req.body;

    // Kiểm tra dữ liệu có bị thiếu không.
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu",
      });
    }

    // Kiểm tra email đã tồn tại chưa.
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email đã được sử dụng",
      });
    }

    // Mã hóa mật khẩu.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới.
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    // Trả kết quả về client.
    return res.status(201).json({
      message: "Đăng ký tài khoản thành công",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        avatar: newUser.avatar,
      },
    });
  } catch (error) {
    console.log("Lỗi đăng ký:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi đăng ký tài khoản",
    });
  }
};

// Hàm đăng nhập tài khoản.
const login = async (req, res) => {
  try {
    // Lấy email và password từ request.
    const { email, password } = req.body;

    // Kiểm tra thiếu dữ liệu.
    if (!email || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    // Tìm user theo email.
    const user = await User.findOne({ email });

    // Nếu không tìm thấy user.
    if (!user) {
      return res.status(400).json({
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa.
    const isMatch = await bcrypt.compare(password, user.password);

    // Nếu mật khẩu không đúng.
    if (!isMatch) {
      return res.status(400).json({
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Tạo JWT token.
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Trả kết quả đăng nhập.
    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.log("Lỗi đăng nhập:", error.message);

    return res.status(500).json({
      message: "Lỗi server khi đăng nhập",
    });
  }
};

// Lấy thông tin người dùng đang đăng nhập.
const getProfile = async (req, res) => {
  try {

    // Tìm user theo userId lấy từ middleware.
    const user = await User.findById(req.userId).select("-password");

    // Không tìm thấy user.
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng"
      });
    }

    // Trả thông tin user.
    return res.status(200).json(user);

  } catch (error) {

    console.log(error.message);

    return res.status(500).json({
      message: "Lỗi server"
    });

  }
};

// Xuất hàm register để route sử dụng.
module.exports = {
  register,
  login,
  getProfile
};