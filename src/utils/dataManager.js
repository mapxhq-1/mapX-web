import { getAllEmpires, getEmpireDetailsById } from "../components/api/geoJson";
import { maBinToYear } from "./era";

const DB_NAME = "mapx-cache";
const DB_VERSION = 1;
const STORE_META = "empireMeta";
const STORE_DETAILS = "empireDetails";
const STORE_CENTURY = "centuryBatch";

// In-memory cache
let metadataCache = null;
let metadataCacheTime = 0;
const loadedCenturies = new Map(); // centuryKey -> empireDetails[]
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;

function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_META))
          db.createObjectStore(STORE_META);
        if (!db.objectStoreNames.contains(STORE_DETAILS))
          db.createObjectStore(STORE_DETAILS);
        if (!db.objectStoreNames.contains(STORE_CENTURY))
          db.createObjectStore(STORE_CENTURY);
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

async function mapWithConcurrency(items, limit, mapper) {
  const queue = items.slice();
  const results = [];
  let active = 0;
  let resolveAll;
  const done = new Promise((resolve) => (resolveAll = resolve));

  const startNext = () => {
    if (!queue.length && active === 0) {
      resolveAll();
      return;
    }
    while (active < limit && queue.length) {
      const item = queue.shift();
      active++;
      Promise.resolve()
        .then(() => mapper(item))
        .then((res) => {
          if (res !== undefined) results.push(res);
        })
        .catch(() => {})
        .finally(() => {
          active--;
          startNext();
        });
    }
  };

  startNext();
  await done;
  return results;
}
const RANGE_SIZE = 10; 

function getCenturyKey(year) {
  if (year >= 1) {
    // For positive years (CE)
    const start = Math.floor((year - 1) / RANGE_SIZE) * RANGE_SIZE + 1;
    const end = start + (RANGE_SIZE - 1);
    return `${start}|${end}`;
  } else {
    // For negative years (BCE)
    const start = Math.floor(year / RANGE_SIZE) * RANGE_SIZE;
    const end = start + (RANGE_SIZE - 1);
    return `${start}|${end}`;
  }
}

function parseCenturyKey(key) {
  const [start, end] = key.split("|").map(Number);
  return { start, end };
}

const toInt = (y) => {
  if (!y || typeof y.year === "undefined" || y.year === null) return null;
  const raw = Number(y.year);
  if (!Number.isFinite(raw)) return null;
  const era = String(y.era || "").trim().toUpperCase();
  if (era === "MA") return maBinToYear(raw);
  if (era === "BCE") return -Math.abs(raw);
  return Math.abs(raw);
};

export async function loadAllEmpiresWithDetailsCached(
  currentYear,
  forceRefresh = false,
  dispatch = null
) {
  const now = Date.now();
  const centuryKey = getCenturyKey(currentYear);

  // Check in-memory cache first
  if (!forceRefresh && loadedCenturies.has(centuryKey)) {
    return loadedCenturies.get(centuryKey);
  }

  // Check IndexedDB for this century batch
  const cached = await idbGet(STORE_CENTURY, centuryKey);
  if (
    !forceRefresh &&
    cached &&
    cached.data &&
    now - cached.timestamp < CACHE_EXPIRY_MS
  ) {
    loadedCenturies.set(centuryKey, cached.data);
    return cached.data;
  }

  // Load metadata (once, in memory)
  if (!metadataCache || now - metadataCacheTime > CACHE_EXPIRY_MS || forceRefresh) {
    const cachedMeta = await idbGet(STORE_META, "list");
    if (
      !forceRefresh &&
      cachedMeta &&
      cachedMeta.data &&
      now - cachedMeta.timestamp < CACHE_EXPIRY_MS
    ) {
      metadataCache = cachedMeta.data;
      metadataCacheTime = cachedMeta.timestamp;
    } else {
      metadataCache = await getAllEmpires();
      metadataCacheTime = now;
      idbSet(STORE_META, "list", {
        timestamp: now,
        data: metadataCache,
      }).catch(() => {});
    }
  }

  // Filter empires for this century
  const { start: minYear, end: maxYear } = parseCenturyKey(centuryKey);
  const filteredEmpires = metadataCache.filter((e) => {
    const start = toInt(e.startYear);
    const end = toInt(e.endYear);
    if (start === null || end === null) return false;
    return end >= minYear && start <= maxYear;
  });

  const ids = filteredEmpires.map((e) => e.objectId).filter(Boolean);
  if (ids.length === 0) {
    const emptyResult = [];
    loadedCenturies.set(centuryKey, emptyResult);
    idbSet(STORE_CENTURY, centuryKey, {
      timestamp: now,
      data: emptyResult,
    });
    return emptyResult;
  }

  // Batch fetch all details from IndexedDB
  const db = await openDB();
  const cachedDetails = [];
  const missingIds = [];

  if (db) {
    try {
      const tx = db.transaction(STORE_DETAILS, "readonly");
      const store = tx.objectStore(STORE_DETAILS);
      
      for (const id of ids) {
        const req = store.get(id);
        await new Promise((resolve) => {
          req.onsuccess = () => {
            const cached = req.result;
            if (
              !forceRefresh &&
              cached &&
              cached.data &&
              now - cached.timestamp < CACHE_EXPIRY_MS
            ) {
              cachedDetails.push(cached.data);
            } else {
              missingIds.push(id);
            }
            resolve();
          };
          req.onerror = () => {
            missingIds.push(id);
            resolve();
          };
        });
      }
    } catch {
      missingIds.push(...ids);
    }
  } else {
    missingIds.push(...ids);
  }

  // Fetch missing details
  let fetchedDetails = [];
  if (missingIds.length > 0) {
    if (dispatch) dispatch({ type: "map/setLoading", payload: true });

    fetchedDetails = await mapWithConcurrency(missingIds, 10, async (id) => {
      const detail = await getEmpireDetailsById(id);
      if (detail) {
        idbSet(STORE_DETAILS, id, {
          timestamp: now,
          data: detail,
        }).catch(() => {});
      }
      return detail;
    });

    if (dispatch) dispatch({ type: "map/setLoading", payload: false });
  }

  const allDetails = [...cachedDetails, ...fetchedDetails].filter(Boolean);

  // Cache entire century batch
  loadedCenturies.set(centuryKey, allDetails);
  idbSet(STORE_CENTURY, centuryKey, {
    timestamp: now,
    data: allDetails,
  }).catch(() => {});

  return allDetails;
}

export function resetLoadedCenturies() {
  loadedCenturies.clear();
  metadataCache = null;
  metadataCacheTime = 0;
}
