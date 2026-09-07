import defaultAvatar from "../assets/avatar.png";

const API_ORIGIN = "http://localhost:5000";

export const getAvatarUrl = (avatar) => {
  if (!avatar) return defaultAvatar;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return `${API_ORIGIN}${avatar}`;
};
