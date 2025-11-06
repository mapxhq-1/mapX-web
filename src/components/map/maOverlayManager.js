import { findOverlayForMa, MA_OVERLAY_COORDINATES, MA_IMAGE_SEQUENCE } from "../../data/maLayers";
import { isMaRange, yearToMaBin } from "../../utils/era";

const MA_OVERLAY_SOURCE_ID = "ma-overlay-source";
const MA_OVERLAY_LAYER_ID = "ma-overlay-layer";
const PREFETCH_RADIUS = 2;

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

const convertEquirectangularToMercatorDataUrl = async (src) => {
  const img = await loadImageElement(src);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.drawImage(img, 0, 0, width, height);
  const srcData = srcCtx.getImageData(0, 0, width, height).data;

  const destCanvas = document.createElement("canvas");
  destCanvas.width = width;
  destCanvas.height = height;
  const destCtx = destCanvas.getContext("2d");
  const destImage = destCtx.createImageData(width, height);
  const destData = destImage.data;

  for (let y = 0; y < height; y++) {
    const mercV = y / (height - 1);
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * mercV)));
    const eqV = (Math.PI / 2 - lat) / Math.PI;
    const srcY = Math.min(height - 1, Math.max(0, eqV * (height - 1)));
    const y0 = Math.floor(srcY);
    const y1 = Math.min(height - 1, y0 + 1);
    const t = srcY - y0;

    for (let x = 0; x < width; x++) {
      const destIdx = (y * width + x) * 4;
      const srcIdx0 = (y0 * width + x) * 4;
      const srcIdx1 = (y1 * width + x) * 4;
      destData[destIdx] = srcData[srcIdx0] * (1 - t) + srcData[srcIdx1] * t;
      destData[destIdx + 1] = srcData[srcIdx0 + 1] * (1 - t) + srcData[srcIdx1 + 1] * t;
      destData[destIdx + 2] = srcData[srcIdx0 + 2] * (1 - t) + srcData[srcIdx1 + 2] * t;
      destData[destIdx + 3] = srcData[srcIdx0 + 3] * (1 - t) + srcData[srcIdx1 + 3] * t;
    }
  }

  destCtx.putImageData(destImage, 0, 0);
  return destCanvas.toDataURL("image/png");
};

export function createMaOverlayManager(mapRef, yearRef) {
  const cache = new Map();
  let currentMa = null;
  let requestToken = 0;
  const scheduledPrefetch = new Set();

  const hideOverlay = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer(MA_OVERLAY_LAYER_ID)) {
      currentMa = null;
      return;
    }
    try {
      map.setLayoutProperty(MA_OVERLAY_LAYER_ID, "visibility", "none");
    } catch (_) {}
    currentMa = null;
  };

  const ensureOverlay = async (forceEnsure = false) => {
    const map = mapRef.current;
    if (!map) return;

    const year = yearRef.current;
    if (!isMaRange(year)) {
      hideOverlay();
      return;
    }

    const maValue = yearToMaBin(year);
    const overlayEntry = findOverlayForMa(maValue);
    if (!overlayEntry) {
      hideOverlay();
      return;
    }

    if (!forceEnsure && currentMa === overlayEntry.ma && map.getLayer(MA_OVERLAY_LAYER_ID)) {
      try {
        map.setLayoutProperty(MA_OVERLAY_LAYER_ID, "visibility", "visible");
      } catch (_) {}
      return;
    }

    const cacheKey = overlayEntry.imageUrl || overlayEntry.ma;
    let promise = cache.get(cacheKey);
    if (!promise) {
      promise = convertEquirectangularToMercatorDataUrl(overlayEntry.imageUrl).catch(
        () => overlayEntry.imageUrl
      );
      cache.set(cacheKey, promise);
    }

    const token = ++requestToken;
    const url = await promise;
    if (token !== requestToken) return;

    const activeMap = mapRef.current;
    if (!activeMap) return;

    const coordinates = MA_OVERLAY_COORDINATES;
    const existingSource = activeMap.getSource(MA_OVERLAY_SOURCE_ID);

    if (!existingSource) {
      try {
        activeMap.addSource(MA_OVERLAY_SOURCE_ID, {
          type: "image",
          url,
          coordinates,
        });
      } catch (_) {
        return;
      }
    } else {
      try {
        if (typeof existingSource.updateImage === "function") {
          existingSource.updateImage({ url, coordinates });
        } else if (typeof existingSource.setCoordinates === "function") {
          existingSource.setCoordinates(coordinates);
        } else {
          throw new Error("Unsupported image source updater");
        }
      } catch (_) {
        try { activeMap.removeLayer(MA_OVERLAY_LAYER_ID); } catch (_) {}
        try { activeMap.removeSource(MA_OVERLAY_SOURCE_ID); } catch (_) {}
        try {
          activeMap.addSource(MA_OVERLAY_SOURCE_ID, {
            type: "image",
            url,
            coordinates,
          });
        } catch (err) {
          return;
        }
      }
    }

    if (!activeMap.getLayer(MA_OVERLAY_LAYER_ID)) {
      try {
        activeMap.addLayer({
          id: MA_OVERLAY_LAYER_ID,
          type: "raster",
          source: MA_OVERLAY_SOURCE_ID,
          layout: { visibility: "visible" },
          paint: {
            "raster-opacity": 1,
            "raster-fade-duration": 300,
          },
        });
      } catch (_) {
        return;
      }
    } else {
      try {
        activeMap.setLayoutProperty(MA_OVERLAY_LAYER_ID, "visibility", "visible");
      } catch (_) {}
    }

    currentMa = overlayEntry.ma;
    schedulePrefetch(overlayEntry.ma);
  };

  const prefetchEntry = async (entry) => {
    if (!entry) return;
    const cacheKey = entry.imageUrl || entry.ma;
    if (cache.has(cacheKey)) return;
    const promise = convertEquirectangularToMercatorDataUrl(entry.imageUrl).catch(() => entry.imageUrl);
    cache.set(cacheKey, promise);
    try {
      await promise;
    } catch (_) {
      cache.delete(cacheKey);
    }
  };

  const prefetchAround = async (maValue) => {
    const index = MA_IMAGE_SEQUENCE.findIndex((entry) => entry.ma === maValue);
    if (index === -1) return;
    const targets = [];
    for (let offset = 1; offset <= PREFETCH_RADIUS; offset += 1) {
      const right = index + offset;
      const left = index - offset;
      if (right < MA_IMAGE_SEQUENCE.length) targets.push(MA_IMAGE_SEQUENCE[right]);
      if (left >= 0) targets.push(MA_IMAGE_SEQUENCE[left]);
    }
    for (let i = 0; i < targets.length; i += 1) {
      await prefetchEntry(targets[i]);
    }
  };

  const schedulePrefetch = (maValue) => {
    if (scheduledPrefetch.has(maValue)) return;
    scheduledPrefetch.add(maValue);
    const run = () => {
      scheduledPrefetch.delete(maValue);
      prefetchAround(maValue);
    };
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 200);
    }
  };

  return {
    handleMapLoad: () => {
      ensureOverlay(true);
    },
    handleStyleChange: () => {
      ensureOverlay(true);
    },
    handleYearChange: () => {
      ensureOverlay(false);
    },
    dispose: () => {
      const map = mapRef.current;
      if (!map) return;
      hideOverlay();
      try { map.removeLayer(MA_OVERLAY_LAYER_ID); } catch (_) {}
      try { map.removeSource(MA_OVERLAY_SOURCE_ID); } catch (_) {}
    },
  };
}

