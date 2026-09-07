import { getAvatarUrl } from "../utils/getAvatarUrl";

export default function UserAvatar({ user, size = 42, online = false }) {
  return <span className="user-avatar-wrap" style={{ width: size, height: size }}>
    <img className="user-avatar" src={getAvatarUrl(user?.avatar)} alt={user?.fullName || "Avatar"} />
    {online && <span className="avatar-online" />}
  </span>;
}
