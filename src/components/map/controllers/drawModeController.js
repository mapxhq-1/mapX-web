import highlighterIcon from "../../../assets/icons/highlighter_icon.png";
import eraserIcon from "../../../assets/icons/eraser_icon.png";
import textIcon from "../../../assets/icons/text_icon.png";

export function createDrawModeController(options) {
    const {
        mapRef,
        cursorManager,
        controllers,
        textToolbar,
        noteManager,
        imageManager,
        hyperlinkManager,
        finalFeaturesRef,
        onSelectClick
    } = options;

    const { freehand, highlight, line, polygon, circle, arrow } = controllers;
    let activeModeCleanup = null;

    // --- Helper: Safely set the cursor ---
    const setCanvasCursor = (cursorType) => {
        const map = mapRef.current;
        if (!map) return;
        const canvas = map.getCanvas();
        if (canvas) {
            // Force the cursor style directly
            canvas.style.cursor = cursorType;
        }
    };

    const deactivateAllControllers = () => {
        freehand?.setActive(false);
        highlight?.setActive(false);
        line?.setActive(false);
        polygon?.setActive(false);
        circle?.setActive(false);
        arrow?.setActive(false);
    };

    const cleanup = () => {
        // 1. Hide Global Cursor UI (Highlighter/Eraser)
        if (cursorManager && typeof cursorManager.hide === 'function') {
            cursorManager.hide();
        }

        // 2. Hide Toolbars
        try { textToolbar?.hide(); } catch (_) {}

        // 3. Deactivate Managers
        try { imageManager?.deactivate?.(); } catch (_) {}
        try { hyperlinkManager?.deactivate?.(); } catch (_) {}
        
        // IMPORTANT: We deactivate the NoteManager here to reset its state
        try { noteManager?.deactivate?.(); } catch (_) {}

        // 4. Run specific cleanup (listeners)
        if (activeModeCleanup) {
            activeModeCleanup();
            activeModeCleanup = null;
        }

        // 5. Reset Cursor to default (let MapLibre take over)
        setCanvasCursor("");
        
        // 6. Remove generic listeners
        try { mapRef.current?.off("click", onSelectClick); } catch (_) {}
    };

    const setMode = (mode) => {
        console.log(`[DrawController] Switching mode to: "${mode}"`);
        
        // Step 1: Clean up previous mode
        cleanup();
        deactivateAllControllers();

        const map = mapRef.current;
        if (!map) {
            console.error("[DrawController] Map reference is missing!");
            return;
        }

        switch (mode) {
            case "pencil":
                freehand?.setActive(true);
                setCanvasCursor("crosshair");
                break;

            case "highlight":
                highlight?.setActive(true);
                cursorManager?.show(highlighterIcon, 28);
                setCanvasCursor("none"); 
                break;

            case "line":
                line?.setActive(true);
                setCanvasCursor("crosshair");
                break;

            case "polygon":
                polygon?.setActive(true);
                setCanvasCursor("crosshair");
                break;

            case "circle":
                circle?.setActive(true);
                setCanvasCursor("crosshair");
                break;

            case "arrow":
                arrow?.setActive(true);
                setCanvasCursor("crosshair");
                break;

            // ===============================================
            // FIXED NOTE MODE
            // ===============================================
            case "note":
                if (noteManager) {
                    console.log("[DrawController] Activating NoteManager...");
                    noteManager.activate();
                    
                    // FORCE cursor to none here as well. 
                    // This creates a "belt and suspenders" approach to ensure 
                    // the native cursor is hidden so the Note SVG can show.
                    setCanvasCursor("none");
                } else {
                    console.error("[DrawController] NoteManager is undefined! Check MapView.js setup.");
                }
                break;

            case "image":
                imageManager?.activate();
                setCanvasCursor("crosshair");
                break;

            case "hyperlink":
                hyperlinkManager?.activate();
                setCanvasCursor("alias");
                break;

            case "text": {
                cursorManager?.show(textIcon, 24);
                setCanvasCursor("none");

                const textClickHandler = (e) => {
                    textToolbar.show({ lng: e.lngLat.lng, lat: e.lngLat.lat });
                };
                map.on("click", textClickHandler);
                
                activeModeCleanup = () => {
                    map.off("click", textClickHandler);
                };
                break;
            }

            case "hand": {
                map.dragPan.enable();
                map.dragRotate.enable();
                setCanvasCursor("grab");

                const onMouseDown = () => setCanvasCursor("grabbing");
                const onMouseUp = () => setCanvasCursor("grab");

                map.on("mousedown", onMouseDown);
                map.on("mouseup", onMouseUp);

                activeModeCleanup = () => {
                    map.off("mousedown", onMouseDown);
                    map.off("mouseup", onMouseUp);
                };
                break;
            }

            case "eraser": {
                map.boxZoom.disable();
                map.dragPan.disable();
                
                cursorManager?.show(eraserIcon, 36);
                setCanvasCursor("none");

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
                        const idsToRemove = toErase.map(f => f.properties.id);
                        finalFeaturesRef.current = finalFeaturesRef.current.filter(f => !idsToRemove.includes(f.properties?.id));
                        
                        map.getSource("draw-final-src")?.setData({ 
                            type: "FeatureCollection", 
                            features: finalFeaturesRef.current 
                        });
                    }
                };
                
                map.on("mousemove", eraseOnHover);
                
                activeModeCleanup = () => {
                    map.off("mousemove", eraseOnHover);
                    erasedIds.clear();
                    map.boxZoom.enable();
                    map.dragPan.enable();
                };
                break;
            }

            case "select":
                const onMouseDown = () => setCanvasCursor("grabbing");
                const onMouseUp = () => setCanvasCursor("grab");
                map.on("mousedown", onMouseDown);
                map.on("mouseup", onMouseUp);
                break;

            default:
                console.warn(`[DrawController] Unknown mode requested: ${mode}`);
                break;
        }

        try { window.mapxOnModeChanged?.(mode); } catch (_) {}
    };

    // Ensure this global function is available immediately
    if (typeof window !== 'undefined') {
        window.mapxDrawSetMode = setMode;
    }

    return { setMode };
}