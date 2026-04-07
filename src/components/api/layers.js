import axios from "axios";
const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/layers";
const API_CLIENT_NAME = "mapx";
/**
 * Fetches the total likes and user's like status for a layer.
 * @param {string} layerId - The ID of the layer.
 * @param {string} userId - (Optional) The user's email to check if they liked it.
 */
export async function getLayerLikes(layerId, userId) {
  const token = localStorage.getItem('bearerToken');
  try {
    const res = await axios.get(`${BASE_URL}/${layerId}/likes`, {
      params: userId ? { userId } : {},
      headers: { 
        client_name: API_CLIENT_NAME,
        "Authorization": `Bearer ${token}` 
      },
    });
    return res.data;
  } catch (err) {
    console.error("❌ Failed to fetch layer likes:", err);
    throw err;
  }
}

/**
 * Toggles the like status for a layer for a specific user.
 * @param {string} layerId - The ID of the layer.
 * @param {string} userId - The user's email.
 */
export async function toggleLayerLike(layerId, userId) {
  const token = localStorage.getItem('bearerToken');
  if (!layerId || !userId) {
    throw new Error("Layer ID and User ID are required to toggle a like.");
  }
  
  try {
    // POST request with query params and empty body, as expected by Spring Boot
    const res = await axios.post(`${BASE_URL}/${layerId}/toggle-like`, null, {
      params: { userId },
      headers: { 
        client_name: API_CLIENT_NAME,
        "Authorization": `Bearer ${token}` 
      },
    });
    return res.data;
  } catch (err) {
    console.error("❌ Failed to toggle layer like:", err);
    throw err;
  }
}
