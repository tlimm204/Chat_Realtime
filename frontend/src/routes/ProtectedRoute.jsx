import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  // Lấy token đã lưu khi đăng nhập.
  const token = localStorage.getItem("token");

  // Nếu chưa có token thì quay về trang đăng nhập.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có token thì cho phép mở trang bên trong.
  return children;
}

export default ProtectedRoute;