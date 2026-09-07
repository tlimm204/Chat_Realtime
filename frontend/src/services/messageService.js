import axiosClient from "../api/axiosClient";

// Lấy lịch sử tin nhắn của phòng.
export const getMessages = async (roomId) => {
  const response = await axiosClient.get(`/messages/${roomId}`);

  return response.data;
};

// Upload ảnh và tạo tin nhắn ảnh.
export const uploadMessageImage = async (
  roomId,
  imageFile,
  content = ""
) => {
  const formData = new FormData();

  formData.append("roomId", roomId);
  formData.append("image", imageFile);
  formData.append("content", content.trim());

  console.log(
    "=== UPLOAD IMAGE REQUEST ==="
  );
  console.log(
    "roomId:",
    roomId
  );
  console.log(
    "imageFile:",
    imageFile
  );
  console.log(
    "imageFile.name:",
    imageFile.name
  );
  console.log(
    "imageFile.type:",
    imageFile.type
  );
  console.log(
    "imageFile.size:",
    imageFile.size
  );
  console.log(
    "content:",
    content.trim()
  );

  const response = await axiosClient.post(
    "/messages/upload",
    formData
  );

  console.log(
    "=== UPLOAD IMAGE RESPONSE ==="
  );
  console.log(
    "response:",
    response
  );
  console.log(
    "response.data:",
    response.data
  );

  // Trả trực tiếp dữ liệu backend.
  return response.data;
};

export const uploadMessageAttachment = async (roomId, file) => {
  const formData = new FormData();
  formData.append("roomId", roomId);
  formData.append("file", file);

  const response = await axiosClient.post(
    "/messages/attachment",
    formData
  );

  return response.data;
};

export const revokeMessage = async (messageId) => {
  const response = await axiosClient.delete(
    `/messages/${messageId}/revoke`
  );

  return response.data;
};
