import { fetchAllImages, fetchImageById } from "../api/image";
import maplibregl from "maplibre-gl";
import { useDispatch } from "react-redux";
import {openImages} from '../../store/mapSlice';
export const imageManager = (mapRef) => {
    const dispatch = useDispatch();
    const map = mapRef;
    let active = false;
    let cursorEl = null;
    let onMove = null;
    let onClick = null;
    const imageMarkers = [];
    const IMAGE_EXPAND_ZOOM = 12; // full image display
    const IMAGE_ICON_ZOOM = 5;    // small icon
    const stopEvt = (ev) => ev.stopPropagation();


    // Default placeholder image (you can replace this)
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xOSAzSDVDMy44OTU0MyAzIDMgMy44OTU0MyAzIDVWMTlDMyAyMC4xMDQ2IDMuODk1NDMgMjEgNSAyMUgxOUMyMC4xMDQ2IDIxIDIxIDIwLjEwNDYgMjEgMTlWNUMyMSAzLjg5NTQzIDIwLjEwNDYgMyAxOSAzWiIgZmlsbD0iI0ZGRjlDMCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIzIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xOSAyMUw1IDIxTDEwIDE0TDE0IDE4TDE3IDE1TDE5IDIxWiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K';

    const styleBaseBox = (box) => {
        box.style.background = "transparent";
        box.style.border = "none";
        box.style.boxShadow = "none";
        box.style.padding = "0";
        box.style.borderRadius = "4px";
        box.style.position = "relative";
        box.style.cursor = "pointer";
        box.style.userSelect = "none";
        box.style.overflow = "hidden";
        box.style.transition = "all 0.2s ease";
    };

    const renderMini = (rootEl, imageUrl) => {
        // Use cssText to ensure all styles are applied
        rootEl.style.cssText = `
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
            border-radius: 0;
            min-width: 24px;
            min-height: 24px;
            width: 24px;
            height: 24px;
            max-width: 24px;
            max-height: 24px;
            display: block;
        `;

        const img = document.createElement('img');
        img.src = imageUrl || defaultImage;
        img.alt = 'Image';
        img.style.width = '24px';
        img.style.height = '24px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '2px';
        img.style.display = 'block';

        rootEl.appendChild(img);
    };

    const renderThumbnail = (rootEl, imageUrl) => {
        // Use cssText to ensure all styles are applied
        rootEl.style.cssText = `
            background: transparent;
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 0;
            border-radius: 4px;
            position: relative;
            cursor: pointer;
            user-select: none;
            overflow: hidden;
            transition: all 0.2s ease;
            min-width: 80px;
            max-width: 80px;
            min-height: 80px;
            max-height: 80px;
            width: 80px;
            height: 80px;
            display: block;
        `;

        const img = document.createElement('img');
        img.src = imageUrl || defaultImage;
        img.alt = 'Image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.style.display = 'block';

        rootEl.appendChild(img);
    };

    const renderFull = (rootEl, imageUrl) => {
        // Use cssText to ensure all styles are applied
        rootEl.style.cssText = `
            background: transparent;
            border: 2px solid white;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            padding: 0;
            border-radius: 4px;
            position: relative;
            cursor: pointer;
            user-select: none;
            overflow: hidden;
            transition: all 0.2s ease;
            min-width: 200px;
            max-width: 200px;
            min-height: 200px;
            max-height: 200px;
            width: 200px;
            height: 200px;
            display: block;
        `;

        const img = document.createElement('img');
        img.src = imageUrl || defaultImage;
        img.alt = 'Image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit= 'cover';
        img.style.borderRadius = '4px';
        img.style.display = 'block';

        // Add loading indicator
        img.onload = () => {
            rootEl.style.background = 'transparent';
        };
        img.onerror = () => {
            img.src = defaultImage;
        };

        rootEl.appendChild(img);
    };

    const getModeForZoom = (z) => {
    if (z < IMAGE_ICON_ZOOM) return 'mini';
    if (z < IMAGE_EXPAND_ZOOM) return 'thumb';
    return 'full';
};
const applyModeStyles = (rootEl, mode) => {
  rootEl.style.background = 'transparent';
  rootEl.style.borderRadius = '4px';
  rootEl.style.overflow = 'hidden';
  rootEl.style.cursor = 'pointer';
  rootEl.style.display = 'block';
  rootEl.style.pointerEvents = 'auto';
  rootEl.style.boxSizing = 'border-box'; // <- important
  rootEl.style.margin = '0';             // <- important
  // Do NOT set position or transform on rootEl

  rootEl.style.transition = 'width 160ms ease, height 160ms ease, box-shadow 160ms ease, border-color 160ms ease';

  let size = 24, boxShadow = 'none', border = 'none';
  if (mode === 'thumb') { size = 80; boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }
  else if (mode === 'full') { size = 200; boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; border = '2px solid white'; }

  const s = `${size}px`;
  rootEl.style.width = s;
  rootEl.style.height = s;
  rootEl.style.minWidth = s;
  rootEl.style.maxWidth = s;
  rootEl.style.minHeight = s;
  rootEl.style.maxHeight = s;
  rootEl.style.boxShadow = boxShadow;
  rootEl.style.border = border;
};
const renderImage = (state, force = false) => {
    const { rootEl } = state;

    // Initialize once
    if (!state.initialized) {
        const img = document.createElement('img');
        img.alt = 'Image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.style.display = 'block';

        img.onload = () => { rootEl.style.background = 'transparent'; };
        img.onerror = () => { img.src = defaultImage; };

        // Create caption container (always present, only visible in full mode)
        const captionEl = document.createElement('div');
        captionEl.innerText = state.caption || '';
        captionEl.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            background: rgba(0,0,0,0.6);
            color: white;
            font-size: 12px;
            padding: 2px 4px;
            box-sizing: border-box;
            text-align: center;
            border-radius: 0 0 4px 4px;
            display: none;
        `;

        rootEl.appendChild(img);
        rootEl.appendChild(captionEl);

        state.imgEl = img;
        state.captionEl = captionEl;
        state.initialized = true;
    }

    // Ensure src without rebuilding
    if (state.imageUrl && state.imgEl.getAttribute('src') !== state.imageUrl) {
        state.imgEl.setAttribute('src', state.imageUrl);
    }

    const z = map.current.getZoom();
    const nextMode = getModeForZoom(z);

    if (!force && state.mode === nextMode) return;

    state.mode = nextMode;
    state.expanded = (nextMode === 'full');
    applyModeStyles(rootEl, nextMode);

    // Toggle caption visibility
    if (state.captionEl) {
        state.captionEl.style.display = (nextMode === 'full' && state.caption) ? 'block' : 'none';
    }
};


    const ensureCursorEl = () => {
        if (cursorEl) return cursorEl;
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.pointerEvents = "none";
        el.style.zIndex = "24";
        el.style.transform = "translate(-50%, -50%)";
        el.style.fontSize = "18px";
        el.style.lineHeight = "1";
        el.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="white"/><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" fill="#FFD469"/><circle cx="12" cy="10" r="3" fill="white"/><path d="M19 21L5 21L10 14L14 18L17 15L19 21Z" fill="white"/></svg>';
        map.current.getContainer().appendChild(el);
        cursorEl = el;
        return el;
    };

    const createImageMarker = (lngLat, imageUrl = '', imageId = null, caption = '') => {
  const root = document.createElement("div");
  root.className = 'mx-image-root';

  const state = {
    rootEl: root,
    imageUrl: imageUrl || defaultImage,
    caption,
    expanded: false,
    imageId,
    initialized: false,
    mode: null
  };

  // Pre-size so MapLibre computes the correct anchor offsets
  renderImage(state, true);

  const marker = new maplibregl.Marker({
      element: root,
      draggable: true,
      anchor: 'bottom',   // <- key change
      offset: [0, 0]      // optional, tweak if you want to nudge it a few px
    })
    .setLngLat(lngLat)
    .addTo(map.current);

  state.marker = marker;

  // Ensure final position after first paint
  requestAnimationFrame(() => {
    try { marker.setLngLat(lngLat); } catch {}
  });

  root.addEventListener('click', (e) => {
    e.stopPropagation();
    dispatch(openImages({
      id: imageId,
      imageUrl,
      caption,
      coordinates: lngLat
    }));
  });

  const entry = { marker, state };
  imageMarkers.push(entry);
  return entry;
};

const clearAllImages = () => {
    // Find all image marker elements in the DOM and remove them
    const markerElements = document.querySelectorAll('.mx-image-root');
    
    markerElements.forEach((el) => {
        // Find the parent marker container (MapLibre adds a wrapper)
        const markerContainer = el.closest('.maplibregl-marker');
        if (markerContainer && markerContainer.parentNode) {
            markerContainer.parentNode.removeChild(markerContainer);
        }
    });
    
    // Also clear the array for good measure
    imageMarkers.length = 0;
    
};

let rafZoom = null;
const syncImagesWithZoom = () => {
    if (!map.current) return;
    if (rafZoom) return;
    rafZoom = requestAnimationFrame(() => {
        rafZoom = null;
        imageMarkers.forEach((entry) => {
            renderImage(entry.state);
        });
    });
};

    const activate = () => {
        if (active) return;
        active = true;
        const el = ensureCursorEl();
        el.style.display = "block";
        onMove = (e) => {
            if (!cursorEl) return;
            cursorEl.style.left = `${e.point.x}px`;
            cursorEl.style.top = `${e.point.y}px`;
        };
        onClick = (e) => {
            // Create image marker with default image
            const entry = createImageMarker(e.lngLat, defaultImage, '');
            // Open image upload/selection dialog
            dispatch(openImages({
                id:"new",
                coordinates: {
                    lng: e.lngLat.lng,
                    lat: e.lngLat.lat
                }
            }));
            
            // Switch back to select mode after placing
            deactivate();
            try { window.mapxDrawSetMode && window.mapxDrawSetMode('select'); } catch (_) {}
        };
        
        map.current.getCanvas().style.cursor = "none";
        map.current.on("mousemove", onMove);
        map.current.on("click", onClick);
    };

    const deactivate = () => {
        if (!active) return;
        active = false;
        map.current.getCanvas().style.cursor = "";
        try { map.current.off("mousemove", onMove); } catch (_) {}
        try { map.current.off("click", onClick); } catch (_) {}
        onMove = null; onClick = null;
        if (cursorEl) { cursorEl.style.display = "none"; }
    };

    // Zoom synchronization - setup function to be called after map is ready
    const setupZoomListeners = () => {
        if (map && map.current) {
            map.current.on('zoom', syncImagesWithZoom);
            map.current.on('zoomend', syncImagesWithZoom);
            return true;
        }
        return false;
    };

    // Try to setup listeners immediately
    const listenersSetup = setupZoomListeners();
    
    // If map isn't ready, try again after a short delay
    if (!listenersSetup) {
        setTimeout(setupZoomListeners, 100);
    }

    const loadFromUrl = async (url) => {
        try {
            const r = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!r.ok) return false;
            const items = await r.json();
            if (!Array.isArray(items)) return false;
            items.forEach((it) => {
                if (!it) return;
                const lng = Number(it.lng);
                const lat = Number(it.lat);
                if (Number.isFinite(lng) && Number.isFinite(lat)) {
                    createImageMarker(
                        { lng, lat }, 
                        String(it.imageUrl || ''), 
                        String(it.imageId || ''),
                        String(it.caption || '')
                    );
                }
            });
            return true;
        } catch (_) {
            return false;
        }
    };

    // Context-based loading (similar to notes)
    try { window.mapxImagesLoadFromUrl = loadFromUrl; } catch (_) {}
    
    let lastLoaded = { projectId: null, year: null, era: null };
    let loading = false;
    
    const loadImagesByContext = async (opts) => {
        try {
            // const projectId = opts.projectIdParam;
            // const latestYearFromStore = (reduxStore && reduxStore.getState && reduxStore.getState().map?.year);
            // const yearValRaw = (opts && typeof opts.year !== 'undefined') ? opts.year : (latestYearFromStore ?? year);
            // const yearVal = Number(yearValRaw);
            // const eraVal = (opts && opts.era) || 'CE';
            const projectId = opts.projectIdParam;
            const eraVal = opts.era;
            const yearVal = opts.year
            if (projectId && (yearVal !== undefined)) {
                if (loading) return;
                loading = true;
                try {
                    clearAllImages();
                    // You'll need to implement fetchAllImages similar to fetchAllImages
                    const response = await fetchAllImages(projectId, yearVal, eraVal);
                    const images =  response || [];
                    if (Array.isArray(images)) {
                        images.forEach(async (img) => {
                            if (!img) return;
                            const lng = Number(img.longitude);
                            const lat = Number(img.latitude);
                            const res = await fetchImageById(img.imageFileId+"."+img.format);
                            const imageUrl = res;
                            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
                            createImageMarker(
                                { lng, lat }, 
                                imageUrl, 
                                img.id, 
                                img.caption
                            );
                        });
                        lastLoaded = { projectId, year: yearVal, era: eraVal };
                    }
                } finally {
                    loading = false;
                }
            }
        } catch (_) { /* ignore */ }
    };

    try { window.mapxImagesloadImagesByContext = loadImagesByContext; } catch (_) {}
    // Initial load

    return { activate, deactivate, createImageMarker, clearAllImages, loadImagesByContext };
};