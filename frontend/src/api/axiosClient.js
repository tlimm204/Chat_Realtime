import axios from "axios";

// Tạo Axios dùng chung cho toàn bộ frontend.
const axiosClient = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Chạy trước mỗi lần gửi request.
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token đã lưu sau khi đăng nhập.
    const token = localStorage.getItem("token");

    // Nếu có token thì thêm vào Authorization.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Nếu là FormData, xóa Content-Type để browser tự set multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;