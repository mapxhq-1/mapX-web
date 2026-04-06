import maplibregl from "maplibre-gl";
import { isEsriProvider } from "../utils/mapStyles";

// ============================================================================
// 1. INJECT RESPONSIVE STYLES (Mobile Landscape Fix)
// ============================================================================
const injectResponsiveStyles = () => {
    const styleId = "map-mobile-landscape-fix-final-v6"; // Updated ID
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
        /* --- MOBILE LANDSCAPE OVERRIDES --- */
        @media (max-height: 500px) and (orientation: landscape) {

            /* 1. POSITIONING: ANCHOR TO BOTTOM-RIGHT */
            .maplibregl-ctrl-bottom-right {
                top: auto !important;
                bottom: -20px !important;
                right: 55px !important;
                left: auto !important;
                
                margin: 0 !important;
                padding: 0 4px 0 0 !important;
                
                transform: none !important;
                
                /* Stack grows upwards from bottom */
                display: flex !important;
                flex-direction: column-reverse !important; 
                align-items: flex-end !important;
            }

            /* 👇 FORCE 'i' BUTTON TO BOTTOM 👇 */
            /* In column-reverse, the lowest order number sits at the very bottom */
            .compact-attribution-container {
                margin-bottom: -80px !important;
                margin-right: 0px !important; 
            }

            /* 2. BUTTON SIZING */
            .maplibregl-ctrl-group button.maplibregl-ctrl-icon,
            .photon-btn-mobile {
                width: 28px !important;
                height: 28px !important;
                min-height: 28px !important;
                max-height: 28px !important;
                min-width: 28px !important;
                padding: 0 !important;
                margin: 0 !important;
            }

            /* 3. ICON SIZING */
            .maplibregl-ctrl-icon svg,
            .photon-btn-mobile svg {
                width: 16px !important;
                height: 16px !important;
            }

            /* 4. ZOOM CONTROL */
            .zoom-control-container {
                height: auto !important;
                width: 28px !important;
                margin-bottom: 0 !important;
                margin-top: 0 !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .zoom-control-container button {
                height: 24px !important;
                min-height: 24px !important;
                font-size: 14px !important;
                line-height: 1 !important;
            }
            .zoom-control-container button:first-child {
                border-bottom: 1px solid #ddd !important;
            }

            /* 5. NORTH CONTROL */
            .reset-north-container {
                width: 28px !important;
                height: 28px !important;
                min-height: 28px !important;
                /* Add margin BOTTOM to separate it from the Zoom controls below it */
                margin-bottom: 8px !important; 
            }
            .reset-north-container button {
                width: 100% !important;
                height: 100% !important;
            }

            /* 6. GENERAL SPACING */
            .maplibregl-ctrl-group {
                margin: 0 0 8px 0 !important;
                border-radius: 4px !important;
            }

            /* 7. PHOTON SEARCH (Bottom Left) */
            .maplibregl-ctrl-bottom-left {
                bottom: 65px !important;
                left: 55px !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .photon-search-container {
                margin-left: 0 !important;
            }

            .photon-input-mobile {
                width: 140px !important;
                height: 20px !important; 
                font-size: 11px !important;
            }
            .photon-results-mobile {
                max-height: 110px !important;
            }
        }
    `;
    document.head.appendChild(style);
};
// Inject styles immediately
injectResponsiveStyles();

// ============================================================================
// Photon Search Control
// ============================================================================
export class PhotonSearchControl {
    onAdd(m) {
        this._map = m;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl photon-search-container";
        
        // PC Styles
        this._container.style.background = "white";
        this._container.style.borderRadius = "4px";
        this._container.style.boxShadow = "0 1px 2px rgba(0,0,0,0.15)";
        this._container.style.display = "flex";
        this._container.style.flexDirection = "column";
        this._container.style.gap = "4px";

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "4px";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "maplibregl-ctrl-icon photon-btn-mobile";
        btn.setAttribute("aria-label", "Search");
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21l-3.5-3.5M17 10a7 7 0 1 1-14 0a7 7 0 0 1 14 0Z"/></svg>`;

        btn.style.backgroundColor = '#fff';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '4px';
        btn.style.padding = '4px';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

        const input = document.createElement("input");
        input.type = "text";
        input.className = "photon-input-mobile";
        input.placeholder = "Search places";
        
        input.style.width = "220px";
        input.style.height = "16px";
        input.style.padding = "2px 6px";
        input.style.border = "1px solid #d0d7de";
        input.style.borderRadius = "4px";
        input.style.fontSize = "12px";
        input.style.outline = "none";
        input.style.display = "none";

        const list = document.createElement("div");
        list.className = "photon-results-mobile";
        list.style.maxHeight = "180px";
        list.style.overflowY = "auto";
        list.style.border = "1px solid #e5e7eb";
        list.style.borderRadius = "4px";
        list.style.display = "none";
        list.style.background = "#fff";

        this._container.appendChild(list);
        row.appendChild(btn);
        row.appendChild(input);
        this._container.appendChild(row);

        let aborter = null;
        let debounceId = null;

     const clearList = () => {
            list.innerHTML = "";
            list.style.display = "none";
        };

        const renderResults = (suggestions) => {
            clearList();
            
            suggestions.forEach((suggestion) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "search-item-google"; 
                item.style.display = "block";
                item.style.width = "100%";
                item.style.textAlign = "left";
                item.style.padding = "8px 10px";
                item.style.fontSize = "12px";
                item.style.cursor = "pointer";
                item.style.border = "none";
                item.style.borderBottom = "1px solid #eee";
                item.style.background = "#fff";
                
                // New API: Use suggestion.placePrediction.text.text
                const prediction = suggestion.placePrediction;
                item.textContent = prediction.text.text;

                item.addEventListener("click", async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // New API: Instantiate a Place object using the Place ID
                    const { Place } = await google.maps.importLibrary("places");
                    const place = new Place({ id: prediction.placeId });

                    // Fetch only the location (Geometry) to keep costs down
                    await place.fetchFields({ fields: ['location'] });

                    if (place.location) {
                        this._map.flyTo({
                            center: [place.location.lng(), place.location.lat()],
                            zoom: 10,
                            speed: 1.2,
                            essential: true
                        });
                        
                        clearList();
                        input.value = ""; 
                        input.style.display = "none";
                    }
                });
                list.appendChild(item);
            });
            if (suggestions.length > 0) list.style.display = "block";
        };

        const search = async (q) => {
            if (!q || q.trim().length < 2) {
                clearList();
                return;
            }

            try {
                // Import the places library for the New API
                const { AutocompleteSuggestion } = await google.maps.importLibrary("places");

                const request = {
                    input: q,
                    locationBias: this._map.getCenter(), // Use map center for better local results
                    language: 'en'
                };

                // New API method for suggestions
                const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

                if (suggestions && suggestions.length > 0) {
                    renderResults(suggestions);
                } else {
                    clearList();
                }
            } catch (err) {
                console.error("New Places API Error:", err);
                clearList();
            }
        };

        const debouncedSearch = (q) => {
            if (debounceId) clearTimeout(debounceId);
            debounceId = setTimeout(() => search(q), 220);
        };

        const handleGlobalClick = (e) => {
            if (!this._container.contains(e.target)) {
                clearList();
                input.style.display = "none";
            }
        };

        btn.addEventListener("click", () => {
            input.style.display = "block";
            input.focus();
        });

        input.addEventListener("blur", (e) => {
            setTimeout(() => {
                if (!list.contains(document.activeElement)) {
                    input.style.display = "none";
                    clearList();
                }
            }, 100);
        });

        input.addEventListener("input", (e) => debouncedSearch(e.target.value));

        input.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                input.style.display = "none";
                clearList();
            }
            e.stopPropagation();
        });

        this._container.addEventListener("mousedown", (e) => e.stopPropagation());
        this._container.addEventListener("dblclick", (e) => e.stopPropagation());
        this._container.addEventListener("wheel", (e) => e.stopPropagation(), {
            passive: true,
        });

        document.addEventListener("click", handleGlobalClick);
        this._handleGlobalClick = handleGlobalClick;

        return this._container;
    }

    onRemove() {
        if (this._handleGlobalClick) {
            document.removeEventListener("click", this._handleGlobalClick);
        }
        if (this._container && this._container.parentNode)
            this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}

