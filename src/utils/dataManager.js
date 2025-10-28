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
      const store = tx.objectStore(storeName);
      const req = store.get(key);
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
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
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
    } catch {
      resolve([]);
    }
  });
}

// concurrency limiter
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
export async function loadAllEmpiresWithDetailsCached(currentYear, forceRefresh = false, dispatch = null) {
  const now = Date.now();
  const minYear = currentYear - 25;
  const maxYear = currentYear + 25;

  // 1️⃣ Load cached metadata
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
    metadataList = await getAllEmpires();
    idbSet(STORE_META, "list", {
      timestamp: now,
      data: metadataList,
    }).catch(() => {});
  }

  
  const toInt = (y) => {
    if (!y || !y.year) return null;
    return y.era === "BCE" ? -y.year : y.year;
  };

  const filteredEmpires = metadataList.filter((e) => {
    const start = toInt(e.startYear);
    const end = toInt(e.endYear);
    if (start === null || end === null) return false;
    return end >= minYear && start <= maxYear;
  });

  const ids = filteredEmpires.map((e) => e.objectId).filter(Boolean);

  // 3️⃣ Collect cached details
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
      return cached.data;
    }
    return null;
  });

  const cachedDetails = (await Promise.all(cachedDetailsPromises)).filter(Boolean);
  const cachedDetailIds = new Set(cachedDetails.map((d) => d?.objectId || d?.id || d?._id));

  // 4️⃣ Fetch missing/expired ones
  const missingIds = ids.filter((id) => !cachedDetailIds.has(id));
  
  // SET LOADING TO TRUE BEFORE API CALLS
  if (missingIds.length > 0 && dispatch) {
    dispatch({ type: 'map/setLoading', payload: true });
  }
  
  const fetchedDetails = await mapWithConcurrency(missingIds, 6, async (id) => {
    const detail = await getEmpireDetailsById(id);
    idbSet(STORE_DETAILS, id, {
      timestamp: now,
      data: detail,
    }).catch(() => {});
    return detail;
  });

  // SET LOADING TO FALSE AFTER API CALLS
  if (missingIds.length > 0 && dispatch) {
    dispatch({ type: 'map/setLoading', payload: false });
  }

  // 5️⃣ Merge + return
  const detailsById = new Map(
    [...cachedDetails, ...fetchedDetails].map((d) => [
      d?.objectId || d?.id || d?._id,
      d,
    ])
  );

  const ordered = ids.map((id) => detailsById.get(id)).filter(Boolean);
  return ordered;
}