import axiosClient from "../api/axiosClient";

export const getMyProfile = async () => {
  return (await axiosClient.get("/users/me")).data;
};

export const updateMyProfile = async (fullName) => {
  return (await axiosClient.put("/users/profile", { fullName })).data;
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  return (
    await axiosClient.put("/users/password", {
      currentPassword,
      newPassword,
    })
  ).data;
};
export const uploadMyAvatar = async (avatar) => {
  const formData = new FormData();
  formData.append("avatar", avatar);
  return (await axiosClient.post("/users/avatar", formData)).data;
};
