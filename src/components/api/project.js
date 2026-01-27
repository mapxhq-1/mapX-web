import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = import.meta.env.VITE_URL_PROJECT +  "/project-management-service";
const API_CLIENT_NAME = "mapx";
/**
 * Clones a project for the current user.
 * @param {string} projectId - The ID of the project to clone.
 * @param {string} email - The email of the new owner (the current user).
 * @returns {Promise<string>} The ID of the newly cloned project.
 */
export const cloneProject = async (projectId, email) => {
  const token = localStorage.getItem('bearerToken');
  try {
    const response = await axios.post(
      `${BASE_URL}/clone-project`,
      { projectId }, // Request body
      {
        params: { email }, // Request parameters
        headers: { client_name: API_CLIENT_NAME,"Authorization": `Bearer ${token}` },
      }
    );
    toast.success("Project cloned successfully!");
    return response.data.clonedProjectId;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to clone project.");
    throw error;
  }
};

export const saveFeedback = ({ userId, feedback }) => {
  const token = localStorage.getItem('bearerToken');
  return axios.post(
    `${BASE_URL}/save_the_feedback`,
    null, 
    {
      headers: {
        client_name: "mapx", "Authorization": `Bearer ${token}`
      },
      params: {
        userId,
        feedback,
      },
    }
  );
};