// ============================================================================
// Screenshot Control
// ============================================================================
export class ScreenshotControl {
    onAdd(m) {
        this._map = m;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group screenshot-control-container";
        
        // PC Style
        this._container.style.marginBottom="-15px";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "maplibregl-ctrl-icon";
        button.setAttribute("aria-label", "Download screenshot");
        const cameraSVG = `
        <div class="pl-1.25">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
            </svg>
        </div>`;
        const spinnerSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" opacity="0.25"/>
            <path d="M22 12a10 10 0 0 0-10-10"/>
        </svg>`;
        button.innerHTML = cameraSVG;

        const showToast = (text) => {
            const host = this._map.getContainer();
            const toast = document.createElement("div");
            toast.textContent = text;
            toast.style.position = "absolute";
            toast.style.bottom = "64px";
            toast.style.left = "10px";
            toast.style.padding = "6px 8px";
            toast.style.borderRadius = "6px";
            toast.style.background = "rgba(17,24,39,0.9)";
            toast.style.color = "#fff";
            toast.style.fontSize = "12px";
            toast.style.zIndex = "1000";
            host.appendChild(toast);
            setTimeout(() => {
                toast.style.transition = "opacity 300ms ease";
                toast.style.opacity = "0";
                setTimeout(() => host.removeChild(toast), 320);
            }, 1000);
        };

        const flashButton = () => {};

        const downloadPng = () => {
            button.disabled = true;
            button.innerHTML = spinnerSVG;
            const captureNow = () => {
                try {
                    const src = this._map.getCanvas();
                    try {
                        const gl = src.getContext("webgl2") || src.getContext("webgl");
                        if (gl && gl.finish) gl.finish();
                    } catch (_) {}
                    const off = document.createElement("canvas");
                    off.width = src.width;
                    off.height = src.height;
                    const ctx = off.getContext("2d");
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, off.width, off.height);
                    ctx.drawImage(src, 0, 0);

                    const sample = ctx.getImageData(
                        Math.max(0, off.width / 2 - 2),
                        Math.max(0, off.height / 2 - 2),
                        4,
                        4
                    ).data;
                    let allWhite = true;
                    for (let i = 0; i < sample.length; i += 4) {
                        const r = sample[i],
                            g = sample[i + 1],
                            b = sample[i + 2];
                        if (!(r === 255 && g === 255 && b === 255)) {
                            allWhite = false;
                            break;
                        }
                    }

                    const finalizeDownload = (blobOrDataUrl) => {
                        flashButton();
                        const link = document.createElement("a");
                        const ts = new Date().toISOString().replace(/[:.]/g, "-");
                        let href = "";
                        if (typeof blobOrDataUrl === "string") {
                            href = blobOrDataUrl;
                        } else {
                            href = URL.createObjectURL(blobOrDataUrl);
                        }
                        link.href = href;
                        link.download = `mapx-snapshot-${ts}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        if (typeof blobOrDataUrl !== "string")
                            URL.revokeObjectURL(href);
                        showToast("Screenshot saved");
                    };

