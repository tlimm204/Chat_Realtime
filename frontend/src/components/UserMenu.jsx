import UserAvatar from "./UserAvatar";

export default function UserMenu({ user, onProfile }) {
  return (
    <button
      type="button"
      className="user-profile-trigger"
      onClick={onProfile}
      title="Mở hồ sơ cá nhân"
    >
      <UserAvatar user={user} size={42} />
      <span className="user-menu-identity">
        <strong>{user?.fullName}</strong>
        <small>ID: {user?._id || user?.id}</small>
      </span>
    </button>
  );
}
