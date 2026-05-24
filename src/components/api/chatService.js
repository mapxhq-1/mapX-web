import { logger } from '../../components/map/utils/activityLogger';

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
 * 1. SEND MESSAGE (Handles both New and Existing Sessions)
 */
export const sendMessage = async (userId, sessionId, message, grade, lang, know_more) => {
  const payload = {
    userId,
    sessionId,
    message,
    lang,
    ...(grade === -1 ? { knowMore: know_more } : { grade })
  };
    
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Server Error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }

    return await response.json(); 
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * 2. GET ALL CHATS
 */
export const fetchAllChats = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/get-all-chats/${userId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    
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
 * ✅ CONDITIONAL: Routes to /get-chat-history for guests, and /get-chat for logged users.
 */
export const getChatHistory = async (sessionId) => {
  try {
    const isGuest = !localStorage.getItem('bearerToken');
    const endpoint = isGuest ? `/get-chat-history/${sessionId}` : `/get-chat/${sessionId}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
 */
export const getChatHistoryRange = async (sessionId, limit = 10, start = null, end = null) => {
  try {
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
 */
export const deleteChatSession = async (sessionId) => {
  try {
    const response = await fetch(`${BASE_URL}/delete-chat/${sessionId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    
    if (!response.ok) throw new Error(`Server Error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error deleting chat:", error);
    throw error;
  }
};

export const translateToEnglish = async (text, sourceLangCode = "ta-IN") => {
  try {
    const safeSourceCode = sourceLangCode === "auto" ? "ta-IN" : sourceLangCode;

    const response = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client_name": "mapx",
        "api-subscription-key": import.meta.env.VITE_SARVAM_API_KEY
      },
      body: JSON.stringify({
        input: text,
        source_language_code: safeSourceCode,
        target_language_code: "en-IN",
        model: "sarvam-translate:v1",
        mode: "formal"   
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`Sarvam API Error (${response.status}):`, errorData);
      
      // Log the translation failure
      logger.logAction("TRANSLATION_ERROR", "API_UTILITY", {
        service: "Sarvam",
        statusCode: response.status,
        sourceLang: safeSourceCode
      });
      
      return text; 
    }

    const data = await response.json();
    
    // Log the successful translation
    logger.logAction("TRANSLATION_SUCCESS", "API_UTILITY", {
        service: "Sarvam",
        sourceLang: safeSourceCode,
        textLength: text.length
    });

    return data.translated_text || text;

  } catch (error) {
    console.error("Failed to execute translateToEnglish:", error);
    
    // Log network or execution errors
    logger.logAction("TRANSLATION_FAILED", "API_UTILITY", {
      error: error.message
    });
    
    return text;
  }
};


/**
 * 6. TRANSCRIBE AUDIO
 */
export const transcribeAudio = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const headers = getHeaders();
    delete headers["Content-Type"];

    const response = await fetch(`${BASE_URL}/transcribe`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Server Error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        errorMessage = await response.text();
      }
      
      // Log the transcription failure
      logger.logAction("TRANSCRIPTION_ERROR", "API_UTILITY", {
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    // Log the successful transcription
    logger.logAction("TRANSCRIPTION_SUCCESS", "API_UTILITY", {
      fileSize: file.size
    });

    return await response.json();
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

/**
 * 7. GET THINKING TEXT
 */
export const getThinkingText = async (query) => {
  try {
    const params = new URLSearchParams();
    if (query) params.append("query", query);

    const response = await fetch(`${BASE_URL}/think?${params.toString()}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `Server Error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching thinking text:", error);
    throw error;
  }
};
/**
 * 8. OPEN SOURCE PDF
 * Fetches the textbook PDF as a blob and opens it in a new tab.
 */
export const openSourcePdf = async (grade, chapterName, pageRange) => {
  try {
    // 1. Format Grade (converts "6" to "6th" if missing)
    let formattedGrade = String(grade);
    if (formattedGrade && !formattedGrade.includes('th')) {
      formattedGrade += "th";
    }

    // 2. Format Chapter Name with Pages
    let formattedChapter = chapterName;
    if (pageRange && pageRange.includes('-')) {
      const [start, end] = pageRange.split('-');
      formattedChapter = `(${chapterName})_pgs${start.trim()}_pge${end.trim()}`;
    }

    // 3. Construct the exact URL (Removed encodeURIComponent to match Postman behavior)
    const rootUrl = import.meta.env.VITE_URL_PROJECT;
    const url = `${rootUrl}/api/textbook/download?grade=${formattedGrade}&chapterName=${formattedChapter}`;

    // 4. Get headers, but DELETE Content-Type to prevent CORS preflight block on GET requests
    const headers = getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(url, {
      method: "GET",
      headers: headers, // Will still include Authorization and client_name: mapx
    });

    if (!response.ok) {
      let errorMessage = `Server Error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        errorMessage = await response.text();
      }
      
      logger.logAction("PDF_DOWNLOAD_ERROR", "API_UTILITY", {
        grade: formattedGrade,
        chapterName: formattedChapter,
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const fileBlob = await response.blob();
    const pdfBlob = new Blob([fileBlob], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(pdfBlob);
    
    window.open(fileURL, '_blank');

    logger.logAction("PDF_DOWNLOAD_SUCCESS", "API_UTILITY", {
      grade: formattedGrade,
      chapterName: formattedChapter,
      fileSize: pdfBlob.size
    });

    return true;
  } catch (error) {
    console.error("Error fetching source PDF:", error);
    logger.logAction("PDF_DOWNLOAD_FAILED", "API_UTILITY", { error: error.message });
    throw error;
  }
};