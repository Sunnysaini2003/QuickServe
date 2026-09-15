import api from "./axios";

// GET USERS

export const getUsers = async () => {
  const response = await api.get("/users");

  return response.data;
};

// CREATE USER

export const createUser = async (userData) => {
  const hasImage = userData.profile_image instanceof File;

  if (hasImage) {
    const formData = new FormData();

    formData.append("name", userData.name);
    formData.append("email", userData.email);
    formData.append("password", userData.password);
    formData.append("phone", userData.phone || "");
    formData.append("role_id", userData.role_id);
    formData.append("profile_image", userData.profile_image);

    const response = await api.post("/users", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }

  // Normal JSON request when no image
  const response = await api.post("/users", userData);

  return response.data;
};

// UPDATE USER

export const updateUser = async (userId, userData) => {
  const hasImage = userData.profile_image instanceof File;

  if (hasImage) {
    const formData = new FormData();

    if (userData.name !== undefined) {
      formData.append("name", userData.name);
    }

    if (userData.email !== undefined) {
      formData.append("email", userData.email);
    }

    if (userData.phone !== undefined) {
      formData.append("phone", userData.phone || "");
    }

    if (userData.role_id !== undefined) {
      formData.append("role_id", userData.role_id);
    }

    if (userData.password) {
      formData.append("password", userData.password);
    }

    formData.append("profile_image", userData.profile_image);

    const response = await api.put(`/users/${userId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }

  // Normal JSON update
  const response = await api.put(`/users/${userId}`, userData);

  return response.data;
};

export const updateUserStatus = async (
    userId,
    isActive
) => {

    const response = await api.put(
        `/users/${userId}/status`,
        {
            is_active: isActive
        }
    );

    return response.data;
};
