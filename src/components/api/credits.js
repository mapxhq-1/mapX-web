// api/credits.js (or wherever you keep your API services)

const BASE_URL = `${import.meta.env.VITE_URL_PROJECT}/project-management-service`;
const API_CLIENT_NAME = "mapx";

const getHeaders = () => {
  const token = localStorage.getItem('bearerToken');
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
    "client_name": API_CLIENT_NAME
  };
};

/**
 * Fetches the user's current quota status, including remaining credits 
 * and whether they can claim today's reward.
 * * @param {string} userId - The user's email/ID (e.g., "bagalkot4234@gmail.com")
 * @returns {Promise<Object>} The quota status data
 */
export const getQuotaStatus = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/quota-status/${userId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    const data = await response.json();
    
    // Backend returns 400 Bad Request if status is "failure"
    if (!response.ok || data.status === 'failure') {
      throw new Error(data.message || 'Failed to fetch quota status');
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching quota status:", error);
    throw error; // Re-throw so the UI can handle it (e.g., show a toast)
  }
};

/**
 * Claims the daily 10 credit reward for the user.
 * * @param {string} userId - The user's email/ID (e.g., "bagalkot4234@gmail.com")
 * @returns {Promise<Object>} The success message and status
 */
export const claimDailyReward = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/claim_daily/${userId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    
    const data = await response.json();
    
    // Backend returns 400 Bad Request if already claimed or failed
    if (!response.ok || data.status === 'failure') {
      throw new Error(data.message || 'Failed to claim daily reward');
    }
    
    return data;
  } catch (error) {
    console.error("Error claiming daily reward:", error);
    throw error; 
  }
};