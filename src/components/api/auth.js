import axios from "axios";

// const BASE_URL = "/auth-service";
const BASE_URL = import.meta.env.VITE_URL_AUTH + "/auth-service" ;

const API_CLIENT_NAME = "mapx";

export const getUserProfile = async (userId) => {
  const token = localStorage.getItem('bearerToken');
  const response = await axios.post(
    `${BASE_URL}/get-user-profile`,
    { userId },
    { headers: { client_name: API_CLIENT_NAME, "Authorization": `Bearer ${token}` } }
  );
  return response.data.userProfileGetResult.profile;
};

export const updateUserProfile = async (userId, profileData) => {
  const token = localStorage.getItem('bearerToken');
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
    { headers: { client_name: API_CLIENT_NAME }, "Authorization": `Bearer ${token}` }
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
  const token = localStorage.getItem('bearerToken');
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await axios.post(
    `${BASE_URL}/upload-profile-photo?userId=${userId}&email=${email}`,
    formData,
    {
      headers: {
        "client_name": API_CLIENT_NAME,
        "Content-Type": "multipart/form-data", "Authorization": `Bearer ${token}`
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
  const token = localStorage.getItem('bearerToken');
  const response = await axios.delete(
    `${BASE_URL}/delete-profile-picture?userId=${userId}&email=${email}`,
    {
      headers: { client_name: API_CLIENT_NAME, "Authorization": `Bearer ${token}` },
    }
  );
  return response.data;
};


/**
 * Call /get-user-info API
 * @param {string} code - The login code
 * @returns {Promise<object>} - API response
 */
export async function getUserInfo(code) {
  try {
    const response = await axios.post(
      `${BASE_URL}/get-user-info`,
      { code },                  // request body
      {
        headers: {
          "Content-Type": "application/json",
          client_name: API_CLIENT_NAME, // use constant
        },
      }
    );

    return response.data; // success response
  } catch (error) {
    if (error.response) {
      return error.response.data; // backend error
    } else {
      return { status: "failure", message: error.message }; // network or other error
    }
  }
}

export async function getProfilePhoto(email,fileId) {
  const token = localStorage.getItem('bearerToken');
  let response;
  try{
    response = await axios.get(
      BASE_URL+`/fetch-profile-photo/${fileId}`,
      {
        params: { email },
        headers: { client_name: "mapx", "Authorization": `Bearer ${token}` },
        responseType: 'blob'
      }
    );
  }catch(err){
    console.error(err);
    if(err.response.status === 401){
      // return;
      localStorage.removeItem('ownerEmail');
      localStorage.removeItem('userToken');
      localStorage.removeItem('bearerToken');
      window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
    }
  }
  return response;
}