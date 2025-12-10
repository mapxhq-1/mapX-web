import saveIcon from "../../../assets/icons/save_icon.png";
import deleteIcon from "../../../assets/icons/delete_icon.png";
import cancelIcon from "../../../assets/icons/cancel_icon.png";

export function createSelectionOverlay(mapRef, options) {
    const { finalFeaturesRef, selectedFeatureIdRef, onSave, onDelete } = options;
    
    let overlayEl = null;
    let lngLatRef = null;

    const createButton = (title, imgSrc, onClick) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = title;
        btn.className = "rounded-lg p-2 bg-white/2 backdrop-blur-sm shadow hover:bg-white/30 transition-all duration-300 inline-flex items-center justify-center";
        
        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = title;
        img.style.cssText = "width:20px;height:20px;object-fit:contain";
        btn.appendChild(img);
        btn.style.cursor = "pointer";
        btn.addEventListener("click", (ev) => { ev.stopPropagation(); onClick?.(); });
        return btn;
    };

    const build = () => {
        if (overlayEl) return;
        
        const host = mapRef.current.getContainer();
        overlayEl = document.createElement("div");
        overlayEl.style.cssText = "position:absolute;transform:translate(-50%,-100%);display:none;z-index:25;pointer-events:auto;white-space:nowrap";
        overlayEl.className = "rounded-lg bg-white/2 backdrop-blur-sm shadow p-2 flex items-center gap-2";

        overlayEl.appendChild(createButton("Delete", deleteIcon, async () => {
            await onDelete?.();
            hide();
        }));
        overlayEl.appendChild(createButton("Save", saveIcon, async () => {
            await onSave?.();
            hide();
        }));
        overlayEl.appendChild(createButton("Cancel", cancelIcon, () => {
            hide();
            selectedFeatureIdRef.current = null;
            try {
                mapRef.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]);
                mapRef.current.setFilter("draw-final-fill-selected", ["==", ["get", "id"], "__none__"]);
            } catch (_) {}
        }));

        ["mousedown", "dblclick", "wheel"].forEach((evt) => {
            overlayEl.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
        });

        host.appendChild(overlayEl);
    };

    const position = (lngLat) => {
        if (!overlayEl || !lngLat) return;
        const p = mapRef.current.project(lngLat);
        overlayEl.style.left = `${p.x}px`;
        overlayEl.style.top = `${p.y - 10}px`;
    };

    const show = (lngLat) => {
        build();
        lngLatRef = lngLat;
        position(lngLat);
        overlayEl.style.display = "flex";
    };

    const hide = () => {
        if (overlayEl) overlayEl.style.display = "none";
        lngLatRef = null;
    };

    const updatePosition = () => {
        if (lngLatRef) position(lngLatRef);
    };

    return { show, hide, updatePosition, build };
}