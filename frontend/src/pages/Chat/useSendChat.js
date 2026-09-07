import { MESSAGE_TIMEOUT } from "./chatConstants";

// Gửi tin nhắn chữ qua Socket.IO và kiểm soát thời gian chờ phản hồi.
export default function useSendChat(socket) {
  // Trả về Promise để useChat xử lý thành công hoặc lỗi theo một luồng thống nhất.
  const sendTextMessage = ({ roomId, content }) =>
    new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error("Socket chưa kết nối. Vui lòng tải lại trang."));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error("Gửi tin nhắn timeout. Vui lòng thử lại."));
      }, MESSAGE_TIMEOUT);

      socket.emit("sendMessage", { roomId, content }, (response) => {
        clearTimeout(timeoutId);

        if (!response?.success) {
          reject(new Error(response?.message || "Không thể gửi tin nhắn"));
          return;
        }

        resolve(response.data);
      });
    });

  return {
    sendTextMessage,
  };
}
