import axios from "axios";

const BASE_URL = "/auth-service";
const API_CLIENT_NAME = "mapx";

export const getUserProfile = async (userId) => {
  const response = await axios.post(
    `${BASE_URL}/get-user-profile`,
    { userId },
    { headers: { client_name: API_CLIENT_NAME } }
  );
  return response.data.userProfileGetResult.profile;
};

export const updateUserProfile = async (userId, profileData) => {
  // This payload includes the 'id' and filters out any empty fields
  const payload = { id: userId };
  for (const key in profileData) {
    if (profileData[key]) {
      payload[key] = profileData[key];
    }
  }

  const response = await axios.post(
    `${BASE_URL}/update-user-profile`,
    payload,
    { headers: { client_name: API_CLIENT_NAME } }
  );
  return response.data;
};

/**
 * Uploads a new profile photo.
 * @param {string} userId - The ID of the user.
 * @param {string} email - The user's email.
 * @param {File} imageFile - The image file to upload.
 * @returns {Promise<object>} The API response.
 */
export const uploadProfilePhoto = async (userId, email, imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await axios.post(
    `${BASE_URL}/upload-profile-photo?userId=${userId}&email=${email}`,
    formData,
    {
      headers: {
        "client_name": API_CLIENT_NAME,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * Deletes the user's current profile photo.
 * @param {string} userId - The ID of the user.
 * @param {string} email - The user's email.
 * @returns {Promise<object>} The API response.
 */
export const deleteProfilePhoto = async (userId, email) => {
    const response = await axios.delete(
        `${BASE_URL}/delete-profile-picture?userId=${userId}&email=${email}`,
        {
            headers: { client_name: API_CLIENT_NAME },
        }
    );
    return response.data;
};

