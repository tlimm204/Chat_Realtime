// Chuẩn hóa ID từ ObjectId, object đã populate hoặc chuỗi ID.
export const getEntityId = (entity) =>
  entity?._id || entity?.id || entity;

// Kiểm tra hai thời điểm có thuộc cùng một ngày hay không.
export const isSameDay = (firstDate, secondDate) => {
  const first = new Date(firstDate);
  const second = new Date(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

// Định dạng mốc ngày tin nhắn theo tiếng Việt.
export const formatMessageDate = (dateValue) => {
  const formattedDate = new Date(dateValue).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
};

// Thêm tin nhắn mới và ngăn trùng dữ liệu giữa API với Socket.IO.
export const appendUniqueMessage = (messages, newMessage) => {
  if (
    !newMessage?._id ||
    messages.some(
      (message) => String(message._id) === String(newMessage._id)
    )
  ) {
    return messages;
  }

  return [...messages, newMessage];
};

// Với chat 1–1, hiển thị tên người còn lại thay cho tên phòng mặc định.
export const getRoomDisplayName = (room, currentUserId) => {
  if (!room?.isDirect) {
    return room?.name;
  }

  const otherMember = room.members?.find(
    (member) => String(getEntityId(member)) !== String(currentUserId)
  );

  return otherMember?.fullName || "Trò chuyện 1–1";
};
