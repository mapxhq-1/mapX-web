import highlighterIcon from "../../../assets/icons/highlighter_icon.png";
import eraserIcon from "../../../assets/icons/eraser_icon.png";
import textIcon from "../../../assets/icons/text_icon.png";

import hlYellow from '../../../assets/Highlighter/yellow.png';
import hlGreen from '../../../assets/Highlighter/green.png';
import hlBlue from '../../../assets/Highlighter/blue.png';
import hlPink from '../../../assets/Highlighter/pink.png';

const HIGHLIGHTER_ICONS = {
  "#FFFF00": hlYellow,
  "#00FF00": hlGreen,
  "#00FFFF": hlBlue,
  "#FF00FF": hlPink,
};
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

    // --- Helper 1: set cursor ---
    const setCanvasCursor = (cursorType) => {
        const map = mapRef.current;
        if (!map) return;
        map.getCanvas().style.cursor = cursorType;
    };

    // --- Helper 2: Toggle Map Pan/Zoom ---
    const toggleMapInteractions = (enable) => {
        const map = mapRef.current;
        if (!map) return;
        if (enable) {
            map.dragPan.enable();
            map.touchZoomRotate.enable();
        } else {
            map.dragPan.disable();
            map.touchZoomRotate.disable();
        }
    };

    // --- Helper 3: Bridge Touch Events to Mouse Events ---
    const handleTouchDraw = (e) => {
        if(e.cancelable) e.preventDefault(); // Stop scrolling

        // FIX: On 'touchend', e.touches is empty! We must use e.changedTouches.
        const touch = e.touches[0] || e.changedTouches[0];
        
        const canvas = mapRef.current.getCanvas();
        
        // Dispatch a fake mouse event
        const mouseEvent = new MouseEvent(
            e.type === 'touchstart' ? 'mousedown' : 
            e.type === 'touchmove' ? 'mousemove' : 'mouseup', 
            {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
                buttons: 1 // Important: Tells the tool the mouse button is "held down"
            }
        );
        canvas.dispatchEvent(mouseEvent);
    };

    const cleanup = () => {
        // 1. Re-enable map interactions (Safety check)
        toggleMapInteractions(true);

        // 2. Run specific mode cleanup
        if (activeModeCleanup) {
            activeModeCleanup();
            activeModeCleanup = null;
        }

        // 3. UI Cleanup
        if (cursorManager?.hide) cursorManager.hide();
        try { textToolbar?.hide(); } catch (_) {}
        try { noteManager?.deactivate?.(); } catch (_) {}
        try { imageManager?.deactivate?.(); } catch (_) {}
        try { hyperlinkManager?.deactivate?.(); } catch (_) {}

        // 4. Deactivate all controllers
        Object.values(controllers).forEach(c => c?.setActive(false));

        setCanvasCursor("");
        try { mapRef.current?.off("click", onSelectClick); } catch (_) {}
    };

    const setMode = (mode, color = null) => {
        cleanup(); // Reset everything first

        const map = mapRef.current;
        if (!map) return;

        switch (mode) {
            // --- COMBINED LOGIC FOR PENCIL & HIGHLIGHTER ---
            case "pencil":
            case "highlight":
            case "eraser": // <--- Added Eraser here
                // A. Disable map movement (Crucial for Touch)
                toggleMapInteractions(false);

                // B. Add Touch Listeners (Bridge touch -> mouse)
                const canvas = map.getCanvas();
                canvas.addEventListener('touchstart', handleTouchDraw, { passive: false });
                canvas.addEventListener('touchmove', handleTouchDraw, { passive: false });
                canvas.addEventListener('touchend', handleTouchDraw, { passive: false });

                // Variable to hold specific cleanup for the active tool
                let specificCleanup = null;

                // C. Tool-Specific Setup
                if (mode === 'pencil') {
                    freehand?.setActive(true);
                    setCanvasCursor("crosshair");

                } else if (mode === 'highlight') {
                    if (color && highlight && typeof highlight.setColor === 'function') {
                        highlight.setColor(color);
                    }
                    highlight?.setActive(true);
                    if (map.getLayer("draw-final-line")) {
                        map.moveLayer("draw-final-line");
                    }
                    const activeHighlighterIcon = HIGHLIGHTER_ICONS[color] || highlighterIcon;
                    cursorManager?.show(activeHighlighterIcon, 28);
                    setCanvasCursor("none");

                } else if (mode === 'eraser') {
                    // --- ERASER LOGIC ---
                    map.boxZoom.disable(); // Extra safety
                    cursorManager?.show(eraserIcon, 36);
                    setCanvasCursor("none");

                    const erasedIds = new Set();
                    
                    // The 'mousemove' event will now be fired by your Finger Drag (via handleTouchDraw)
                    const eraseOnHover = (e) => {
                        // Query for lines to erase under the cursor/finger
                        const features = map.queryRenderedFeatures(e.point, { layers: ["draw-final-line"] });
                        const toErase = features.filter(f => 
                            f.properties && 
                            ['freehand', 'highlight', 'line', 'arrow', 'polygon', 'circle'].includes(f.properties.tool) &&
                            !erasedIds.has(f.properties.id)
                        );

                        if (toErase.length > 0) {
                            toErase.forEach(f => erasedIds.add(f.properties.id));
                            const idsToRemove = toErase.map(f => f.properties.id);
                            
                            // Filter out the erased features
                            finalFeaturesRef.current = finalFeaturesRef.current.filter(f => !idsToRemove.includes(f.properties?.id));
                            
                            // Update the map source
                            map.getSource("draw-final-src")?.setData({ 
                                type: "FeatureCollection", 
                                features: finalFeaturesRef.current 
                            });
                        }
                    };
                    
                    map.on("mousemove", eraseOnHover);
                    
                    // Define specific cleanup for eraser
                    specificCleanup = () => {
                        map.off("mousemove", eraseOnHover);
                        erasedIds.clear();
                        map.boxZoom.enable();
                    };
                }

                // D. Master Cleanup (Runs when switching tools)
                activeModeCleanup = () => {
                    toggleMapInteractions(true); // Re-enable map
                    canvas.removeEventListener('touchstart', handleTouchDraw);
                    canvas.removeEventListener('touchmove', handleTouchDraw);
                    canvas.removeEventListener('touchend', handleTouchDraw);
                    
                    // Run the tool-specific cleanup if it exists
                    if (specificCleanup) specificCleanup();
                };
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

            case "note":
                if (noteManager) {
                    noteManager.activate(color);
                    setCanvasCursor("none");
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
                activeModeCleanup = () => map.off("click", textClickHandler);
                break;
            }

            case "select":
                // 1. Set initial cursor
                setCanvasCursor("grab");

                // 2. Define handlers for changing cursor on click/drag
                const onMouseDownSelect = () => setCanvasCursor("grabbing");
                const onMouseUpSelect = () => setCanvasCursor("grab");

                // 3. Attach listeners
                map.on("mousedown", onMouseDownSelect);
                map.on("mouseup", onMouseUpSelect);

                // 4. Define Cleanup (Runs when switching AWAY from select)
                activeModeCleanup = () => {
                    map.off("mousedown", onMouseDownSelect);
                    map.off("mouseup", onMouseUpSelect);
                    setCanvasCursor(""); // Reset to default
                };
                break;

            default:
                break;
        }

        try { window.mapxOnModeChanged?.(mode); } catch (_) {}
    };

    if (typeof window !== 'undefined') {
        window.mapxDrawSetMode = setMode;
    }

    return { setMode };
}