/**
 * metaData.js
 * API functions for fetching empire metadata
 */

const BASE_URL = import.meta.env.VITE_URL_GEO + "/geo-json-service";

// --- INTERNAL CACHE ---
// Stores the promise of the mapping request so we don't fetch it multiple times
let mappingCachePromise = null;

/**
 * 1. Helper to fetch the EmpireID -> MetadataID mapping
 * Returns a Promise that resolves to the lookup object
 */
async function fetchAndCacheMapping() {
  // Uses the endpoint you provided
  const url = `${BASE_URL}/get-all-empire-metadata-object-ids`;
  
  const res = await fetch(url, { 
    headers: { client_name: "mapdesk" } 
  });

  if (!res.ok) {
    throw new Error(`Mapping fetch failed (${res.status})`);
  }

  const data = await res.json();
  
  if (data?.status !== "success" && !data?.response) {
     // Fallback if status isn't explicitly "success" but response exists
     if (!data?.response) throw new Error("Failed to load metadata mapping");
  }

  // The response IS the map: { "68be...": "6976...", ... }
  return data.response;
}

/**
 * 2. MAIN FUNCTION FOR UI
 * Takes an Empire ID (from the map), finds the Metadata ID, then fetches details.
 * @param {string} empireId - The ID from the map polygon
 */
export async function getMetadataByEmpireId(empireId) {
  // A. Initialize cache if empty
  if (!mappingCachePromise) {
    mappingCachePromise = fetchAndCacheMapping().catch(err => {
      mappingCachePromise = null; // Reset on failure so we can try again
      throw err;
    });
  }

  // B. Wait for mapping to load
  const mapping = await mappingCachePromise;

  // C. Look up the metadata ID
  const metadataId = mapping[empireId];

  if (!metadataId) {
    console.warn(`No metadata ID found for Empire ID: ${empireId}`);
    return null; 
  }

  // D. Fetch the actual data using the metadata ID
  return getMetadataById(metadataId);
}

/**
 * 3. CORE API CALL
 * Fetches the specific metadata details using the Metadata ID
 */
export async function getMetadataById(metadataId) {
  const url = `${BASE_URL}/get_empire_metadata_by_id/${metadataId}`;
  const token = localStorage.getItem('bearerToken');

  const res = await fetch(url, {
    method: "GET",
    headers: {
      client_name: "mapdesk",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${errText}`);
  }

  const data = await res.json();

  if (data?.status !== "success") {
    throw new Error(data?.message || "Failed to fetch empire metadata");
  }

  return data.response.jsonMetadata;
}