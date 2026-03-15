import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useSelector, useDispatch } from "react-redux";

// --- Updated CSS Constants with Pill Popup Styles ---
const MARKER_STYLES = `
  .custom-marker-container {
    width: 0;
    height: 0;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
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
    background-color: rgba(0, 0, 0, 0.9) !important; /* Black/90 */
    color: #ffffff !important;
    border-top: 1.5px solid rgba(255, 255, 255, 0.7) !important; /* White/70 depth effect */
    border-radius: 50px !important; /* Pill shape */
    padding: 6px 16px !important; /* Low Y padding, High X padding */
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4) !important; /* Drop shadow for depth */
    letter-spacing: 0.3px;
    white-space: nowrap; /* Keeps the text on one line for the pill look */
  }

  /* Hide the default triangle tip to maintain the clean floating pill look */
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
  const container = document.createElement("div");
  container.className = "custom-marker-container";

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

  // Tooltip label
  if (name) {
    const label = document.createElement("div");
    label.className = "marker-label";
    label.innerText = name;
    container.appendChild(label);
  }

  return container;
};

// --- Main Hook ---
export const useMarkerManager = (mapRef) => {
  const targetPosition = useSelector((state) => state.map.flyToPosition);
  const markersList = useSelector((state) => state.map.markers); 
  const dispatch = useDispatch(); // Available in case you want to dispatch Redux actions on click

  const mainMarkerRef = useRef(null); 
  const redMarkersRef = useRef([]); 

  useEffect(() => {
    injectMarkerStyles();
  }, []);

  // --- Single Black Marker (Conditional) ---
  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Determine if red markers exist
    const hasRedMarkers = Array.isArray(markersList) && markersList.length > 0;
    
    // 2. Determine if black marker should show (Target exists AND No Red markers)
    const shouldShowBlack = targetPosition?.lat !== undefined && 
                            targetPosition?.lng !== undefined && 
                            !hasRedMarkers;

    if (shouldShowBlack) {
      const { lng, lat } = targetPosition;

      if (!mainMarkerRef.current) {
        const el = createMarkerElement('black');
        
        // CLICK EVENT LISTENER added here
        el.addEventListener('click', (e) => {
          e.stopPropagation(); 
          console.log(`Black Marker Clicked - Lng: ${lng}, Lat: ${lat}`);
        });

        mainMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      } else {
        mainMarkerRef.current.setLngLat([lng, lat]);
        // Ensure it is on the map if it was previously removed
        if (!mainMarkerRef.current.getElement().parentElement) {
            mainMarkerRef.current.addTo(mapRef.current);
        }
      }
    } else {
      // 3. Remove black marker if conditions aren't met
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
            // Update existing marker
            redMarkersRef.current[index].setLngLat([coord.lng, coord.lat]);
            
            // Update popup text if location changes
            const popup = redMarkersRef.current[index].getPopup();
            if (popup) {
              popup.setText(coord.location || `Location: ${coord.lng.toFixed(4)}, ${coord.lat.toFixed(4)}`);
            }
        } else {
            // Create New Marker
            const el = createMarkerElement('red');
            
            // 1. Create a simple MapLibre Popup (Text Box)
            const popup = new maplibregl.Popup({ 
              offset: 15, // pushes the text a bit away from the center of the dot
              closeButton: false, // hides the little 'x' button for a cleaner look
              closeOnClick: true 
            }).setText(coord.location || `Location: ${coord.lng.toFixed(4)}, ${coord.lat.toFixed(4)}`);

            // 2. Attach the Popup to the Marker
            const newMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([coord.lng, coord.lat])
                .setPopup(popup) // <--- This connects the text to the marker!
                .addTo(mapRef.current);
            
            // 3. Handle the click to open/close the text safely
            el.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevents map from swallowing the click
              newMarker.togglePopup(); // Shows/hides the text
            });

            redMarkersRef.current[index] = newMarker;
        }
    });

    // Cleanup extra markers
    if (redMarkersRef.current.length > currentList.length) {
        for (let i = currentList.length; i < redMarkersRef.current.length; i++) {
            if (redMarkersRef.current[i]) {
                redMarkersRef.current[i].remove();
            }
        }
        redMarkersRef.current.length = currentList.length;
    }

  }, [mapRef, markersList]);
};