import axios from "axios";
// Best practice: Use an environment variable for the URL.
// Create a .env file in your project's root with: VITE_PM_BASE_PATH=/project-management-service
// Fallback to the Vite proxy path when not provided.
const BASE_URL = import.meta.env.VITE_URL_PROJECT +  "/project-management-service";

const API_CLIENT_NAME = "mapx";

/**
 * Fetches all map shapes for a given project and year.
 * @param {string} projectId - The ID of the project.
 * @param {number} year - The historical year.
 * @param {string} era - The era (e.g., 'CE').
 * @returns {Promise<object>} The response from the backend containing the map shapes.
 */
export async function getAllMapShapes(projectId, year, era) {
  const token = localStorage.getItem('bearerToken');
  if (!projectId || year === undefined || !era) {
    throw new Error("Project ID, year, and era are required to fetch shapes.");
  }
  try {
    const res = await axios.get(`${BASE_URL}/get-all-map-shapes-by-project-id-and-year/${projectId}`, {
      params: { year, era },
      headers: { client_name: API_CLIENT_NAME,"Authorization": `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Creates and saves a new map shape in the database.
 * @param {string} projectId - ID of the project.
 * @param {number} year - Year in the timeline.
 * @param {string} era - Era (e.g., 'CE').
 * @param {string} email - User's email.
 * @param {object} geojson - GeoJSON object of the shape.
 * @returns {Promise<object>} The response from the backend.
 */
export async function createMapShape(projectId, year, era, email, geojson) {
  const token = localStorage.getItem('bearerToken');
  if (!projectId || year === undefined || !era || !email || !geojson) {
    throw new Error("All parameters are required to create a map shape.");
  }
  try {
    const res = await axios.post(
      `${BASE_URL}/create-new-mapShape`,
      {
        projectId,
        email,
        yearInTimeline: { year, era },
        geojson,
      },
      {
        headers: { client_name: API_CLIENT_NAME,"Authorization": `Bearer ${token}` },
      }
    );
    return res.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Updates an existing map shape.
 * @param {string} shapeId - The ID of the shape to update.
 * @param {string} email - The user's email for authorization.
 * @param {object} updateData - The data to update (e.g., { geojson: newGeoJson }).
 * @returns {Promise<object>} The response from the backend.
 */
export async function updateMapShape(shapeId, email, updateData) {
  const token = localStorage.getItem('bearerToken');
  if (!shapeId || !email || !updateData) {
    throw new Error("Shape ID, email, and update data are required.");
  }
  try {
    const res = await axios.patch(
      `${BASE_URL}/update-mapShapes/${shapeId}`,
      updateData,
      {
        params: { email },
        headers: { client_name: API_CLIENT_NAME,"Authorization": `Bearer ${token}` },
      }
    );
    return res.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Deletes a map shape by its ID.
 * @param {string} shapeId - The ID of the shape to delete.
 * @param {string} email - The user's email for authorization.
 * @returns {Promise<object>} The response from the backend.
 */
export async function deleteMapShape(shapeId, email) {
  const token = localStorage.getItem('bearerToken');
  if (!shapeId || !email) {
    throw new Error("Shape ID and email are required to delete a shape.");
  }
  try {
    const res = await axios.delete(`${BASE_URL}/delete-mapShape/${shapeId}`, {
      params: { email },
      headers: { client_name: API_CLIENT_NAME,"Authorization": `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
}