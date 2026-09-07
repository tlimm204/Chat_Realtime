# Chat Realtime

Ứng dụng trò chuyện thời gian thực được xây dựng bằng React, Node.js, Express, MongoDB, Socket.IO và WebRTC. Hệ thống hỗ trợ tài khoản, phòng nhóm, chat trực tiếp, tin nhắn chữ, ảnh, tệp, ghi âm, trạng thái online và cuộc gọi thoại hoặc video.

## Yêu cầu cài đặt

- Node.js 20.19 trở lên hoặc 22.12 trở lên
- npm 10 trở lên
- MongoDB 7 trở lên hoặc MongoDB Atlas
- Trình duyệt Chrome hoặc Edge phiên bản mới

## Cấu hình backend

Sao chép `backend/.env.example` thành `backend/.env`, sau đó thay `MONGO_URI` và `JWT_SECRET` bằng giá trị phù hợp:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/realtime_chat
JWT_SECRET=replace_with_a_long_random_secret
```

Không commit tệp `backend/.env` lên GitHub.

## Cài đặt và chạy

Mở Terminal thứ nhất:

```bash
cd backend
npm ci
npm run dev
```

Mở Terminal thứ hai:

```bash
cd frontend
npm ci
npm run dev
```

Truy cập `http://localhost:5173`. Backend mặc định hoạt động tại `http://localhost:5000`.

## Kiểm tra frontend

```bash
cd frontend
npm run lint
npm run build
```
