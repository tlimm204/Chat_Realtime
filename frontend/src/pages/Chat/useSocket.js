import { useEffect } from "react";
import socket from "../../socket/socket";
import { showToast } from "../../components/ToastContainer";

// Khởi tạo kết nối realtime bằng token và dọn listener khi rời trang Chat.
export default function useSocket({ navigate, setMessageError }) {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    socket.auth = { token };

    // Xóa lỗi cũ sau khi Socket.IO kết nối thành công.
    const handleConnect = () => {
      setMessageError("");
    };

    // Thông báo lỗi xác thực hoặc lỗi kết nối máy chủ realtime.
    const handleConnectError = (error) => {
      setMessageError(`Không thể kết nối realtime: ${error.message}`);
      showToast("Mất kết nối realtime", "error");
    };

    // Cảnh báo khi mất kết nối ngoài thao tác ngắt chủ động.
    const handleDisconnect = (reason) => {
      if (reason !== "io client disconnect") {
        showToast(
          "Đã ngắt kết nối, hệ thống đang thử kết nối lại",
          "warning"
        );
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, [navigate, setMessageError]);

  return socket;
}
