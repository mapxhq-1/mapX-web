import { sanitizeText } from "../utils/textToolHelpers";

export function createTextToolbar(mapRef, options) {
    const { finalFeaturesRef, onSaveNew, onSaveEdit, onDelete } = options;
    
    let toolbarEl = null;
    let lngLatRef = null;
    let featureIdRef = null;

    const build = () => {
        if (toolbarEl) return;
        
        const host = mapRef.current.getContainer();
        toolbarEl = document.createElement("div");
        toolbarEl.style.cssText = "position:absolute;transform:translate(-50%,-100%);display:none;z-index:3000;pointer-events:auto"; 
        toolbarEl.className = "rounded-lg bg-white/10 border border-white/30 backdrop-blur-md shadow-xl p-3 flex flex-col gap-3";
        toolbarEl.style.maxWidth = "400px";

        // Text input container
        const textContainer = document.createElement("div");
        textContainer.style.cssText = "display:flex;align-items:center;gap:8px;position:relative";

        const txt = document.createElement("input");
        txt.type = "text";
        txt.placeholder = "Enter text...";
        txt.style.cssText = "width:240px;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(0,0,0,0.5);color:white;outline:none;";
        txt.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") { 
                ev.preventDefault(); 
                ev.stopPropagation(); 
                handleSave(ev); 
            }
            if (ev.key === "Escape") { 
                ev.preventDefault(); 
                ev.stopPropagation();
                hide(); 
            }
        });

        const cancelBtn = document.createElement("button");
        cancelBtn.innerHTML = "&#10005;";
        cancelBtn.className = "rounded-full w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white cursor-pointer";
        cancelBtn.style.cssText = "position:absolute;right:0px;top:50%;transform:translateY(-50%)";
        cancelBtn.addEventListener("click", (e) => {
             e.preventDefault();
             e.stopPropagation(); 
             hide();
        });

        // Controls row
        const controlsRow = document.createElement("div");
        controlsRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:4px";

        const color = document.createElement("input");
        color.type = "color";
        color.value = "#ffffff";
        color.style.cssText = "width:32px;height:32px;border-radius:6px;border:none;cursor:pointer";
        color.addEventListener("click", e => e.stopPropagation());

        const size = document.createElement("input");
        size.type = "number";
        size.min = "8";
        size.max = "72";
        size.value = "16";
        size.style.cssText = "width:60px;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(0,0,0,0.5);color:white";
        size.addEventListener("click", e => e.stopPropagation());

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className = "rounded-lg px-4 py-2 bg-[#007cba] text-white hover:bg-[#005a8b] transition-all font-medium cursor-pointer";
        saveBtn.addEventListener("click", handleSave);

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "rounded-lg px-4 py-2 bg-[#ef4444] text-white hover:bg-[#b91c1c] transition-all font-medium cursor-pointer";
        delBtn.addEventListener("click", handleDelete);

        // --- HANDLERS ---
        async function handleSave(e) {
            if(e) { e.preventDefault(); e.stopPropagation(); }

            const vText = txt.value?.trim();
            if (!vText) return;
            
            const vSize = Math.max(8, Math.min(72, Number(size.value) || 16));
            const mode = toolbarEl.getAttribute("data-mode") || "create";
            
            try {
                // Fix: Check for null/undefined specifically, allowing ID '0'
                if (mode === "edit" && featureIdRef !== null && featureIdRef !== undefined) {
                    await onSaveEdit?.(featureIdRef, vText, vSize, color.value);
                } else {
                    await onSaveNew?.(lngLatRef, vText, vSize, color.value);
                }
            } catch (err) {
                console.error("Error saving text:", err);
            }
            hide();
        }

        async function handleDelete(e) {
            if(e) { e.preventDefault(); e.stopPropagation(); }
            if (featureIdRef !== null && featureIdRef !== undefined) {
                try {
                    await onDelete?.(featureIdRef);
                } catch (err) { console.error(err); }
            }
            hide();
        }

        textContainer.append(txt, cancelBtn);
        controlsRow.append(color, size, saveBtn, delBtn);
        toolbarEl.append(textContainer, controlsRow);

        // Stop propagation for all relevant events
        ["mousedown", "mouseup", "click", "dblclick", "wheel", "touchstart", "touchend"].forEach((evt) => {
            toolbarEl.addEventListener(evt, (e) => e.stopPropagation(), { passive: false });
        });

        host.appendChild(toolbarEl);
    };

    const position = (lngLat) => {
        if (!toolbarEl || !lngLat) return;
        const p = mapRef.current.project(lngLat);
        toolbarEl.style.left = `${p.x}px`;
        toolbarEl.style.top = `${p.y - 10}px`;
    };

    const show = (lngLat) => {
        build();
        lngLatRef = lngLat;
        featureIdRef = null;
        position(lngLat);
        toolbarEl.style.display = "flex";
        toolbarEl.setAttribute("data-mode", "create");
        
        const txt = toolbarEl.querySelector('input[type="text"]');
        if(txt) { txt.value = ""; txt.focus(); }
        
        disableMapControls();
    };

    const showEdit = (feature, lngLat) => {
        build();
        lngLatRef = lngLat;
        featureIdRef = feature?.properties?.id;
        position(lngLat);
        toolbarEl.style.display = "flex";
        toolbarEl.setAttribute("data-mode", "edit");
        
        const txt = toolbarEl.querySelector('input[type="text"]');
        const color = toolbarEl.querySelector('input[type="color"]');
        const size = toolbarEl.querySelector('input[type="number"]');
        
        if (txt) txt.value = feature?.properties?.text || '';
        if (color) color.value = feature?.properties?.color || '#ffffff';
        if (size) size.value = String(feature?.properties?.fontSize || 16);
        
        disableMapControls();
    };

    const hide = () => {
        if (toolbarEl) toolbarEl.style.display = "none";
        lngLatRef = null;
        enableMapControls();
    };

    const disableMapControls = () => {
        try {
            const m = mapRef.current;
            m.boxZoom.disable(); m.dragPan.disable(); m.dragRotate.disable();
            m.keyboard.disable(); m.doubleClickZoom.disable(); 
        } catch (_) {}
    };

    const enableMapControls = () => {
        try {
            const m = mapRef.current;
            m.boxZoom.enable(); m.dragPan.enable(); m.dragRotate.enable();
            m.keyboard.enable(); m.doubleClickZoom.enable();
        } catch (_) {}
    };

    const updatePosition = () => {
        if (lngLatRef) position(lngLatRef);
    };

    return { show, showEdit, hide, updatePosition };
}