                    const finalize = () => {
                        if (off.toBlob) {
                            off.toBlob((blob) => {
                                if (blob) finalizeDownload(blob);
                                else finalizeDownload(off.toDataURL("image/png"));
                            }, "image/png");
                        } else {
                            finalizeDownload(off.toDataURL("image/png"));
                        }
                    };

                    if (!allWhite) {
                        finalize();
                    } else {
                        if (isEsriProvider()) {
                            finalize();
                            showToast("Screenshot saved");
                        } else {
                            const center = this._map.getCenter();
                            const zoom = Math.round(this._map.getZoom());
                            const w = Math.min(2000, Math.floor(off.width));
                            const h = Math.min(2000, Math.floor(off.height));
                            let key = "";
                            try {
                                const styleUrl =
                                    (this._map &&
                                        this._map._style &&
                                        this._map._style.stylesheet &&
                                        this._map._style.stylesheet.sprite) ||
                                    "";
                                const m = /[?&]key=([^&]+)/.exec(styleUrl || "");
                                if (m) key = decodeURIComponent(m[1]);
                            } catch (_) {}
                            const staticUrl = key
                                ? `https://api.maptiler.com/maps/basic/static/${center.lng},${center.lat},${zoom}/${w}x${h}.png?key=${key}`
                                : null;
                            if (staticUrl) {
                                const img = new Image();
                                img.crossOrigin = "anonymous";
                                img.onload = () => {
                                    ctx.drawImage(img, 0, 0, off.width, off.height);
                                    finalize();
                                    showToast("Screenshot saved (static base)");
                                };
                                img.onerror = () => {
                                    showToast("Screenshot blocked by CORS");
                                };
                                img.src = staticUrl;
                            } else {
                                showToast("Screenshot blocked (no static API key)");
                            }
                        }
                    }
                } catch (e) {
                    showToast("Unable to save screenshot");
                } finally {
                    button.disabled = false;
                    button.innerHTML = cameraSVG;
                }
            };

            const prevRepaint = this._map.repaint;
            this._map.repaint = true;
            this._map.once("render", () => {
                try {
                    captureNow();
                } finally {
                    this._map.repaint = prevRepaint;
                }
            });
            this._map.triggerRepaint();
        };

        button.addEventListener("click", downloadPng);
        this._container.appendChild(button);
        return this._container;
    }
    onRemove() {
        if (this._container && this._container.parentNode)
            this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}

