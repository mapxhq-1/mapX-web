// maOverlayManager.js
import { findOverlayForMa, MA_OVERLAY_COORDINATES, MA_IMAGE_SEQUENCE } from "../../data/maLayers";
import { isMaRange, yearToMaBin } from "../../utils/era";

/**
 * Load-everything settings
 */
const PRELOAD_ALL_ON_LOAD = false;   // eagerly reproject+cache all frames on map load
const PRELOAD_CONCURRENCY = 3;      // how many images to prepare at once (tune for your CPU)
const PREVIEW_MAX_WIDTH   = 1024;   // preview cap
const FULL_MAX_WIDTH      = 2048;   // full cap (keep ≤4096 for older GPUs)
const DEBOUNCE_MS         = 50;

// 1x1 transparent PNG (valid initial URL so MapLibre doesn’t try to decode empty string)
const BLANK_PNG_URL =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

// --- Dual source/layer setup ---
const S0 = "ma-img-src-0", L0 = "ma-img-lyr-0";
const S1 = "ma-img-src-1", L1 = "ma-img-lyr-1";
let front = 0;
const layerFrameKey = { [L0]: null, [L1]: null };

/* -----------------------------
   Helpers
   ----------------------------- */

function validateOverlayCoords(coords) {
  if (!Array.isArray(coords) || coords.length !== 4) {
    console.warn("MA_OVERLAY_COORDINATES must be an array of 4 [lng,lat] corners.");
    return false;
  }
  return true;
}

async function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";        // requires ACAO on server
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed: " + src));
    img.src = src;
  });
}

function nearestOrLinearRow(srcData, width, y0, y1, t, x) {
  const i0 = (y0 * width + x) * 4;
  if (y1 === null) {
    return [
      srcData[i0],
      srcData[i0 + 1],
      srcData[i0 + 2],
      srcData[i0 + 3]
    ];
  } else {
    const i1 = (y1 * width + x) * 4;
    return [
      srcData[i0]     * (1 - t) + srcData[i1]     * t,
      srcData[i0 + 1] * (1 - t) + srcData[i1 + 1] * t,
      srcData[i0 + 2] * (1 - t) + srcData[i1 + 2] * t,
      srcData[i0 + 3] * (1 - t) + srcData[i1 + 3] * t,
    ];
  }
}

/* -----------------------------
   Equirect → Mercator reprojection (to Data URL)
   ----------------------------- */
async function convertEquirectangularToMercatorDataUrl(url, { maxWidth = null, method = "linear" } = {}) {
  // Load
  const img = await loadImageElement(url);
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;

  // Scale first to reduce work
  const scale = maxWidth && sw > maxWidth ? (maxWidth / sw) : 1;
  const width  = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  // Prepare source pixels
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = width;
  srcCanvas.height = height;
  const sctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, width, height);

  let srcImageData;
  try {
    srcImageData = sctx.getImageData(0, 0, width, height);
  } catch (e) {
    console.error("Reprojection blocked by CORS (tainted canvas). Ensure ACAO header on", url, e);
    throw e;
  }
  const srcData = srcImageData.data;

  // Dest pixels
  const destCanvas = document.createElement("canvas");
  destCanvas.width = width;
  destCanvas.height = height;
  const dctx = destCanvas.getContext("2d");
  const dImg = dctx.createImageData(width, height);
  const dd = dImg.data;

  const useNearest = method === "nearest";

  for (let y = 0; y < height; y++) {
    const mercV = (height === 1) ? 0 : y / (height - 1);
    const lat   = Math.atan(Math.sinh(Math.PI * (1 - 2 * mercV)));
    const eqV   = (Math.PI / 2 - lat) / Math.PI;
    const srcYf = Math.min(height - 1, Math.max(0, eqV * (height - 1)));

    let y0, y1, t;
    if (useNearest) {
      y0 = Math.round(srcYf);
      y1 = null;
      t  = 0;
    } else {
      y0 = Math.floor(srcYf);
      y1 = Math.min(height - 1, y0 + 1);
      t  = srcYf - y0;
    }

    for (let x = 0; x < width; x++) {
      const di = (y * width + x) * 4;
      const [r, g, b, a] = nearestOrLinearRow(srcData, width, y0, y1, t, x);
      dd[di]     = r;
      dd[di + 1] = g;
      dd[di + 2] = b;
      dd[di + 3] = a;
    }
  }

  dctx.putImageData(dImg, 0, 0);

  // Data URL (PNG for maximum compatibility)
  try {
    return destCanvas.toDataURL("image/png");
  } catch (e) {
    console.error("toDataURL failed for", url, e);
    throw e;
  }
}

/* -------------
   Layers (no fade)
   ------------- */

