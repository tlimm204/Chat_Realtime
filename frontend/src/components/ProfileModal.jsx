import { useEffect, useState } from "react";
import {
  changeMyPassword,
  updateMyProfile,
  uploadMyAvatar,
} from "../services/userService";
import UserAvatar from "./UserAvatar";
import LoadingSpinner from "./LoadingSpinner";
import { showToast } from "./ToastContainer";

export default function ProfileModal({ open, user, onClose, onUserUpdated }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => setFullName(user?.fullName || ""), [user]);
  if (!open) return null;

  const run = async (operation, successMessage) => {
    try {
      setLoading(true);
      const result = await operation();
      if (result.user) onUserUpdated(result.user);
      showToast(successMessage);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Không thể cập nhật hồ sơ",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="profile-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h2>Hồ sơ cá nhân</h2>

        <p className="profile-account-id">
          Account ID: {user?._id || user?.id}
        </p>

        <div className="profile-avatar-block">
          <UserAvatar user={user} size={88} />

          <label className="avatar-upload-button">
            Đổi avatar
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  run(
                    () => uploadMyAvatar(file),
                    "Đổi avatar thành công"
                  );
                }
              }}
            />
          </label>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => updateMyProfile(fullName),
              "Đổi tên thành công"
            );
          }}
        >
          <label>
            Họ và tên
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input value={user?.email || ""} disabled />
          </label>

          <button className="primary" disabled={loading}>
            {loading
              ? <LoadingSpinner small label="Đang lưu" />
              : "Lưu thông tin"}
          </button>
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => changeMyPassword(currentPassword, newPassword),
              "Đổi mật khẩu thành công"
            ).then(() => {
              setCurrentPassword("");
              setNewPassword("");
            });
          }}
        >
          <h3>Đổi mật khẩu</h3>

          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label>
            Mật khẩu mới
            <input
              type="password"
              minLength="6"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>

          <button className="primary" disabled={loading}>
            Đổi mật khẩu
          </button>
        </form>
      </section>
    </div>
  );
}