// ============================================================================
// Measure Distance Control
// ============================================================================
export class MeasureDistanceControl {
    onAdd(m) {
        this._map = m;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        this._button = document.createElement("button");
        this._button.type = "button";
        this._button.className = "maplibregl-ctrl-icon";
        this._button.style.display = "flex";
        this._button.style.alignItems = "center";
        this._button.style.justifyContent = "center";
        this._button.style.padding = "0";
        this._button.setAttribute("aria-label", "Measure distance");
        this._button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M17.143 18.957c-.49.201.13.552.473.554a.97.97 0 0 0 1.07-1.188c-.307-.865-1.757-1.213-2.887-.94c-1.629.395-2.257 1.74-1.638 2.799c.812 1.392 3.249 1.916 5.165 1.331c2.384-.727 3.266-2.762 2.2-4.357c-1.28-1.913-4.71-2.612-7.389-1.718c-3.13 1.045-4.265 3.767-2.755 5.886c1.732 2.428 6.15 3.302 9.577 2.101c3.87-1.355 5.255-4.76 3.304-7.393c-2.175-2.939-7.571-3.986-11.738-2.482c-4.602 1.661-6.235 5.741-3.85 8.886c2.613 3.444 8.98 4.662 13.88 2.858c5.327-1.963 7.207-6.714 4.39-10.364c-3.047-3.946-10.378-5.336-16.003-3.232c-6.05 2.262-8.175 7.68-4.928 11.831c2.065 2.641 5.994 4.413 10.296 4.708" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M16.31 28.237H43.5v9.043H16.24c-6.618 0-11.735-4.41-11.735-10.173v-7.912m5.086 16.163v-2.26m3.391 3.617v-4.522m3.391 5.087v-2.26m3.391 2.26v-4.522m3.39 4.522v-2.26m3.392 2.26v-4.522m3.39 4.522v-2.26m6.782 2.26v-2.26m-3.39 2.26v-4.522m6.781 4.522v-4.522m-11.868-4.634v-9.833" stroke-width="1.5"/></svg>`
        this._container.appendChild(this._button);

        this._active = false;
        this._points = [];
        this._tempPoint = null;
        this._distancePopup = null;
        this._ids = {
            lineSource: "measure-line-src",
            pointsSource: "measure-points-src",
            lineLayer: "measure-line-lyr",
            pointsLayer: "measure-points-lyr",
        };

        this._button.addEventListener("click", () => {
            if (this._active) {
                this._deactivate();
            } else {
                this._activate();
            }
        });
        return this._container;
    }
    onRemove() {
        this._deactivate();
        this._container.parentNode &&
            this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    _haversineKm(a, b) {
        const toRad = (d) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b[1] - a[1]);
        const dLon = toRad(b[0] - a[0]);
        const lat1 = toRad(a[1]);
        const lat2 = toRad(b[1]);
        const h =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    _totalDistanceKm(coords) {
        let d = 0;
        for (let i = 1; i < coords.length; i++)
            d += this._haversineKm(coords[i - 1], coords[i]);
        return d;
    }

    _updateSources() {
        const lineCoords = [...this._points];
        if (this._tempPoint) lineCoords.push(this._tempPoint);
        const line = {
            type: "Feature",
            geometry: { type: "LineString", coordinates: lineCoords },
        };
        const pts = {
            type: "FeatureCollection",
            features: this._points.map((c) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: c },
            })),
        };
        if (this._map.getSource(this._ids.lineSource))
            this._map.getSource(this._ids.lineSource).setData(line);
        if (this._map.getSource(this._ids.pointsSource))
            this._map.getSource(this._ids.pointsSource).setData(pts);
    }

    _updatePopup(lngLat) {
        const coords = [...this._points];
        if (this._tempPoint) coords.push(this._tempPoint);
        if (coords.length < 2) {
            if (this._distancePopup) this._distancePopup.remove();
            this._distancePopup = null;
            return;
        }
        const km = this._totalDistanceKm(coords);
        const text = `${km.toFixed(2)} km`;
        if (!this._distancePopup) {
            this._distancePopup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: "measure-popup",
            });
            this._distancePopup.setLngLat(lngLat).setHTML(text).addTo(this._map);
        } else {
            this._distancePopup.setLngLat(lngLat).setHTML(text);
        }
    }

    _activate() {
        this._active = true;
        this._button.style.backgroundColor = "#11182710";
        this._points = [];
        this._tempPoint = null;
        this._distancePopup && this._distancePopup.remove();
        this._distancePopup = null;
        this._map.getCanvas().style.cursor = "crosshair";
        this._map.doubleClickZoom && this._map.doubleClickZoom.disable();

        if (!this._map.getSource(this._ids.lineSource)) {
            this._map.addSource(this._ids.lineSource, {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: [] },
                },
            });
        }
        if (!this._map.getSource(this._ids.pointsSource)) {
            this._map.addSource(this._ids.pointsSource, {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });
        }
        if (!this._map.getLayer(this._ids.lineLayer)) {
            this._map.addLayer({
                id: this._ids.lineLayer,
                type: "line",
                source: this._ids.lineSource,
                paint: { "line-color": "#10b981", "line-width": 3 },
            });
        }
        if (!this._map.getLayer(this._ids.pointsLayer)) {
            this._map.addLayer({
                id: this._ids.pointsLayer,
                type: "circle",
                source: this._ids.pointsSource,
                paint: {
                    "circle-radius": 4,
                    "circle-color": "#10b981",
                    "circle-stroke-color": "#064e3b",
                    "circle-stroke-width": 1,
                },
            });
        }

        this._onClick = (e) => {
            this._points.push([e.lngLat.lng, e.lngLat.lat]);
            this._updateSources();
            this._updatePopup(e.lngLat);
        };
        this._onMove = (e) => {
            if (!this._active || this._points.length === 0) return;
            this._tempPoint = [e.lngLat.lng, e.lngLat.lat];
            this._updateSources();
            this._updatePopup(e.lngLat);
        };
        this._onDbl = () => this._deactivate();
        this._onKey = (ev) => {
            if (ev.key === "Escape") this._deactivate();
        };

        this._map.on("click", this._onClick);
        this._map.on("mousemove", this._onMove);
        this._map.on("dblclick", this._onDbl);
        window.addEventListener("keydown", this._onKey, { once: false });
    }

    _deactivate() {
        if (!this._active) return;
        this._active = false;
        this._button.style.backgroundColor = "";
        this._map.getCanvas().style.cursor = "";
        this._map.doubleClickZoom && this._map.doubleClickZoom.enable();
        this._map.off("click", this._onClick);
        this._map.off("mousemove", this._onMove);
        this._map.off("dblclick", this._onDbl);
        window.removeEventListener("keydown", this._onKey);
        this._distancePopup && this._distancePopup.remove();
        this._distancePopup = null;
        this._points = [];
        this._tempPoint = null;
        if (this._map.getLayer(this._ids.lineLayer))
            this._map.removeLayer(this._ids.lineLayer);
        if (this._map.getLayer(this._ids.pointsLayer))
            this._map.removeLayer(this._ids.pointsLayer);
        if (this._map.getSource(this._ids.lineSource))
            this._map.removeSource(this._ids.lineSource);
        if (this._map.getSource(this._ids.pointsSource))
            this._map.removeSource(this._ids.pointsSource);
    }
}

// ============================================================================
// Reset North Control
// ============================================================================
export class ResetNorthControl {
    onAdd(m) {
        this._map = m;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group my-shift-up reset-north-container"; // Added "reset-north-container"
        
        // ORIGINAL: PC sizes preserved
        this._container.style.height = "30px";
        this._container.style.width = "30px";
        
        const button = document.createElement("button");
        button.type = "button";
        button.className = "maplibregl-ctrl-icon";
        button.setAttribute("aria-label", "Reset view");
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.style.padding = "0";
        button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><g fill="none"><path fill="currentColor" d="m6.2 20.634l5.668-10.393a.15.15 0 0 1 .264 0L17.8 20.634a.15.15 0 0 1-.187.211l-4.536-1.814a.15.15 0 0 1-.092-.113l-.837-4.606c-.03-.164-.266-.164-.296 0l-.837 4.606a.15.15 0 0 1-.092.113l-4.536 1.814a.15.15 0 0 1-.187-.21"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 9V3.12a.05.05 0 0 1 .085-.035l5.83 5.83A.05.05 0 0 0 15 8.879V3"/></g></svg>`;

        button.addEventListener("click", () => {
            this._map.rotateTo(0, { duration: 400, essential: false });
        });

        this._container.appendChild(button);
        return this._container;
    }
    onRemove() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._map = undefined;
    }
}

