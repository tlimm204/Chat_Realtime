import axiosClient from "../api/axiosClient";

// Gửi yêu cầu đăng nhập.
export const login = async (email, password) => {
  const response = await axiosClient.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

// Gửi yêu cầu đăng ký.
export const register = async (fullName, email, password) => {
  const response = await axiosClient.post("/auth/register", {
    fullName,
    email,
    password,
  });

  return response.data;
};