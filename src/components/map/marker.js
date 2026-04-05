import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useSelector } from "react-redux";

// --- Updated CSS Constants ---
const MARKER_STYLES = `
  /* The Ghost Anchor - MapLibre tracks this 1x1 pixel */
  .ghost-anchor {
    position: relative;
    width: 1px;
    height: 1px;
    pointer-events: none;
  }

  /* The actual clickable pin container */
  .custom-marker-container {
    position: absolute;
    bottom: 0px; 
    left: -16px; 
    width: 32px; 
    height: 32px;
    display: flex;
    justify-content: center;
    cursor: pointer;
    pointer-events: auto;
  }

  .map-pin-icon {
    width: 32px;
    height: 32px;
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.4));
    transition: transform 0.2s ease;
    transform-origin: bottom center; 
  }

  .custom-marker-container:hover .map-pin-icon {
    transform: scale(1.15); 
  }

  /* --- Pill-Shaped Glassmorphism Label --- */
  .glass-label {
    position: absolute;
    bottom: 36px; 
    left: 50%; 
    transform: translateX(-50%);
    
    /* 1. The Pill Shape */
    border-radius: 50px;
    padding: 5px 14px; 
    
    /* 2. True Glassmorphism (Slight dark tint for contrast) */
    background: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    
    /* 3. Subtle Depth Effect */
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.5); /* Soft white highlight on bottom */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    
    /* Text Styles */
    color: #ffffff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    font-size: 11.5px; 
    font-weight: 600;
    letter-spacing: 0.3px;
    white-space: nowrap;
    pointer-events: none; 
    z-index: 11;
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

const createPinElement = (name = "") => {
  // 1. The 1x1 Ghost Anchor (This is what MapLibre touches)
  const ghostAnchor = document.createElement("div");
  ghostAnchor.className = "ghost-anchor";

  // 2. The Pin Container
  const container = document.createElement("div");
  container.className = "custom-marker-container";

  const pin = document.createElement("div");
  pin.className = "map-pin-icon";
  pin.innerHTML = `
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
  <path d="M 16 19 L 17.5 19 L 16.6 30.5 C 16.4 31.5 16 32 16 32 Z" fill="#94a3b8" />
  <path d="M 16 19 L 14.5 19 L 15.4 30.5 C 15.6 31.5 16 32 16 32 Z" fill="#cbd5e1" />
  <line x1="15.2" y1="20" x2="15.6" y2="28" stroke="#f8fafc" stroke-width="0.8" stroke-linecap="round" />

  <circle cx="16" cy="11" r="9" fill="#b91c1c" />
  <circle cx="15.2" cy="10.2" r="8.5" fill="#ef4444" />
  <path d="M 10 9 A 5.5 5.5 0 0 1 13.5 5.5" fill="none" stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round" />
</svg>
  `;
  container.appendChild(pin);

  // 3. Glassmorphism Name Label
  const label = document.createElement("div");
  label.className = "glass-label";
  label.innerText = name;

  // Append both the pin and the label directly to the ghost anchor
  ghostAnchor.appendChild(container);
  ghostAnchor.appendChild(label);

  return { ghostAnchor, container };
};

// --- Main Hook ---
export const useMarkerManager = (mapRef) => {
  const markersList = useSelector((state) => state.map.markers); 
  const markersRef = useRef([]); 

  useEffect(() => {
    injectMarkerStyles();
  }, []);

  // --- Array of Red Location Markers ---
  useEffect(() => {
    if (!mapRef.current) return;
    
    const currentList = Array.isArray(markersList) ? markersList : [];

    currentList.forEach((coord, index) => {
        if (!coord || coord.lat === undefined || coord.lng === undefined) return;

        const displayName = coord.location || `${coord.lng.toFixed(3)}, ${coord.lat.toFixed(3)}`;

        if (markersRef.current[index]) {
            const marker = markersRef.current[index];
            const currentLngLat = marker.getLngLat();
            
            if (!currentLngLat || currentLngLat.lng !== coord.lng || currentLngLat.lat !== coord.lat) {
                marker.setLngLat([coord.lng, coord.lat]);
            }

            const labelEl = marker.getElement().querySelector('.glass-label');
            if (labelEl && labelEl.innerText !== displayName) {
                labelEl.innerText = displayName;
            }

        } else {
            // Create New Ghost Anchor & Container
            const { ghostAnchor, container } = createPinElement(displayName);
            
            // Block gestures on the clickable container
            container.addEventListener('mousedown', (e) => e.stopPropagation());
            container.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
            container.addEventListener('dblclick', (e) => e.stopPropagation());
            
            container.addEventListener('click', (e) => {
              e.stopPropagation(); 
              e.preventDefault(); 
              console.log("Clicked Pin:", displayName);
            });

            // --- Attach MapLibre to the 1x1 Ghost Anchor ---
            const newMarker = new maplibregl.Marker({ 
                element: ghostAnchor, 
                anchor: 'center', 
                pitchAlignment: 'map',
                rotationAlignment: 'map'
            })
                .setLngLat([coord.lng, coord.lat])
                .addTo(mapRef.current);
            
            markersRef.current[index] = newMarker;
        }
    });

    // Cleanup removed markers
    if (markersRef.current.length > currentList.length) {
        for (let i = currentList.length; i < markersRef.current.length; i++) {
            if (markersRef.current[i]) {
                markersRef.current[i].remove();
            }
        }
        markersRef.current.length = currentList.length;
    }

  }, [mapRef, markersList]);
};