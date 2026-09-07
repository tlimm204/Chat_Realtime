import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  createDirectRoom,
  createRoom,
  deleteRoom as deleteRoomRequest,
  getRooms,
  joinRoom as joinRoomRequest,
  leaveRoom as leaveRoomRequest,
  searchChatTarget,
} from "../../services/roomService";

import {
  getMessages,
  revokeMessage,
  uploadMessageImage,
} from "../../services/messageService";

import { showToast } from "../../components/ToastContainer";
import {
  appendUniqueMessage,
  getRoomDisplayName as resolveRoomDisplayName,
} from "./chatHelpers";
import useSendChat from "./useSendChat";
import useSocket from "./useSocket";
import useUpload from "./useUpload";

// Hook trung tâm quản lý state, useEffect và điều phối toàn bộ chức năng Chat.
function useChat() {
  const navigate = useNavigate();

  // Lấy người dùng hiện tại.
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));

  const currentUserId =
    user?._id || user?.id;

  // Danh sách phòng.
  const [rooms, setRooms] =
    useState([]);

  // Phòng đang chọn.
  const [
    selectedRoom,
    setSelectedRoom,
  ] = useState(null);

  // Danh sách tin nhắn.
  const [
    messages,
    setMessages,
  ] = useState([]);

  // Nội dung đang nhập.
  const [
    messageInput,
    setMessageInput,
  ] = useState("");

  // Trạng thái tải phòng.
  const [loading, setLoading] =
    useState(true);

  // Trạng thái tải tin nhắn.
  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  // Trạng thái gửi chữ.
  const [
    sendingMessage,
    setSendingMessage,
  ] = useState(false);

  // Trạng thái gửi ảnh.
  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  // Lỗi phòng.
  const [error, setError] =
    useState("");

  // Lỗi tin nhắn.
  const [
    messageError,
    setMessageError,
  ] = useState("");

  const socket = useSocket({
    navigate,
    setMessageError,
  });
  const { sendTextMessage } = useSendChat(socket);

  // Danh sách ID đang online.
  const [
    onlineUserIds,
    setOnlineUserIds,
  ] = useState([]);

  // Thông tin người đang nhập.
  const [
    typingUser,
    setTypingUser,
  ] = useState(null);

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [roomIdSearch, setRoomIdSearch] = useState("");
  const [searchedRoom, setSearchedRoom] = useState(null);
  const [roomActionLoading, setRoomActionLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomContext, setRoomContext] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const {
    uploadingAttachment,
    recordingVoice,
    selectedImages,
    imagePreviews,
    imageInputRef,
    handleAttachmentChange,
    handleRemoveImage,
    handleVoiceRecording,
  } = useUpload({
    selectedRoom,
    setMessages,
    setMessageError,
  });

  // LẤY DANH SÁCH PHÒNG

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getRooms();

        const roomList =
          Array.isArray(data)
            ? data
            : data.rooms || [];

        setRooms(roomList);

        if (roomList.length > 0) {
          setSelectedRoom(
            roomList[0]
          );
        }
      } catch (error) {
        console.error(
          "Lỗi tải phòng:",
          error
        );

        setError(
          error.response?.data
            ?.message ||
            "Không thể tải phòng chat"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // THAM GIA PHÒNG

  useEffect(() => {
    if (!selectedRoom?._id) {
      return;
    }

    const roomId =
      selectedRoom._id;

    const memberIds = selectedRoom.members?.map((member) =>
      String(member?._id || member?.id || member)
    ) || [];

    const isMember = memberIds.includes(String(currentUserId));

    const joinRoom = () => {
      if (isMember) {
        socket.emit("joinRoom", roomId);
      }
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    setTypingUser(null);
    setMessageInput("");

    return () => {
      socket.off(
        "connect",
        joinRoom
      );

      socket.emit(
        "stopTyping",
        roomId
      );
    };
  }, [selectedRoom, currentUserId, socket]);

  // LẤY LỊCH SỬ TIN NHẮN

  useEffect(() => {
    const fetchMessages =
      async () => {
        if (!selectedRoom?._id) {
          setMessages([]);
          return;
        }

        const isMember = selectedRoom.members?.some((member) =>
          String(member?._id || member?.id || member) === String(currentUserId)
        );

        if (!isMember) {
          setMessages([]);
          setMessageError("");
          return;
        }

        try {
          setLoadingMessages(true);
          setMessageError("");

          const data =
            await getMessages(
              selectedRoom._id
            );

          const messageList =
            Array.isArray(data)
              ? data
              : data.messages || [];

          setMessages(
            messageList
          );
        } catch (error) {
          console.error(
            "Lỗi tải tin nhắn:",
            error
          );

          setMessageError(
            error.response?.data
              ?.message ||
              "Không thể tải tin nhắn"
          );
        } finally {
          setLoadingMessages(
            false
          );
        }
      };

    fetchMessages();
  }, [selectedRoom, currentUserId]);

  // NHẬN TIN NHẮN REALTIME

  useEffect(() => {
    const handleReceiveMessage = (
      message
    ) => {
      const messageRoomId =
        message.room?._id ||
        message.room;

      if (
        String(messageRoomId) !==
        String(
          selectedRoom?._id
        )
      ) {
        return;
      }

      setMessages(
        (previousMessages) => {
          const existed =
            previousMessages.some(
              (item) =>
                String(item._id) ===
                String(message._id)
            );

          if (existed) {
            return previousMessages;
          }

          return [
            ...previousMessages,
            message,
          ];
        }
      );

      setSendingMessage(false);
      setUploadingImage(false);
    };

    socket.on(
      "receiveMessage",
      handleReceiveMessage
    );

    return () => {
      socket.off(
        "receiveMessage",
        handleReceiveMessage
      );
    };
  }, [selectedRoom, socket]);

  useEffect(() => {
    const handleMessageRevoked = ({ messageId, roomId, revokedAt }) => {
      if (String(roomId) !== String(selectedRoom?._id)) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          String(message._id) === String(messageId)
            ? {
                ...message,
                content: "",
                image: "",
                fileUrl: "",
                fileName: "",
                isRevoked: true,
                revokedAt,
              }
            : message
        )
      );
    };

    socket.on("messageRevoked", handleMessageRevoked);

    return () => {
      socket.off("messageRevoked", handleMessageRevoked);
    };
  }, [selectedRoom, socket]);

  useEffect(() => {
    const handleDirectRoomCreated = (room) => {
      const isMember = room.members?.some(
        (member) => String(member?._id || member) === String(currentUserId)
      );

      if (!isMember) {
        return;
      }

      setRooms((current) => {
        const exists = current.some((item) => item._id === room._id);
        return exists
          ? current.map((item) => item._id === room._id ? room : item)
          : [room, ...current];
      });

      socket.emit("joinRoom", room._id);
    };

    socket.on("directRoomCreated", handleDirectRoomCreated);

    return () => {
      socket.off("directRoomCreated", handleDirectRoomCreated);
    };
  }, [currentUserId, socket]);

  // NHẬN LỖI SOCKET

  useEffect(() => {
    const handleMessageError = (
      data
    ) => {
      setMessageError(
        data?.message ||
          "Không thể gửi tin nhắn"
      );

      setSendingMessage(false);
      setUploadingImage(false);
    };

    socket.on(
      "messageError",
      handleMessageError
    );

    return () => {
      socket.off(
        "messageError",
        handleMessageError
      );
    };
  }, [socket]);

  // ONLINE

  useEffect(() => {
    const handleOnlineUsers = (
      userIds
    ) => {
      setOnlineUserIds(
        Array.isArray(userIds)
          ? userIds.map(String)
          : []
      );
    };

    const handleUserStatus = (
      data
    ) => {
      const userId = String(
        data.userId
      );

      setOnlineUserIds(
        (previousIds) => {
          if (data.isOnline) {
            if (
              previousIds.includes(
                userId
              )
            ) {
              return previousIds;
            }

            return [
              ...previousIds,
              userId,
            ];
          }

          return previousIds.filter(
            (id) => id !== userId
          );
        }
      );
    };

    socket.on(
      "onlineUsers",
      handleOnlineUsers
    );

    socket.on(
      "userStatusChanged",
      handleUserStatus
    );

    return () => {
      socket.off(
        "onlineUsers",
        handleOnlineUsers
      );

      socket.off(
        "userStatusChanged",
        handleUserStatus
      );
    };
  }, [socket]);

  // ĐANG NHẬP

  useEffect(() => {
    const handleRoomDeleted = ({ roomId }) => {
      setRooms((current) => current.filter((room) => String(room._id) !== String(roomId)));
      setSelectedRoom((current) => {
        if (String(current?._id) !== String(roomId)) return current;
        setMessages([]);
        setMessageError("Phòng này đã được chủ phòng xóa");
        return null;
      });
    };

    socket.on("roomDeleted", handleRoomDeleted);
    const handleMembersUpdated = (updatedRoom) => {
      setRooms((current) => current.map((room) => room._id === updatedRoom._id ? updatedRoom : room));
      setSelectedRoom((current) => current?._id === updatedRoom._id ? updatedRoom : current);
    };
    socket.on("roomMembersUpdated", handleMembersUpdated);
    return () => {
      socket.off("roomDeleted", handleRoomDeleted);
      socket.off("roomMembersUpdated", handleMembersUpdated);
    };
  }, [socket]);

  useEffect(() => {
  const handleTyping = (data) => {
    console.log(
      "Nhận typing:",
      data
    );

    if (
      String(data.roomId) !==
      String(selectedRoom?._id)
    ) {
      return;
    }

    if (
      String(data.userId) ===
      String(currentUserId)
    ) {
      return;
    }

    setTypingUser({
      userId: data.userId,
      fullName:
        data.fullName ||
        "Có người",
    });
  };

  const handleStopTyping = (data) => {
    if (
      String(data.roomId) !==
      String(selectedRoom?._id)
    ) {
      return;
    }

    setTypingUser(
      (currentTypingUser) => {
        if (
          String(
            currentTypingUser?.userId
          ) === String(data.userId)
        ) {
          return null;
        }

        return currentTypingUser;
      }
    );
  };

  socket.on(
    "userTyping",
    handleTyping
  );

  socket.on(
    "userStopTyping",
    handleStopTyping
  );

  return () => {
    socket.off(
      "userTyping",
      handleTyping
    );

    socket.off(
      "userStopTyping",
      handleStopTyping
    );
  };
}, [
  selectedRoom?._id,
  currentUserId,
  socket,
]);

  // TỰ CUỘN

  useEffect(() => {
    messagesEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [messages, typingUser]);

  // DỌN URL ẢNH VÀ TIMER

  useEffect(() => {
    return () => {
      if (
        typingTimeoutRef.current
      ) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }
    };
  }, []);

  // NHẬP NỘI DUNG

  const handleMessageInputChange = (
  event
) => {
  const value = event.target.value;

  setMessageInput(value);

  if (
    !selectedRoom?._id ||
    !socket.connected
  ) {
    return;
  }

  const roomId = selectedRoom._id;

  // Người dùng xóa hết nội dung.
  if (!value.trim()) {
    socket.emit("stopTyping", {
      roomId,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    return;
  }

  // Báo đang nhập.
  socket.emit("typing", {
    roomId,
  });

  if (typingTimeoutRef.current) {
    clearTimeout(
      typingTimeoutRef.current
    );
  }

  // Sau 1 giây không gõ sẽ báo dừng.
  typingTimeoutRef.current =
    setTimeout(() => {
      socket.emit("stopTyping", {
        roomId,
      });
    }, 1000);
};

  // CHỌN ẢNH

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setRoomActionLoading(true);
      const result = await createRoom({
        name: newRoomName.trim(),
        description: newRoomDescription.trim(),
      });
      const createdRoom = result.room;
      setRooms((current) => [createdRoom, ...current]);
      setSelectedRoom(createdRoom);
      setNewRoomName("");
      setNewRoomDescription("");
      setShowCreateRoom(false);
      showToast("Tạo phòng thành công");
    } catch (error) {
      setError(error.response?.data?.message || "Không thể tạo phòng");
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleSearchRoom = async (event) => {
    event.preventDefault();
    const searchId = roomIdSearch.trim();
    if (!searchId) {
      setSearchedRoom(null);
      return;
    }

    try {
      setRoomActionLoading(true);
      setError("");
      const result = await searchChatTarget(searchId);

      if (result.type === "user") {
        const directResult = await createDirectRoom(result.user._id);
        const directRoom = directResult.room;

        setRooms((current) => {
          const exists = current.some((room) => room._id === directRoom._id);
          return exists
            ? current.map((room) => room._id === directRoom._id ? directRoom : room)
            : [directRoom, ...current];
        });
        setSearchedRoom(directRoom);
        setSelectedRoom(directRoom);
        socket.emit("joinRoom", directRoom._id);
        showToast(`Đã mở chat với ${result.user.fullName}`);
      } else {
        setSearchedRoom(result.room);
      }
    } catch (error) {
      setSearchedRoom(null);
      setError(error.response?.data?.message || "Không tìm thấy phòng hoặc tài khoản");
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedRoom?._id) return;
    try {
      setRoomActionLoading(true);
      const result = await joinRoomRequest(selectedRoom._id);
      const roomData = result.room;
      const updatedRoom = { ...selectedRoom, members: roomData.members };
      setSelectedRoom(updatedRoom);
      setRooms((current) => current.map((room) =>
        room._id === updatedRoom._id ? updatedRoom : room
      ).some((room) => room._id === updatedRoom._id)
        ? current.map((room) => room._id === updatedRoom._id ? updatedRoom : room)
        : [updatedRoom, ...current]);
      setSearchedRoom(updatedRoom);
      socket.emit("joinRoom", updatedRoom._id);
      showToast("Tham gia phòng thành công");
    } catch (error) {
      setMessageError(error.response?.data?.message || "Không thể tham gia phòng");
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!selectedRoom?._id) return;
    try {
      setRoomActionLoading(true);
      const result = await leaveRoomRequest(selectedRoom._id);
      const updatedRoom = { ...selectedRoom, members: result.room.members };
      setSelectedRoom(updatedRoom);
      setRooms((current) => current.filter((room) => room._id !== updatedRoom._id));
      setSelectedRoom(null);
      setMessages([]);
      setShowMembers(false);
      showToast("Đã rời phòng", "warning");
    } catch (error) {
      setMessageError(error.response?.data?.message || "Không thể rời phòng");
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom?._id || !isSelectedRoomCreator) return;

    try {
      setRoomActionLoading(true);
      await deleteRoomRequest(selectedRoom._id);
      setRooms((current) => current.filter((room) => room._id !== selectedRoom._id));
      setSearchedRoom(null);
      setSelectedRoom(null);
      setMessages([]);
      setShowMembers(false);
      setShowDeleteConfirm(false);
      showToast("Xóa phòng thành công");
    } catch (error) {
      setMessageError(error.response?.data?.message || "Không thể xóa phòng");
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const handleRevokeMessage = async (messageId) => {
    try {
      const result = await revokeMessage(messageId);
      const revokedAt = result?.data?.revokedAt || new Date().toISOString();

      setMessages((current) =>
        current.map((message) =>
          String(message._id) === String(messageId)
            ? {
                ...message,
                content: "",
                image: "",
                fileUrl: "",
                fileName: "",
                isRevoked: true,
                revokedAt,
              }
            : message
        )
      );

      showToast("Đã thu hồi tin nhắn");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Không thể thu hồi tin nhắn",
        "error"
      );
    }
  };

  // GỬI CHỮ HOẶC ẢNH

  const handleSendMessage = async (
  event
) => {
  event.preventDefault();

  const roomId = selectedRoom?._id;
  const content =
    messageInput.trim();

  // Validate roomId
  if (!roomId) {
    setMessageError(
      "Không xác định được phòng chat. Vui lòng chọn phòng."
    );
    return;
  }

  // Validate message
  if (!content && selectedImages.length === 0) {
    return;
  }

  setMessageError("");

  if (socket.connected) {
    socket.emit("stopTyping", {
      roomId,
    });
  }

  if (typingTimeoutRef.current) {
    clearTimeout(
      typingTimeoutRef.current
    );
  }

  // GỬI ẢNH

  if (selectedImages.length > 0) {
    try {
      setUploadingImage(true);
      setMessageError("");

      console.log(
        "=== START IMAGE UPLOAD ==="
      );
      console.log(
        "roomId:",
        roomId
      );
      console.log(
        "selectedRoom._id:",
        selectedRoom?._id
      );
      const uploadedMessages = [];
      for (let index = 0; index < selectedImages.length; index += 1) {
        const result = await uploadMessageImage(
          roomId,
          selectedImages[index],
          index === 0 ? content : ""
        );
        if (!result?.data?._id) {
          throw new Error("Backend không trả về tin nhắn ảnh");
        }
        uploadedMessages.push(result.data);
      }

      setMessages((previousMessages) => {
        const existingIds = new Set(previousMessages.map((message) => String(message._id)));
        return [...previousMessages, ...uploadedMessages.filter((message) => !existingIds.has(String(message._id)))];
      });

      setMessageInput("");
      handleRemoveImage();
      showToast(`Đã gửi ${uploadedMessages.length} ảnh`);
    } catch (error) {
      console.error(
        "Lỗi gửi ảnh:",
        error
      );

      setMessageError(
        error.response?.data?.message ||
          error.message ||
          "Không thể gửi ảnh"
      );
      showToast(error.response?.data?.message || error.message || "Không thể gửi ảnh", "error");
    } finally {
      setUploadingImage(false);
    }

    return;
  }

  // GỬI TIN NHẮN CHỮ

  if (!socket.connected) {
    setMessageError(
      "Socket chưa kết nối. Vui lòng tải lại trang."
    );

    return;
  }

  // Verify room is selected
  if (!roomId) {
    setMessageError(
      "Không xác định được phòng chat"
    );

    return;
  }

  setSendingMessage(true);

  try {
    const newMessage = await sendTextMessage({
      roomId,
      content,
    });

    setMessages((previousMessages) =>
      appendUniqueMessage(previousMessages, newMessage)
    );
    setMessageInput("");
  } catch (error) {
    setMessageError(error.message);
  } finally {
    setSendingMessage(false);
  }
};

  // ĐĂNG XUẤT

  const handleLogout = () => {
    if (selectedRoom?._id) {
      socket.emit(
        "stopTyping",
        selectedRoom._id
      );
    }

    socket.disconnect();

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    navigate("/login");
  };

  // ĐẾM ONLINE

  const onlineMemberCount =
    selectedRoom?.members?.filter(
      (member) => {
        const memberId =
          member?._id ||
          member?.id ||
          member;

        return onlineUserIds.includes(
          String(memberId)
        );
      }
    ).length || 0;

  const isBusy =
    sendingMessage ||
    uploadingImage ||
    uploadingAttachment;

  const selectedMemberIds = selectedRoom?.members?.map((member) =>
    String(member?._id || member?.id || member)
  ) || [];
  const isSelectedRoomMember = selectedMemberIds.includes(String(currentUserId));
  const selectedCreatorId = selectedRoom?.createdBy?._id || selectedRoom?.createdBy;
  const isSelectedRoomCreator = String(selectedCreatorId) === String(currentUserId);
  const normalizedRoomIdSearch = roomIdSearch.trim().toLowerCase();
  const displayedRooms = normalizedRoomIdSearch
    ? (searchedRoom ? [searchedRoom] : [])
    : rooms;
  const groupRoomCount = rooms.filter((room) => !room.isDirect).length;
  const getRoomDisplayName = (room) =>
    resolveRoomDisplayName(room, currentUserId);

  return {
    user,
    currentUserId,
    rooms,
    selectedRoom,
    setSelectedRoom,
    messages,
    messageInput,
    setMessageInput,
    loading,
    loadingMessages,
    sendingMessage,
    uploadingImage,
    uploadingAttachment,
    recordingVoice,
    error,
    setError,
    messageError,
    onlineUserIds,
    typingUser,
    selectedImages,
    imagePreviews,
    showCreateRoom,
    setShowCreateRoom,
    showMembers,
    setShowMembers,
    showEmoji,
    setShowEmoji,
    newRoomName,
    setNewRoomName,
    newRoomDescription,
    setNewRoomDescription,
    roomIdSearch,
    setRoomIdSearch,
    setSearchedRoom,
    roomActionLoading,
    showProfile,
    setShowProfile,
    showDeleteConfirm,
    setShowDeleteConfirm,
    roomContext,
    setRoomContext,
    messagesEndRef,
    imageInputRef,
    handleCreateRoom,
    handleSearchRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleDeleteRoom,
    handleUserUpdated,
    handleRevokeMessage,
    handleAttachmentChange,
    handleRemoveImage,
    handleVoiceRecording,
    handleSendMessage,
    handleMessageInputChange,
    handleLogout,
    onlineMemberCount,
    isBusy,
    isSelectedRoomMember,
    isSelectedRoomCreator,
    displayedRooms,
    groupRoomCount,
    getRoomDisplayName,
  };
}

export default useChat;
