import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useSelector } from "react-redux";

// 1. Updated CSS: Zero-size container + Flattened Shadows
const MARKER_STYLES = `
  /* Container is now a 0x0 point in space */
  .custom-marker-container {
    width: 0;
    height: 0;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    overflow: visible; /* Allow dot/ripple to spill out */
  }
  
  /* --- Black Marker --- */
  .marker-dot {
    width: 14px;
    height: 14px;
    background-color: #222222; 
    border: 2px solid #ffffff; 
    border-radius: 50%;
    /* ✅ Shadow 0px vertical offset to look flat on ground */
    box-shadow: 0 0 4px rgba(0,0,0,0.5); 
    z-index: 10;
    position: absolute; /* Absolute center */
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
    background-color: rgba(0, 0, 0, 0.6);
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
    /* ✅ Shadow 0px vertical offset to look flat on ground */
    box-shadow: 0 0 3px rgba(0,0,0,0.5);
    z-index: 10;
    position: absolute; /* Absolute center */
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
`;

const injectMarkerStyles = () => {
  if (!document.getElementById("custom-marker-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "custom-marker-styles";
    styleSheet.innerText = MARKER_STYLES;
    document.head.appendChild(styleSheet);
  }
};

const createMarkerElement = (type = 'black') => {
  const container = document.createElement("div");
  container.className = "custom-marker-container";

  const dot = document.createElement("div");
  dot.className = type === 'red' ? "marker-dot-red" : "marker-dot";
  container.appendChild(dot);

  // Ripples
  const rippleCount = 3; 
  const duration = 2; 
  
  for (let i = 0; i < rippleCount; i++) {
    const ripple = document.createElement("div");
    ripple.className = type === 'red' ? "marker-ripple-red" : "marker-ripple";
    const delay = (i * duration) / rippleCount;
    ripple.style.animationDelay = `-${delay}s`;
    container.appendChild(ripple);
  }

  return container;
};

export const useMarkerManager = (mapRef) => {
  const targetPosition = useSelector((state) => state.map.flyToPosition);
  const markersList = useSelector((state) => state.map.markers); 

  const mainMarkerRef = useRef(null); 
  const redMarkersRef = useRef([]); 

  useEffect(() => {
    injectMarkerStyles();
  }, []);

  // --- Single Black Marker ---
  useEffect(() => {
    if (!mapRef.current) return;

    if (targetPosition?.lat !== undefined && targetPosition?.lng !== undefined) {
      const { lng, lat } = targetPosition;

      if (!mainMarkerRef.current) {
        const el = createMarkerElement('black');
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
  }, [mapRef, targetPosition]);

  // --- Array of Red Markers ---
  useEffect(() => {
    if (!mapRef.current) return;
    
    const currentList = Array.isArray(markersList) ? markersList : [];

    currentList.forEach((coord, index) => {
        if (!coord || coord.lat === undefined || coord.lng === undefined) return;

        if (redMarkersRef.current[index]) {
            // Update
            redMarkersRef.current[index].setLngLat([coord.lng, coord.lat]);
        } else {
            // Create
            const el = createMarkerElement('red');
            const newMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([coord.lng, coord.lat])
                .addTo(mapRef.current);
            
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