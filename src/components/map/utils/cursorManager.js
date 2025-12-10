export function createCursorManager(mapRef) {
    let cursorEl = null;
    let moveHandler = null;

    const show = (imgSrc, sizePx = 30) => {
        try {
            if (!mapRef.current) return;
            const host = mapRef.current.getContainer();
            
            if (!cursorEl) {
                cursorEl = document.createElement("div");
                cursorEl.style.cssText = "position:absolute;pointer-events:none;z-index:24;transform:translate(-50%,-50%);line-height:1";
                const img = document.createElement("img");
                img.draggable = false;
                cursorEl.appendChild(img);
                host.appendChild(cursorEl);
            }
            
            const imgEl = cursorEl.querySelector("img");
            imgEl.src = imgSrc;
            imgEl.style.width = `${sizePx}px`;
            imgEl.style.height = `${sizePx}px`;
            imgEl.style.objectFit = "contain";
            cursorEl.style.display = "block";
            
            mapRef.current.getCanvas().style.cursor = "none";
            
            if (!moveHandler) {
                moveHandler = (e) => {
                    if (!cursorEl) return;
                    cursorEl.style.left = `${e.point.x}px`;
                    cursorEl.style.top = `${e.point.y}px`;
                };
                mapRef.current.on("mousemove", moveHandler);
            }
        } catch (_) {}
    };

    const hide = () => {
        try {
            if (!mapRef.current) return;
            if (moveHandler) {
                mapRef.current.off("mousemove", moveHandler);
                moveHandler = null;
            }
            if (cursorEl) cursorEl.style.display = "none";
            mapRef.current.getCanvas().style.cursor = "";
        } catch (_) {}
    };

    const cleanup = () => {
        hide();
        if (cursorEl?.parentNode) {
            cursorEl.parentNode.removeChild(cursorEl);
        }
        cursorEl = null;
    };

    return { show, hide, cleanup };
}