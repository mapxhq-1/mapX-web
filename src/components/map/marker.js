import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useSelector, useDispatch } from "react-redux";

// --- Updated CSS Constants with Pill Popup Styles ---
const MARKER_STYLES = `
  .custom-marker-container {
    width: 24px;  /* Hitbox for easier tapping on mobile */
    height: 24px; 
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
    cursor: pointer; 
    overflow: visible; 
  }
  
  /* --- Black Marker --- */
  .marker-dot {
    width: 14px;
    height: 14px;
    background-color: #ff3333; 
    border: 2px solid #ffffff; 
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(0,0,0,0.5); 
    z-index: 10;
    position: absolute; 
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .marker-ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: rgba(255, 51, 51, 0.5);
    z-index: 1;
    animation: ripple-scale-anim 2s infinite cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* --- Red Marker --- */
  .marker-dot-red {
    width: 10px;
    height: 10px;
    background-color: #ff3333; 
    border: 1.5px solid #ffffff; 
    border-radius: 50%;
    box-shadow: 0 0 3px rgba(0,0,0,0.5);
    z-index: 10;
    position: absolute; 
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .marker-ripple-red {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: rgba(255, 51, 51, 0.5);
    z-index: 1;
    animation: ripple-scale-anim 2s infinite cubic-bezier(0.25, 1, 0.5, 1);
  }

  @keyframes ripple-scale-anim {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
    }
    100% {
      transform: translate(-50%, -50%) scale(2.5);
      opacity: 0;
    }
  }

  /* --- MapLibre Custom Pill Popup --- */
  .maplibregl-popup-content {
    background-color: rgba(0, 0, 0, 0.9) !important; 
    color: #ffffff !important;
    border-top: 1.5px solid rgba(255, 255, 255, 0.7) !important; 
    border-radius: 50px !important; 
    padding: 6px 16px !important; 
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4) !important; 
    letter-spacing: 0.3px;
    white-space: nowrap; 
  }

  .maplibregl-popup-tip {
    display: none !important;
  }
`;