// ============================================================================
// Zoom Control
// ============================================================================
export class ZoomControl {
  onAdd(m) {
    this._map = m;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group my-shift-up zoom-control-container"; // Added class
    
    // ORIGINAL: PC sizes preserved
    this._container.style.height = "70px";
    this._container.style.width = "30px";
    this._container.style.marginBottom="-20px";

    const zoomIn = document.createElement("button");
    zoomIn.type = "button";
    zoomIn.className = "maplibregl-ctrl-icon";
    zoomIn.setAttribute("aria-label", "Zoom in");
    zoomIn.innerHTML = "+";
    zoomIn.style.fontSize = "18px";
    zoomIn.style.fontWeight = "700";
    zoomIn.style.display = "flex";
    zoomIn.style.alignItems = "center";
    zoomIn.style.justifyContent = "center";
    zoomIn.style.height = "35px";

    const zoomOut = document.createElement("button");
    zoomOut.type = "button";
    zoomOut.className = "maplibregl-ctrl-icon";
    zoomOut.setAttribute("aria-label", "Zoom out");
    zoomOut.innerHTML = "−";
    zoomOut.style.fontSize = "18px";
    zoomOut.style.fontWeight = "700";
    zoomOut.style.display = "flex";
    zoomOut.style.alignItems = "center";
    zoomOut.style.justifyContent = "center";

    zoomIn.addEventListener("click", () => {
      this._map.zoomIn({ duration: 250 });
    });

    zoomOut.addEventListener("click", () => {
      this._map.zoomOut({ duration: 250 });
    });

    this._container.addEventListener("mousedown", (e) => e.stopPropagation());
    this._container.addEventListener("dblclick", (e) => e.stopPropagation());
    this._container.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });

    this._container.appendChild(zoomIn);
    this._container.appendChild(zoomOut);

    return this._container;
  }

  onRemove() {
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
  }
}

