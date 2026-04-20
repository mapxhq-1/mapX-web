import { getEmpiresByYear } from "../components/api/geoJson"; 

const DB_NAME = "mapx-cache";
const DB_VERSION = 2; 
const STORE_YEARLY = "yearlyPolygons";

// FETCH 20 YEARS at a time for fast scrubbing
const CHUNK_SIZE = 20; 
// But only download 5 simultaneously to prevent browser network freezing
const MAX_CONCURRENT_REQUESTS = 5; 

// In-memory caching & deduplication
let loadedYears = new Map(); 
const activeChunkFetches = new Map(); 
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;

function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_YEARLY)) {
          db.createObjectStore(STORE_YEARLY);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(storeName, key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(storeName, key, value) {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function getChunkRange(year) {
  const start = Math.floor(year / CHUNK_SIZE) * CHUNK_SIZE;
  const end = start + (CHUNK_SIZE - 1);
  return { start, end, key: `${start}_${end}` };
}

/**
 * Fetches the requested year instantly, and safely batches the rest of the 20-year chunk in the background.
 */
export async function loadEmpiresByYearCached(
  currentYear,
  forceRefresh = false,
  dispatch = null
) {
  const yearKey = String(currentYear);
  const now = Date.now();
  let requestedData = null;

  // ==========================================
  // 1. INSTANT CACHE CHECK FOR TARGET YEAR
  // ==========================================
  if (!forceRefresh) {
    if (loadedYears.has(yearKey)) {
      requestedData = loadedYears.get(yearKey);
    } else {
      const cached = await idbGet(STORE_YEARLY, yearKey);
      if (cached && cached.data && now - cached.timestamp < CACHE_EXPIRY_MS) {
        requestedData = cached.data;
        loadedYears.set(yearKey, requestedData);
      }
    }
  }

  // ==========================================
  // 2. BACKGROUND CHUNK PREFETCHING (SAFE BATCHED)
  // ==========================================
  const { start, end, key: chunkKey } = getChunkRange(currentYear);

  const fetchChunkInBackground = async () => {
    if (activeChunkFetches.has(chunkKey)) return activeChunkFetches.get(chunkKey);

    const missingYears = [];
    
    // Find what is missing from the 20-year block
    for (let y = start; y <= end; y++) {
      const yKey = String(y);
      if (loadedYears.has(yKey)) continue;

      const cached = await idbGet(STORE_YEARLY, yKey);
      if (cached && cached.data && now - cached.timestamp < CACHE_EXPIRY_MS) {
        loadedYears.set(yKey, cached.data);
      } else {
        missingYears.push(y);
      }
    }

    if (missingYears.length === 0) return;

    // Fetch missing years safely in groups of 5
    const fetchPromise = (async () => {
      try {
        for (let i = 0; i < missingYears.length; i += MAX_CONCURRENT_REQUESTS) {
          const batch = missingYears.slice(i, i + MAX_CONCURRENT_REQUESTS);
          
          await Promise.all(batch.map(async (y) => {
            const data = await getEmpiresByYear(y);
            loadedYears.set(String(y), data);
            await idbSet(STORE_YEARLY, String(y), { timestamp: now, data }).catch(() => {});
          }));
        }
      } catch (error) {
        console.error(`Failed to prefetch chunk ${chunkKey}:`, error);
      }
    })();

    activeChunkFetches.set(chunkKey, fetchPromise);
    await fetchPromise;
    activeChunkFetches.delete(chunkKey);
  };

  // ==========================================
  // 3. DECISION ROUTING
  // ==========================================

  // If the target year is ready, return it instantly and fetch neighbors silently!
  if (requestedData) {
    fetchChunkInBackground(); // No await!
    return requestedData;
  }

  // If the target year is missing, fetch the requested year FIRST to unblock the UI instantly.
  if (dispatch) dispatch({ type: "map/setLoading", payload: true });
  
  try {
    // Force the requested year to fetch immediately so the user doesn't wait
    const freshData = await getEmpiresByYear(currentYear);
    loadedYears.set(yearKey, freshData);
    await idbSet(STORE_YEARLY, yearKey, { timestamp: now, data: freshData });
    
    // Once the UI has its data, kick off the rest of the chunk quietly
    fetchChunkInBackground(); // No await!
    
    return freshData;
  } catch (error) {
    throw error;
  } finally {
    if (dispatch) dispatch({ type: "map/setLoading", payload: false });
  }
}

export function resetYearlyCache() {
  loadedYears.clear();
  activeChunkFetches.clear();
}