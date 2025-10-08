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

export async function loadAllEmpiresWithDetailsCached() {
  // 1) Try to read cached metadata list
  const cachedMeta = await idbGet(STORE_META, "list");
  let metadataList = cachedMeta;
  if (!Array.isArray(metadataList) || metadataList.length === 0) {
    metadataList = await getAllEmpires();
    // Best-effort cache
    idbSet(STORE_META, "list", metadataList).catch(() => {});
  }

  const ids = metadataList.map((e) => e.objectId).filter(Boolean);

  // 2) Collect cached details
  const cachedIds = await idbKeys(STORE_DETAILS);
  const cachedIdSet = new Set(cachedIds);
  const fromCachePromises = ids
    .filter((id) => cachedIdSet.has(id))
    .map((id) => idbGet(STORE_DETAILS, id));
  const cachedDetails = (await Promise.all(fromCachePromises)).filter(Boolean);

  // 3) Fetch missing with limited concurrency and cache as we go
  const missingIds = ids.filter((id) => !cachedIdSet.has(id));
  const fetchedDetails = await mapWithConcurrency(missingIds, 6, async (id) => {
    const detail = await getEmpireDetailsById(id);
    // Cache best-effort
    idbSet(STORE_DETAILS, id, detail).catch(() => {});
    return detail;
  });

  // Preserve original order per metadata list
  const detailsById = new Map([...cachedDetails, ...fetchedDetails].map((d) => [d?.objectId || d?.id || d?._id, d]));
  const ordered = ids.map((id) => detailsById.get(id)).filter(Boolean);
  return ordered;
}


