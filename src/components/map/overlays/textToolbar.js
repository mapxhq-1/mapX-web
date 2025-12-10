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
        toolbarEl.style.cssText = "position:absolute;transform:translate(-50%,-100%);display:none;z-index:26;pointer-events:auto";
        toolbarEl.className = "rounded-lg bg-white/1 border border-white/30 backdrop-blur-sm shadow p-3 flex flex-col gap-3";
        toolbarEl.style.maxWidth = "400px";

        // Text input container
        const textContainer = document.createElement("div");
        textContainer.style.cssText = "display:flex;align-items:center;gap:8px;position:relative";

        const txt = document.createElement("input");
        txt.type = "text";
        txt.placeholder = "Enter text...";
        txt.style.cssText = "width:300px;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05)";
        txt.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") { ev.preventDefault(); handleSave(); }
            if (ev.key === "Escape") { ev.preventDefault(); hide(); }
        });

        const cancelBtn = document.createElement("button");
        cancelBtn.innerHTML = "&#10005;";
        cancelBtn.className = "rounded-full w-6 h-6 flex items-center justify-center bg-white/40 hover:bg-white/60";
        cancelBtn.style.cssText = "position:absolute;right:8px;top:50%;transform:translateY(-50%)";
        cancelBtn.addEventListener("click", hide);

        // Controls row
        const controlsRow = document.createElement("div");
        controlsRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px";

        const color = document.createElement("input");
        color.type = "color";
        color.value = "#ffffff";
        color.style.cssText = "width:32px;height:32px;border-radius:6px";

        const size = document.createElement("input");
        size.type = "number";
        size.min = "8";
        size.max = "72";
        size.value = "16";
        size.style.cssText = "width:60px;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.3)";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className = "rounded-lg px-4 py-2 bg-[#007cba] text-white hover:bg-[#005a8b] transition-all";
        saveBtn.addEventListener("click", handleSave);

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "rounded-lg px-4 py-2 bg-[#ef4444] text-white hover:bg-[#b91c1c] transition-all";
        delBtn.addEventListener("click", handleDelete);

        async function handleSave() {
            const vText = txt.value?.trim();
            if (!vText) return;
            const vSize = Math.max(8, Math.min(72, Number(size.value) || 16));
            const mode = toolbarEl.getAttribute("data-mode") || "create";
            
            if (mode === "edit" && featureIdRef) {
                await onSaveEdit?.(featureIdRef, vText, vSize, color.value);
            } else {
                await onSaveNew?.(lngLatRef, vText, vSize, color.value);
            }
            hide();
        }

        async function handleDelete() {
            await onDelete?.(featureIdRef);
            hide();
        }

        textContainer.append(txt, cancelBtn);
        controlsRow.append(color, size, saveBtn, delBtn);
        toolbarEl.append(textContainer, controlsRow);

        ["mousedown", "dblclick", "wheel"].forEach((evt) => {
            toolbarEl.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
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
        disableMapControls();
        
        setTimeout(() => {
            const txt = toolbarEl.querySelector('input[type="text"]');
            txt?.focus();
        }, 50);
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
            mapRef.current.boxZoom.disable();
            mapRef.current.dragPan.disable();
            mapRef.current.dragRotate.disable();
            mapRef.current.keyboard.disable();
        } catch (_) {}
    };

    const enableMapControls = () => {
        try {
            mapRef.current.boxZoom.enable();
            mapRef.current.dragPan.enable();
            mapRef.current.dragRotate.enable();
            mapRef.current.keyboard.enable();
        } catch (_) {}
    };

    const updatePosition = () => {
        if (lngLatRef) position(lngLatRef);
    };

    return { show, showEdit, hide, updatePosition };
}