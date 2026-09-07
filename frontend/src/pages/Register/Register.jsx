import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../services/authService";
import "./Register.css";

function Register() {
  // Lưu dữ liệu người dùng nhập.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Lưu thông báo.
  const [message, setMessage] = useState("");

  // Dùng để chuyển trang.
  const navigate = useNavigate();

  // Xử lý khi nhấn nút đăng ký.
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const data = await register(fullName, email, password);

      console.log("Đăng ký thành công:", data);

      setMessage("Đăng ký thành công");

      // Sau 1 giây chuyển sang trang đăng nhập.
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error("Đăng ký thất bại:", error.response?.data);

      setMessage(
        error.response?.data?.message || "Đăng ký thất bại"
      );
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <h1>Tạo tài khoản</h1>
          <p>Đăng ký để tham gia trò chuyện</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Họ và tên</label>

            <input
              id="fullName"
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>

            <input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {message && (
            <p className="register-message">{message}</p>
          )}

          <button type="submit" className="register-button">
            Đăng ký
          </button>
        </form>

        <p className="login-link">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;