export function createShapePopup(mapRef, options) {
    const { onSave, onDelete } = options;
    
    let popupEl = null;
    let featureRef = null;

    const build = () => {
        if (popupEl) return;
        
        const host = mapRef.current.getContainer();
        popupEl = document.createElement("div");
        popupEl.style.cssText = "position:absolute;transform:translate(-50%,-100%);display:none;z-index:3000;pointer-events:auto"; 
        popupEl.className = "rounded-lg bg-white/10 border border-white/30 backdrop-blur-md shadow-xl p-3 flex gap-2";
        popupEl.style.maxWidth = "200px";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className = "rounded-lg px-4 py-2 bg-[#007cba] text-white hover:bg-[#005a8b] transition-all font-medium cursor-pointer";
        saveBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (featureRef) {
                await onSave?.(featureRef);
            }
            hide();
        });

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "rounded-lg px-4 py-2 bg-[#ef4444] text-white hover:bg-[#b91c1c] transition-all font-medium cursor-pointer";
        delBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await onDelete?.(featureRef);
            hide();
        });

        function show(feature) {
            if (!popupEl) build();
            featureRef = feature;
            
            // Position at the center of the feature
            let lngLat;
            if (feature.geometry.type === "Point") {
                lngLat = feature.geometry.coordinates;
            } else if (feature.geometry.type === "LineString" && feature.geometry.coordinates.length > 0) {
                const coords = feature.geometry.coordinates;
                lngLat = coords[Math.floor(coords.length / 2)];
            } else if (feature.geometry.type === "Polygon" && feature.geometry.coordinates[0]?.length > 0) {
                const coords = feature.geometry.coordinates[0];
                lngLat = coords[Math.floor(coords.length / 2)];
            } else {
                lngLat = [0, 0]; // Fallback
            }
            
            const pixel = mapRef.current.project(lngLat);
            popupEl.style.left = `${pixel.x}px`;
            popupEl.style.top = `${pixel.y}px`;
            popupEl.style.display = "block";
        }

        function hide() {
            if (popupEl) popupEl.style.display = "none";
            featureRef = null;
        }

        function updatePosition() {
            if (!popupEl || popupEl.style.display === "none" || !featureRef) return;
            // Recalculate position if needed
            show(featureRef);
        }

        // Append elements
        popupEl.appendChild(saveBtn);
        popupEl.appendChild(delBtn);
        host.appendChild(popupEl);

        return { show, hide, updatePosition };
    };

    return build();
}