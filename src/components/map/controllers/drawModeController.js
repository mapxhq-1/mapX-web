import highlighterIcon from "../../../assets/icons/highlighter_icon.png";
import eraserIcon from "../../../assets/icons/eraser_icon.png";
import textIcon from "../../../assets/icons/text_icon.png";

export function createDrawModeController(options) {
    const {
        mapRef,
        cursorManager,
        controllers,
        textToolbar,
        selectionOverlay,
        noteManager,
        imageManager,
        hyperlinkManager,
        finalFeaturesRef,
        selectedFeatureIdRef,
        onSelectClick
    } = options;

    const { freehand, highlight, line, polygon, circle, arrow } = controllers;

    const deactivateAll = () => {
        freehand?.setActive(false);
        highlight?.setActive(false);
        line?.setActive(false);
        polygon?.setActive(false);
        circle?.setActive(false);
        arrow?.setActive(false);
    };

    const cleanup = () => {
        cursorManager.hide();
        try { imageManager?.deactivate?.(); } catch (_) {}
        try { hyperlinkManager?.deactivate?.(); } catch (_) {}
        try { noteManager?.deactivate?.(); } catch (_) {}
        try { window.mapxEraserCleanup?.(); } catch (_) {}
        try { window.mapxHandCleanup?.(); } catch (_) {}
        try { textToolbar.hide(); } catch (_) {}
        try { mapRef.current?.off("click", onSelectClick); } catch (_) {}
        // ✅ CORRECT - Full null check
try { 
    const canvas = mapRef.current && mapRef.current.getCanvas();
    if (canvas && canvas.style) {
        canvas.style.cursor = ""; 
    }
} catch (_) {}
    };

    const setMode = (mode) => {
        cleanup();
        deactivateAll();

        const map = mapRef.current;
        if (!map) return;

        switch (mode) {
            case "pencil":
                freehand?.setActive(true);
                break;

            case "highlight":
                highlight?.setActive(true);
                cursorManager.show(highlighterIcon, 28);
                break;

            case "line":
                line?.setActive(true);
                break;

            case "polygon":
                polygon?.setActive(true);
                break;

            case "circle":
                circle?.setActive(true);
                break;

            case "arrow":
                arrow?.setActive(true);
                break;

            case "note":
                noteManager?.activate();
                break;

            case "image":
                imageManager?.activate();
                break;

            case "hyperlink":
                hyperlinkManager?.activate();
                break;

            case "text":
                cursorManager.show(textIcon, 24);
                const textClickHandler = (e) => {
                    textToolbar.show({ lng: e.lngLat.lng, lat: e.lngLat.lat });
                };
                map.on("click", textClickHandler);
                window.mapxTextCleanup = () => map.off("click", textClickHandler);
                break;

            case "hand":
                map.dragPan.enable();
                map.dragRotate.enable();
                map.getCanvas().style.cursor = "grab";
                
                const onMouseDown = () => map.getCanvas().style.cursor = "grabbing";
                const onMouseUp = () => map.getCanvas().style.cursor = "grab";
                
                map.on("mousedown", onMouseDown);
                map.on("mouseup", onMouseUp);
                
                window.mapxHandCleanup = () => {
                    map.off("mousedown", onMouseDown);
                    map.off("mouseup", onMouseUp);
                    map.getCanvas().style.cursor = "";
                };
                break;

            case "eraser":
                map.boxZoom.disable();
                map.dragPan.disable();
                cursorManager.show(eraserIcon, 36);
                
                const erasedIds = new Set();
                const eraseOnHover = (e) => {
                    const features = map.queryRenderedFeatures(e.point, { layers: ["draw-final-line"] });
                    const toErase = features.filter(f => 
                        f.properties && 
                        ['freehand', 'highlight', 'line', 'arrow', 'polygon', 'circle'].includes(f.properties.tool) &&
                        !erasedIds.has(f.properties.id)
                    );
                    
                    if (toErase.length > 0) {
                        toErase.forEach(f => erasedIds.add(f.properties.id));
                        const ids = toErase.map(f => f.properties.id);
                        finalFeaturesRef.current = finalFeaturesRef.current.filter(f => !ids.includes(f.properties?.id));
                        
                        map.getSource("draw-final-src")?.setData({ 
                            type: "FeatureCollection", 
                            features: finalFeaturesRef.current 
                        });
                    }
                };
                
                map.on("mousemove", eraseOnHover);
                window.mapxEraserCleanup = () => {
                    map.off("mousemove", eraseOnHover);
                    erasedIds.clear();
                    map.boxZoom.enable();
                    map.dragPan.enable();
                    cursorManager.hide();
                };
                break;

            case "select":
                map.on("click", onSelectClick);
                break;

            default:
                break;
        }

        try { window.mapxOnModeChanged?.(mode); } catch (_) {}
    };

    return { setMode };
}