function ensureFadeLayers(map) {
  if (!validateOverlayCoords(MA_OVERLAY_COORDINATES)) return;

  const make = (sid, lid) => {
    if (!map.getSource(sid)) {
      map.addSource(sid, { type: "image", url: BLANK_PNG_URL, coordinates: MA_OVERLAY_COORDINATES });
    }
    if (!map.getLayer(lid)) {
      map.addLayer({
        id: lid,
        type: "raster",
        source: sid,
        layout: { visibility: "visible" },
        paint: {
          "raster-opacity": 0,
          "raster-resampling": "linear",
          "raster-opacity-transition": { duration: 0, delay: 0 }, // keep zero
        },
      });
    }
  };
  make(S0, L0);
  make(S1, L1);
}

function getFrontIds(){ return { sid: front ? S1 : S0, lid: front ? L1 : L0 }; }
function getBackIds(){ const b = front ^ 1; return { sid: b ? S1 : S0, lid: b ? L1 : L0, backIndex: b }; }

// Wait one render so the new texture is on GPU, then swap instantly
function waitNextRender(map, frames = 1) {
  return new Promise((resolve) => {
    let left = frames;
    const on = () => {
      if (--left <= 0) {
        map.off("render", on);
        resolve();
      }
    };
    map.on("render", on);
    map.triggerRepaint();
  });
}

function instantSwap(map, fromLayerId, toLayerId) {
  try {
    // Show the new layer immediately
    map.setPaintProperty(toLayerId, "raster-opacity", 1);
    // Hide the old layer on the next frame to avoid a blank frame race
    requestAnimationFrame(() => {
      try { map.setPaintProperty(fromLayerId, "raster-opacity", 0); } catch {}
    });
  } catch {}
}

function replaceFrontImage(map, imageUrl, coords = MA_OVERLAY_COORDINATES) {
  ensureFadeLayers(map);
  const { sid } = getFrontIds();
  const src = map.getSource(sid);
  if (src && typeof src.updateImage === "function") {
    src.updateImage({ url: imageUrl, coordinates: coords });
  }
}

async function crossfadeTo(map, frameKey, imageUrl, coords = MA_OVERLAY_COORDINATES) {
  ensureFadeLayers(map);

  const currentFront = front ? L1 : L0;
  if (layerFrameKey[currentFront] === frameKey) {
    try { map.setPaintProperty(currentFront, "raster-opacity", 1); } catch {}
    return;
  }

  const { sid, lid, backIndex } = getBackIds();
  let src = map.getSource(sid);

  if (src && typeof src.updateImage === "function") {
    src.updateImage({ url: imageUrl, coordinates: coords });
  } else {
    try { map.removeLayer(lid); } catch {}
    try { map.removeSource(sid); } catch {}
    map.addSource(sid, { type: "image", url: BLANK_PNG_URL, coordinates: coords });
    map.addLayer({
      id: lid,
      type: "raster",
      source: sid,
      layout: { visibility: "visible" },
      paint: { "raster-opacity": 0, "raster-resampling": "linear", "raster-opacity-transition": { duration: 0, delay: 0 } },
    });
    src = map.getSource(sid);
    src.updateImage({ url: imageUrl, coordinates: coords });
  }

  // Ensure the new texture is uploaded before we hide the old layer
  await waitNextRender(map, 1);
  instantSwap(map, currentFront, lid);

  front = backIndex;
  layerFrameKey[lid] = frameKey;
}

/* -----
   Cache (preload all)
   ----- */
// rec = { previewUrl: string, fullUrl: string, pPreview: Promise<string>, pFull: Promise<string> }
const CACHE = new Map();
function ck(url){ return url; }

async function getFramePreview(url) {
  const k = ck(url);
  const rec = CACHE.get(k) || {};
  if (rec.previewUrl) return rec.previewUrl;
  if (!rec.pPreview) {
    rec.pPreview = convertEquirectangularToMercatorDataUrl(url, { maxWidth: PREVIEW_MAX_WIDTH, method: "nearest" })
      .then(u => { rec.previewUrl = u; CACHE.set(k, rec); return u; })
      .catch(err => { console.error("Preview reprojection failed:", url, err); return null; });
    CACHE.set(k, rec);
  }
  return rec.pPreview;
}

async function getFrameFull(url) {
  const k = ck(url);
  const rec = CACHE.get(k) || {};
  if (rec.fullUrl) return rec.fullUrl;
  if (!rec.pFull) {
    rec.pFull = convertEquirectangularToMercatorDataUrl(url, { maxWidth: FULL_MAX_WIDTH, method: "linear" })
      .then(u => { rec.fullUrl = u; CACHE.set(k, rec); return u; })
      .catch(err => { console.error("Full reprojection failed:", url, err); return null; });
    CACHE.set(k, rec);
  }
  return rec.pFull;
}

/* -----------------------------
   Preload all frames (eager)
   ----------------------------- */

let preloadAbort = { aborted: false };
let preloadPromise = null;

function makeQueue(items) {
  let i = 0;
  return () => (i < items.length ? items[i++] : null);
}

