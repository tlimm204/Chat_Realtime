import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../services/authService";
import "./Login.css";
import { showToast } from "../../components/ToastContainer";

function Login() {
  // Lưu dữ liệu người dùng nhập vào form.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Dùng để chuyển trang sau khi đăng nhập thành công.
const navigate = useNavigate();

  // Xử lý khi người dùng nhấn nút đăng nhập.
  const handleSubmit = async (event) => {
  event.preventDefault();

  try {
    const data = await login(email, password);

    // Lưu token để dùng cho các API cần đăng nhập.
    localStorage.setItem("token", data.token);

    // Lưu thông tin người dùng.
    localStorage.setItem("user", JSON.stringify(data.user));
    showToast("Đăng nhập thành công");

    console.log("Đăng nhập thành công:", data);

    // Chuyển sang trang Chat.
    navigate("/chat");
  } catch (error) {
    console.error("Đăng nhập thất bại:", error.response?.data);
  }
};

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Chat Realtime</h1>
          <p>Đăng nhập để bắt đầu trò chuyện</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Nhập email của bạn"
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

          <button type="submit" className="login-button">
            Đăng nhập
          </button>
        </form>

        <p className="register-link">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
