import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = "/project-management-service";
const API_CLIENT_NAME = "mapx";

/**
 * Clones a project for the current user.
 * @param {string} projectId - The ID of the project to clone.
 * @param {string} email - The email of the new owner (the current user).
 * @returns {Promise<string>} The ID of the newly cloned project.
 */
export const cloneProject = async (projectId, email) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/clone-project`,
      { projectId }, // Request body
      {
        params: { email }, // Request parameters
        headers: { client_name: API_CLIENT_NAME },
      }
    );
    toast.success("Project cloned successfully!");
    return response.data.clonedProjectId;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to clone project.");
    throw error;
  }
};