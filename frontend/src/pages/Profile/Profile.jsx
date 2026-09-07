import { useState } from "react";
import ProfileModal from "../../components/ProfileModal";

export default function Profile() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  return (
    <ProfileModal
      open
      user={user}
      onClose={() => history.back()}
      onUserUpdated={updateUser}
    />
  );
}
