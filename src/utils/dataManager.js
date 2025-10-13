// Lightweight IndexedDB-backed cache and concurrency-limited loader for empire data
// No external deps; designed to work with existing geoJson API without backend changes.

import { getAllEmpires, getEmpireDetailsById } from "../components/api/geoJson";

const DB_NAME = "mapx-cache";
const DB_VERSION = 1;
const STORE_META = "empireMeta";
const STORE_DETAILS = "empireDetails";

function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
        if (!db.objectStoreNames.contains(STORE_DETAILS)) db.createObjectStore(STORE_DETAILS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      // Fallback: fail open (caller can continue without IDB)
      resolve(null);
    }
  });
}

async function idbGet(storeName, key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch (_) {
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
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

async function idbKeys(storeName) {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (_) {
      resolve([]);
    }
  });
}

// Simple concurrency limiter without extra deps
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
          if (typeof res !== "undefined") results.push(res);
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
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function loadAllEmpiresWithDetailsCached(forceRefresh = false) {
  const now = Date.now();

  // 1️⃣ --- Load cached metadata (list of empires)
  let metadataList = null;
  const cachedMeta = await idbGet(STORE_META, "list");

  if (
    !forceRefresh &&
    cachedMeta &&
    cachedMeta.data &&
    now - cachedMeta.timestamp < CACHE_EXPIRY_MS
  ) {
    metadataList = cachedMeta.data;
  } else {
    // Cache expired or force refresh
    metadataList = await getAllEmpires();
    idbSet(STORE_META, "list", {
      timestamp: now,
      data: metadataList,
    }).catch(() => {});
  }

  const ids = metadataList.map((e) => e.objectId).filter(Boolean);

  // 2️⃣ --- Collect cached empire details
  const cachedIds = await idbKeys(STORE_DETAILS);
  const cachedIdSet = new Set(cachedIds);

  const cachedDetailsPromises = ids.map(async (id) => {
    if (!cachedIdSet.has(id)) return null;
    const cached = await idbGet(STORE_DETAILS, id);
    if (
      !forceRefresh &&
      cached &&
      cached.data &&
      now - cached.timestamp < CACHE_EXPIRY_MS
    ) {
      return cached.data; // still valid
    }
    return null; // expired or missing
  });

  const cachedDetails = (await Promise.all(cachedDetailsPromises)).filter(Boolean);
  const cachedDetailIds = new Set(cachedDetails.map((d) => d?.objectId || d?.id || d?._id));

  // 3️⃣ --- Fetch missing or expired details (limit concurrency)
  const missingIds = ids.filter((id) => !cachedDetailIds.has(id));
  const fetchedDetails = await mapWithConcurrency(missingIds, 6, async (id) => {
    const detail = await getEmpireDetailsById(id);
    // Store with timestamp
    idbSet(STORE_DETAILS, id, {
      timestamp: now,
      data: detail,
    }).catch(() => {});
    return detail;
  });

  // 4️⃣ --- Merge and order results
  const detailsById = new Map(
    [...cachedDetails, ...fetchedDetails].map((d) => [
      d?.objectId || d?.id || d?._id,
      d,
    ])
  );

  const ordered = ids.map((id) => detailsById.get(id)).filter(Boolean);
  return ordered;
}



