// Địa chỉ backend dùng để hiển thị ảnh và tải tệp tin nhắn.
export const API_URL = "http://localhost:5000";

// Danh sách emoji hiển thị trong bộ chọn nhanh.
export const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "😭",
  "😡",
  "👍",
  "👏",
  "❤️",
  "🎉",
  "🔥",
  "✅",
  "🙏",
  "🤔",
  "😊",
];

// Các giới hạn dùng chung của phòng, tin nhắn, ảnh và voice.
export const MAX_GROUP_ROOMS = 10;
export const MAX_IMAGES_PER_MESSAGE = 5;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MESSAGE_TIMEOUT = 10000;
export const VOICE_RECORDING_LIMIT = 60000;

// Các định dạng ảnh được backend và giao diện chấp nhận.
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
