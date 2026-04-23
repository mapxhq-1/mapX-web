import { getEmpiresByYear } from "../components/api/geoJson"; 

const DB_NAME = "mapx-cache";
const DB_VERSION = 2; 
const STORE_YEARLY = "yearlyPolygons";

// FETCH 20 YEARS at a time for fast scrubbing
const CHUNK_SIZE = 20; 
// But only download 5 simultaneously to prevent browser network freezing
const MAX_CONCURRENT_REQUESTS = 5; 
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 1 week

// In-memory caching & deduplication
let loadedYears = new Map(); 
const activeChunkFetches = new Map(); 

// Trackers for the "Kill Switch" and stale data rejection
let latestRequestedYear = null; 
let activeMainController = null;

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

export async function loadEmpiresByYearCached(
  currentYear,
  forceRefresh = false,
  dispatch = null
) {
  // 1. Update global tracker to the absolute newest requested year
  latestRequestedYear = currentYear;
  
  // 2. Kill Switch: Abort any currently pending main network request
  if (activeMainController) {
    activeMainController.abort();
  }
  activeMainController = new AbortController();
  const signal = activeMainController.signal;

  const yearKey = String(currentYear);
  const now = Date.now();
  let requestedData = null;

  // ==========================================
  // 3. INSTANT CACHE CHECK FOR TARGET YEAR
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
  // 4. BACKGROUND CHUNK PREFETCHING 
  // ==========================================
  const { start, end, key: chunkKey } = getChunkRange(currentYear);

  const fetchChunkInBackground = async () => {
    if (activeChunkFetches.has(chunkKey)) return activeChunkFetches.get(chunkKey);

    const missingYears = [];
    
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

    const fetchPromise = (async () => {
      try {
        for (let i = 0; i < missingYears.length; i += MAX_CONCURRENT_REQUESTS) {
          const batch = missingYears.slice(i, i + MAX_CONCURRENT_REQUESTS);
          
          await Promise.all(batch.map(async (y) => {
            // Background tasks don't use the kill switch signal so they finish quietly
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
  // 5. DECISION ROUTING
  // ==========================================

  // If we already have it locally, return immediately and fetch neighbors silently!
  if (requestedData) {
    fetchChunkInBackground(); // No await
    return requestedData;
  }

  // If we don't have it, trigger the loading state on the UI
  if (dispatch) dispatch({ type: "map/setLoading", payload: true });
  
  try {
    // Pass the kill switch signal to your API!
    const freshData = await getEmpiresByYear(currentYear, { signal });
    
    // 🚨 STALE DATA CHECK: 
    // If the user kept dragging while the API was thinking, DO NOT RETURN THIS DATA.
    if (latestRequestedYear !== currentYear) {
       return null; // mapSlice will safely ignore this!
    }

    loadedYears.set(yearKey, freshData);
    await idbSet(STORE_YEARLY, yearKey, { timestamp: now, data: freshData });
    
    fetchChunkInBackground(); // No await
    
    return freshData;
  } catch (error) {
    // Gracefully handle the intentional abortion so the console doesn't bleed red
    // Axios throws 'CanceledError', standard fetch throws 'AbortError'
    if (error.name === 'AbortError' || error.name === 'CanceledError' || error.message?.includes('canceled')) {
      return null; // mapSlice will safely ignore this
    }
    console.error(`Failed to load year ${currentYear}:`, error);
    throw error;
  } finally {
    // Only turn off the loading spinner if we are still on the exact year that turned it on
    if (latestRequestedYear === currentYear && dispatch) {
      dispatch({ type: "map/setLoading", payload: false });
    }
  }
}

export function resetYearlyCache() {
  loadedYears.clear();
  activeChunkFetches.clear();
}