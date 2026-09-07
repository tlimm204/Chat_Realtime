require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");

const roomRoutes = require("./routes/roomRoutes");

const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

const Message = require("./models/Message");

const Room = require("./models/Room");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Cổng ${process.env.PORT || 5000} đang được một server khác sử dụng. ` +
        "Hãy tắt server cũ trước khi chạy lại."
    );
    process.exit(1);
  }

  throw error;
});

// EXPRESS MIDDLEWARE

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// Cho phép frontend mở ảnh từ thư mục uploads.
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// SOCKET.IO

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Cho phép route sử dụng Socket.IO.
app.set("io", io);

// Lưu số kết nối của mỗi tài khoản.
// Một tài khoản có thể mở nhiều tab.
const connectedUsers = new Map();

// Trả về danh sách user đang online.
const getOnlineUserIds = () => {
  return Array.from(
    connectedUsers.keys()
  );
};

// XÁC THỰC SOCKET BẰNG JWT

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error(
          "Không tìm thấy token"
        )
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id;

    if (!userId) {
      return next(
        new Error(
          "Token không chứa userId"
        )
      );
    }

    const user = await User.findById(
      userId
    ).select("fullName avatar");

    if (!user) {
      return next(
        new Error(
          "Không tìm thấy người dùng"
        )
      );
    }

    socket.userId = String(user._id);
    socket.user = user;

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error.message
    );

    next(
      new Error(
        "Token không hợp lệ hoặc đã hết hạn"
      )
    );
  }
});

// SOCKET EVENTS

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);

  console.log(
    "Socket kết nối:",
    socket.id,
    socket.userId
  );

  // Tăng số kết nối của tài khoản.
  const currentConnectionCount =
    connectedUsers.get(socket.userId) ||
    0;

  connectedUsers.set(
    socket.userId,
    currentConnectionCount + 1
  );

  // Phát danh sách đang online.
  io.emit(
    "onlineUsers",
    getOnlineUserIds()
  );

  // Thông báo tài khoản vừa online.
  io.emit("userStatusChanged", {
    userId: socket.userId,
    isOnline: true,
  });

  // THAM GIA PHÒNG

  socket.on(
    "joinRoom",
    async (roomId) => {
      try {
        if (!roomId) {
          return;
        }

        const room =
          await Room.findById(roomId);

        if (!room) {
          socket.emit(
            "messageError",
            {
              message:
                "Không tìm thấy phòng chat",
            }
          );

          return;
        }

        const isMember =
          room.members.some(
            (memberId) =>
              String(memberId) ===
              String(socket.userId)
          );

        if (!isMember) {
          socket.emit(
            "messageError",
            {
              message:
                "Bạn chưa tham gia phòng này",
            }
          );

          return;
        }

        socket.join(String(roomId));

        console.log(
          `${socket.user.fullName} tham gia phòng ${roomId}`
        );
      } catch (error) {
        console.error(
          "Lỗi tham gia phòng:",
          error
        );
      }
    }
  );

  // GỬI TIN NHẮN CHỮ

  socket.on(
  "sendMessage",
  async (data, callback) => {
    try {
      const roomId = data?.roomId;
      const content =
        data?.content?.trim();

      if (!roomId || !content) {
        const result = {
          success: false,
          message:
            "Tin nhắn không hợp lệ",
        };

        socket.emit(
          "messageError",
          result
        );

        if (callback) {
          callback(result);
        }

        return;
      }

      const room =
        await Room.findById(roomId);

      if (!room) {
        const result = {
          success: false,
          message:
            "Không tìm thấy phòng chat",
        };

        if (callback) {
          callback(result);
        }

        return;
      }

      const isMember = room.members.some(
        (memberId) =>
          String(memberId) ===
          String(socket.userId)
      );

      if (!isMember) {
        const result = {
          success: false,
          message:
            "Bạn chưa tham gia phòng này",
        };

        if (callback) {
          callback(result);
        }

        return;
      }

      const createdMessage =
        await Message.create({
          room: roomId,
          sender: socket.userId,
          content,
          image: "",
          messageType: "text",
        });

      const populatedMessage =
        await createdMessage.populate({
          path: "sender",
          select: "fullName avatar",
        });

      // Gửi cho toàn bộ người trong phòng.
      io.to(String(roomId)).emit(
        "receiveMessage",
        populatedMessage
      );

      // Trả kết quả trực tiếp về người gửi.
      if (callback) {
        callback({
          success: true,
          data: populatedMessage,
        });
      }

      console.log(
        "Đã gửi tin nhắn:",
        populatedMessage._id
      );
    } catch (error) {
      console.error(
        "Lỗi gửi tin nhắn:",
        error
      );

      const result = {
        success: false,
        message:
          "Không thể gửi tin nhắn",
      };

      socket.emit(
        "messageError",
        result
      );

      if (callback) {
        callback(result);
      }
    }
  }
);

  // ĐANG NHẬP

  socket.on("typing", (data) => {
  const roomId =
    data?.roomId || data;

  if (!roomId) {
    return;
  }

  socket
    .to(String(roomId))
    .emit("userTyping", {
      roomId: String(roomId),
      userId: socket.userId,
      fullName:
        socket.user?.fullName ||
        "Có người",
    });
});

socket.on("stopTyping", (data) => {
  const roomId =
    data?.roomId || data;

  if (!roomId) {
    return;
  }

  socket
    .to(String(roomId))
    .emit("userStopTyping", {
      roomId: String(roomId),
      userId: socket.userId,
    });
});

  socket.on("startCall", async ({ roomId, callerName, callType } = {}) => {
    try {
      if (!roomId) {
        socket.emit("callError", { message: "Không xác định được phòng gọi" });
        return;
      }

      const room = await Room.findById(roomId).select("members");
      const isMember = room?.members.some(
        (memberId) => String(memberId) === String(socket.userId)
      );

      if (!room || !isMember || !socket.rooms.has(String(roomId))) {
        socket.emit("callError", {
          message: "Bạn chưa tham gia hoặc chưa kết nối vào phòng này",
        });
        return;
      }

      socket.to(String(roomId)).emit("incomingCall", {
        roomId: String(roomId),
        callerId: socket.id,
        callerName: callerName || socket.user?.fullName || "Thành viên",
        callType: callType === "video" ? "video" : "voice",
      });
    } catch (error) {
      console.error("Start call error:", error);
      socket.emit("callError", { message: "Không thể bắt đầu cuộc gọi" });
    }
  });

  socket.on("acceptCall", ({ callerId, roomId }) => {
    if (!callerId) return;
    io.to(callerId).emit("callAccepted", { peerId: socket.id, roomId });
  });

  socket.on("webrtcOffer", ({ targetId, offer }) => {
    if (targetId) io.to(targetId).emit("webrtcOffer", { peerId: socket.id, offer });
  });

  socket.on("webrtcAnswer", ({ targetId, answer }) => {
    if (targetId) io.to(targetId).emit("webrtcAnswer", { peerId: socket.id, answer });
  });

  socket.on("iceCandidate", ({ targetId, candidate }) => {
    if (targetId) io.to(targetId).emit("iceCandidate", { peerId: socket.id, candidate });
  });

  socket.on("endCall", ({ roomId }) => {
    if (roomId) socket.to(String(roomId)).emit("callEnded");
  });

  // NGẮT KẾT NỐI

  socket.on("disconnect", () => {
    console.log(
      "Socket ngắt kết nối:",
      socket.id,
      socket.userId
    );

    const count =
      connectedUsers.get(
        socket.userId
      ) || 0;

    if (count <= 1) {
      connectedUsers.delete(
        socket.userId
      );

      io.emit(
        "userStatusChanged",
        {
          userId: socket.userId,
          isOnline: false,
        }
      );
    } else {
      connectedUsers.set(
        socket.userId,
        count - 1
      );
    }

    io.emit(
      "onlineUsers",
      getOnlineUserIds()
    );
  });
});

// API ROUTES

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/rooms",
  roomRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message:
      "Realtime Chat API đang hoạt động",
  });
});

app.use(
  (error, req, res, next) => {
    console.error(
      "Express error:",
      error
    );

    if (
      error.name === "MulterError"
    ) {
      return res.status(400).json({
        message:
          error.code ===
          "LIMIT_FILE_SIZE"
            ? "Ảnh không được lớn hơn 5 MB"
            : error.message,
      });
    }

    return res.status(500).json({
      message:
        error.message ||
        "Đã xảy ra lỗi máy chủ",
    });
  }
);

// KẾT NỐI MONGODB VÀ CHẠY SERVER

const PORT =
  process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "Đã kết nối MongoDB"
    );

    server.listen(PORT, () => {
      console.log(
        `Server đang chạy tại http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Không thể khởi động server:",
      error
    );

    process.exit(1);
  }
};

startServer();
