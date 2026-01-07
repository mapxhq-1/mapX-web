const BASE_URL =`${import.meta.env.VITE_URL_PROJECT}/project-management-service`;

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
 * 1. SEND MESSAGE (Handles both New and Existing Sessions)
 * This replaces the old 'saveChatToBackend', 'createNewChat', and 'updateChatSession'.
 * The backend now handles AI generation and coordinate calculation.
 * * @param {string|null} sessionId - Pass existing sessionId or NULL for a new chat
 * @param {string} message - The user's input text
 * @param {string} grade - e.g., "8th Grade"
 */
export const sendMessage = async (userId, sessionId, message, grade) => {
  let payload;
    payload = {
      userId: userId,
      sessionId,
      grade: grade,
      message: message
    };
// console.log(payload);
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error ${response.status}: ${errorText}`);
    }

    // Returns the full updated chat object (including new history entry & flyToPosition)
    return await response.json(); 
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * 2. GET ALL CHATS
 * Updated to handle response structure: { status: "success", chatData: [...] }
 */
export const fetchAllChats = async (userId) => {
  // Encode userId to handle special characters if necessary
  // Note: Your backend spec uses /get-all-chats/user_001
  
  try {
    const response = await fetch(`${BASE_URL}/get-all-chats/${userId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    
    // Handle specific backend structure
    if (data.chatData && Array.isArray(data.chatData)) {
        return data.chatData;
    }
    return [];
  } catch (error) {
    console.error("Error fetching all chats:", error);
    return [];
  }
};

/**
 * 3. GET SINGLE CHAT FULL HISTORY
 */
export const getChatHistory = async (sessionId) => {
  try {
    const response = await fetch(`${BASE_URL}/get-chat/${sessionId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error(`Server Error ${response.status}`);
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }
};

/**
 * 4. GET CHAT HISTORY (PAGINATED/LIMITED)
 * New function for the 'GetChatsByLimit' endpoint
 */
export const getChatHistoryRange = async (sessionId, limit = 10, start = null, end = null) => {
  try {
    // Build Query Parameters
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit);
    if (start) params.append("start", start);
    if (end) params.append("end", end);

    const response = await fetch(`${BASE_URL}/get-chat-history/${sessionId}?${params.toString()}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error(`Server Error ${response.status}`);
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching chat history range:", error);
    throw error;
  }
};

/**
 * 5. DELETE CHAT
 * Assumed to remain similar, but pointing to the standard backend structure
 */
export const deleteChatSession = async (sessionId) => {
  try {
    const response = await fetch(`${BASE_URL}/delete-chat/${sessionId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    
    if (!response.ok) throw new Error(`Server Error ${response.status}`);
    return await response.json(); // Or simply return true if 204 No Content
  } catch (error) {
    console.error("Error deleting chat:", error);
    throw error;
  }
};