// --- Helper Functions ---
const injectMarkerStyles = () => {
  if (!document.getElementById("custom-marker-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "custom-marker-styles";
    styleSheet.innerText = MARKER_STYLES;
    document.head.appendChild(styleSheet);
  }
};

const createMarkerElement = (type = "black", name = "") => {
  // 1. The Code B Ghost Anchor
  const anchorContainer = document.createElement("div");
  anchorContainer.style.position = "relative";
  anchorContainer.style.width = "1px";
  anchorContainer.style.height = "1px";
  anchorContainer.style.pointerEvents = "none";

  // 2. Your actual visual container
  const container = document.createElement("div");
  container.className = "custom-marker-container";
  container.style.position = "absolute"; 
  // Offset the 24x24 container so its exact center hits the 1x1 grid point
  container.style.left = "-12px"; 
  container.style.bottom = "-12px";

  const dot = document.createElement("div");
  dot.className = type === "red" ? "marker-dot-red" : "marker-dot";
  container.appendChild(dot);

  const rippleCount = 3;
  const duration = 2;

  for (let i = 0; i < rippleCount; i++) {
    const ripple = document.createElement("div");
    ripple.className = type === "red" ? "marker-ripple-red" : "marker-ripple";
    const delay = (i * duration) / rippleCount;
    ripple.style.animationDelay = `-${delay}s`;
    container.appendChild(ripple);
  }

  if (name) {
    const label = document.createElement("div");
    label.className = "marker-label";
    label.innerText = name;
    container.appendChild(label);
  }

  anchorContainer.appendChild(container);
  return anchorContainer; 
};

// --- Main Hook ---
export const useMarkerManager = (mapRef) => {
  const targetPosition = useSelector((state) => state.map.flyToPosition);
  const markersList = useSelector((state) => state.map.markers); 
  const dispatch = useDispatch(); 

  const mainMarkerRef = useRef(null); 
  const redMarkersRef = useRef([]); 

  useEffect(() => {
    injectMarkerStyles();
  }, []);

  // --- Single Black Marker (Conditional) ---
  useEffect(() => {
    if (!mapRef.current) return;

    const hasRedMarkers = Array.isArray(markersList) && markersList.length > 0;
    
    const shouldShowBlack = targetPosition?.lat !== undefined && 
                            targetPosition?.lng !== undefined && 
                            !hasRedMarkers;

    if (shouldShowBlack) {
      const { lng, lat } = targetPosition;

      if (!mainMarkerRef.current) {
        const el = createMarkerElement('black');
        
        el.addEventListener('click', (e) => {
          e.stopPropagation(); 
          console.log(`Black Marker Clicked - Lng: ${lng}, Lat: ${lat}`);
        });

        mainMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      } else {
        mainMarkerRef.current.setLngLat([lng, lat]);
        if (!mainMarkerRef.current.getElement().parentElement) {
            mainMarkerRef.current.addTo(mapRef.current);
        }
      }
    } else {
      if (mainMarkerRef.current) {
        mainMarkerRef.current.remove();
        mainMarkerRef.current = null;
      }
    }
  }, [mapRef, targetPosition, markersList]); 

  // --- Array of Red Markers ---
  useEffect(() => {
    if (!mapRef.current) return;
    
    const currentList = Array.isArray(markersList) ? markersList : [];

    currentList.forEach((coord, index) => {
        if (!coord || coord.lat === undefined || coord.lng === undefined) return;

        if (redMarkersRef.current[index]) {
            const marker = redMarkersRef.current[index];
            const currentLngLat = marker.getLngLat();
            
            // ONLY update if the coordinates actually changed in state.
            // This stops React from interrupting MapLibre's smooth panning engine!
            if (!currentLngLat || currentLngLat.lng !== coord.lng || currentLngLat.lat !== coord.lat) {
                marker.setLngLat([coord.lng, coord.lat]);
            }
            // Extract the custom popup we attached during creation
            const popup = marker.customPopup;
            if (popup) {
              popup.setText(coord.location || `Location: ${coord.lng.toFixed(4)}, ${coord.lat.toFixed(4)}`);
              popup.setLngLat([coord.lng, coord.lat]); 
            }
        } else {
            // Create New Marker
            const el = createMarkerElement('red');
            
            // 1. Create the Popup (Text Box)
            const popup = new maplibregl.Popup({ 
              offset: 15, 
              closeButton: false, 
              closeOnClick: true,
              autoPan: false // STOPS MAP MOVEMENT ON OPEN
            }).setText(coord.location || `Location: ${coord.lng.toFixed(4)}, ${coord.lat.toFixed(4)}`);

            // 2. Attach the Marker manually 
            const newMarker = new maplibregl.Marker({ 
                element: el, 
                anchor: 'center',
                pitchAlignment: 'map',
                rotationAlignment: 'map'
            })
                .setLngLat([coord.lng, coord.lat])
                .addTo(mapRef.current);
            
            // Attach the popup to the marker instance manually for future updates
            newMarker.customPopup = popup;

            // 3. Event Listeners (Fixed for Touchscreen Phantom Clicks)
            el.isPinned = false; 

            // --- Hover Logic (Desktop Mouse Only) ---
            el.addEventListener('pointerenter', (e) => {
              if (e.pointerType === 'mouse' && !el.isPinned) {
                popup.setLngLat([coord.lng, coord.lat]).addTo(mapRef.current);
              }
            });

            el.addEventListener('pointerleave', (e) => {
              if (e.pointerType === 'mouse' && !el.isPinned) {
                popup.remove();
              }
            });

            // --- Block MapLibre Gestures ---
            // These stop the globe from panning or closing the popup immediately on touch
            el.addEventListener('mousedown', (e) => e.stopPropagation());
            el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
            el.addEventListener('dblclick', (e) => e.stopPropagation());

            // --- The Click/Tap Handler ---
            el.addEventListener('click', (e) => {
              e.stopPropagation(); // Stops the phantom click from hitting the globe
              e.preventDefault(); 

              el.isPinned = !el.isPinned; // Toggle pin state

              if (el.isPinned) {
                popup.setLngLat([coord.lng, coord.lat]).addTo(mapRef.current);
              } else {
                popup.remove();
              }
            });

            // --- Reset State on Map Click ---
            // If the user taps the map background to dismiss the popup, unpin it
            popup.on('close', () => {
              el.isPinned = false;
            });

            redMarkersRef.current[index] = newMarker;
        }
    });

    // Cleanup extra markers & their popups
    if (redMarkersRef.current.length > currentList.length) {
        for (let i = currentList.length; i < redMarkersRef.current.length; i++) {
            if (redMarkersRef.current[i]) {
                redMarkersRef.current[i].remove();
                if (redMarkersRef.current[i].customPopup) {
                  redMarkersRef.current[i].customPopup.remove();
                }
            }
        }
        redMarkersRef.current.length = currentList.length;
    }

  }, [mapRef, markersList]);
};