async function runLimited(items, worker, concurrency, abortFlag) {
  const next = makeQueue(items);
  async function loop() {
    for (;;) {
      if (abortFlag?.aborted) return;
      const item = next();
      if (!item) return;
      try { await worker(item); } catch (e) { /* already logged */ }
      // Yield occasionally
      await new Promise(r => setTimeout(r, 0));
    }
  }
  const runners = new Array(Math.max(1, concurrency)).fill(0).map(() => loop());
  await Promise.all(runners);
}

async function preloadAllFrames() {
  if (preloadPromise) return preloadPromise;
  preloadAbort.aborted = false;

  const entries = MA_IMAGE_SEQUENCE.slice();
  const previewWorker = (e) => getFramePreview(e.imageUrl);
  const fullWorker    = (e) => getFrameFull(e.imageUrl);

  const work = (async () => {
    console.time("Preload previews");
    await runLimited(entries, previewWorker, PRELOAD_CONCURRENCY, preloadAbort);
    console.timeEnd("Preload previews");

    console.time("Preload full");
    await runLimited(entries, fullWorker, PRELOAD_CONCURRENCY, preloadAbort);
    console.timeEnd("Preload full");
  })();

  preloadPromise = work.finally(() => { preloadPromise = null; });
  return work;
}

/* --------------------------
   Public overlay manager API
   -------------------------- */
export function createMaOverlayManager(mapRef, yearRef) {
  let currentMa = null;
  let currentFrameKey = null;
  let requestToken = 0;
  let debounceTimer = null;

  const hideOverlay = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer(L0)) map.setPaintProperty(L0, "raster-opacity", 0);
      if (map.getLayer(L1)) map.setPaintProperty(L1, "raster-opacity", 0);
    } catch {}
    currentMa = null;
    currentFrameKey = null;
  };

  function ensureMercatorProjection(map) {
    try {
      const proj = map.getProjection?.()?.name;
      if (proj && proj !== "mercator") map.setProjection?.("mercator");
    } catch {}
  }

  async function ensureOverlayNow(forceEnsure = false) {
    const map = mapRef.current;
    if (!map) return;

    ensureMercatorProjection(map);

    const year = yearRef.current;
    if (!isMaRange(year)) { hideOverlay(); return; }

    const maValue = yearToMaBin(year);
    const entry = findOverlayForMa(maValue);
    if (!entry) { hideOverlay(); return; }

    const frameKey = entry.imageUrl || entry.ma;

    if (!forceEnsure && currentMa === entry.ma && currentFrameKey === frameKey) {
      const frontId = front ? L1 : L0;
      try { if (map.getLayer(frontId)) map.setPaintProperty(frontId, "raster-opacity", 1); } catch {}
      return;
    }

    const token = ++requestToken;

    // Use cached preview (preloaded)
    let previewUrl = await getFramePreview(entry.imageUrl);
    if (token !== requestToken) return;
    if (!mapRef.current) return;

    if (!previewUrl) {
      console.warn("No preview available; falling back to raw image URL (no reprojection):", entry.imageUrl);
      await crossfadeTo(map, frameKey, entry.imageUrl, MA_OVERLAY_COORDINATES);
      currentMa = entry.ma;
      currentFrameKey = frameKey;
      return;
    }

    await crossfadeTo(map, frameKey, previewUrl, MA_OVERLAY_COORDINATES);
    currentMa = entry.ma;
    currentFrameKey = frameKey;

    // Upgrade to full (already cached shortly after)
    let fullUrl = await getFrameFull(entry.imageUrl);
    if (token !== requestToken) return;
    if (!mapRef.current) return;
    if (fullUrl && currentFrameKey === frameKey) {
      replaceFrontImage(map, fullUrl, MA_OVERLAY_COORDINATES);
    }
  }

  const ensureOverlay = (forceEnsure = false) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (forceEnsure) ensureOverlayNow(true);
    else debounceTimer = setTimeout(() => ensureOverlayNow(false), DEBOUNCE_MS);
  };

  return {
    handleMapLoad: async () => {
      const map = mapRef.current;
      if (map && !map.__ml_error_hook) {
        map.__ml_error_hook = true;
        map.on("error", (e) => console.error("MapLibre error:", e && e.error ? e.error : e));
      }

      if (PRELOAD_ALL_ON_LOAD) {
        try {
          await preloadAllFrames();
        } catch (e) {
          console.error("Preload failed. Check CORS (ACAO) and URLs.", e);
        }
      }
      ensureOverlay(true);
    },
    handleStyleChange: () => { ensureOverlay(true); },
    handleYearChange:  () => { ensureOverlay(false); },
    dispose: () => {
      const map = mapRef.current;
      if (!map) return;
      hideOverlay();
      try { map.removeLayer(L0); } catch {}
      try { map.removeLayer(L1); } catch {}
      try { map.removeSource(S0); } catch {}
      try { map.removeSource(S1); } catch {}
      preloadAbort.aborted = true;
    },
  };
}