export class CompactAttributionControl {
  constructor() {
    this._map = null;
    this._container = null;
    this._open = false;
  }

  onAdd(map) {
    this._map = map;

    const container = document.createElement("div");
    container.className = "maplibregl-ctrl compact-attribution-container";
    container.style.position = "relative";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";

    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = "i";
    button.setAttribute("aria-label", "Attribution");

    button.style.width = "20px";
    button.style.height = "20px";
    button.style.borderRadius = "9999px";
    button.style.border = "1px solid rgba(0,0,0,0.25)";
    button.style.background = "#fff";   
    button.style.color = "#111";        
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.fontWeight = "800";
    button.style.fontSize = "11px";
    button.style.cursor = "pointer";
    button.style.userSelect = "none";

    const panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.right = "38px"; 
    panel.style.bottom = "0px";
    panel.style.display = "none";

    panel.style.background = "#fff";
    panel.style.color = "#111";
    panel.style.padding = "6px 10px";
    panel.style.borderRadius = "6px";
    panel.style.fontSize = "12px";
    panel.style.lineHeight = "1.2";
    panel.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
    panel.style.zIndex = "9999";

    panel.style.whiteSpace = "nowrap";
    panel.style.overflowY = "hidden";
    panel.style.webkitOverflowScrolling = "touch";

    const updateAttribution = () => {
      const attribHTML =
        Object.values(map.getStyle()?.sources || {})
          .map((s) => s.attribution)
          .filter(Boolean)
          .join(" | ") || "Attribution";

      panel.innerHTML = attribHTML;

      panel.querySelectorAll("a").forEach((a) => {
        a.style.color = "#111";
        a.style.textDecoration = "underline";
      });
    };

    updateAttribution();

    button.onclick = (e) => {
      e.stopPropagation();
      this._open = !this._open;
      panel.style.display = this._open ? "block" : "none";
    };

    map.on("click", () => {
      this._open = false;
      panel.style.display = "none";
    });

    map.on("styledata", updateAttribution);

    container.appendChild(button);
    container.appendChild(panel);

    this._container = container;
    return container;
  }

  onRemove() {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = null;
  }
}