import axiosClient from "../api/axiosClient";

// Lấy danh sách phòng chat.
export const getRooms = async () => {
  const response = await axiosClient.get("/rooms");

  return response.data;
};

// Bảo đảm tài khoản hiện tại là thành viên trước khi mở phòng.
export const joinRoom = async (roomId) => {
  const response = await axiosClient.post(
    `/rooms/${roomId}/join`
  );

  return response.data;
};

export const createRoom = async (roomData) => {
  const response = await axiosClient.post("/rooms", roomData);
  return response.data;
};

export const leaveRoom = async (roomId) => {
  const response = await axiosClient.post(`/rooms/${roomId}/leave`);
  return response.data;
};

export const findRoomById = async (roomId) => {
  const response = await axiosClient.get(`/rooms/find/${roomId}`);
  return response.data;
};

export const searchChatTarget = async (query) => {
  const response = await axiosClient.get(`/rooms/search/${query}`);
  return response.data;
};

export const createDirectRoom = async (userId) => {
  const response = await axiosClient.post(`/rooms/direct/${userId}`);
  return response.data;
};

export const deleteRoom = async (roomId) => {
  const response = await axiosClient.delete(`/rooms/${roomId}`);
  return response.data;
};
