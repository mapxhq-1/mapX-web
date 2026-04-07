import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { setLayerPlaying } from "../../../store/layerSlice"; 

// Foolproof Bounds Calculator to find the edges of ANY shape
const calculateBounds = (data) => {
  if (!data) return null;
  const bounds = new maplibregl.LngLatBounds();
  let hasPoints = false;

  const processCoords = (arr) => {
    if (!Array.isArray(arr)) return;
    if (typeof arr[0] === 'number') {
      bounds.extend([arr[0], arr[1]]);
      hasPoints = true;
    } else {
      arr.forEach(processCoords);
    }
  };

  const processGeometry = (geom) => {
    if (geom && geom.coordinates) processCoords(geom.coordinates);
  };

  if (data.type === "FeatureCollection" && data.features) {
    data.features.forEach(f => processGeometry(f.geometry));
  } else if (data.type === "Feature") {
    processGeometry(data.geometry);
  } else if (data.coordinates) {
    processGeometry(data); 
  }

  return hasPoints ? bounds : null;
};

export const useLayerManager = (map, customLayers, dispatch) => {
  const animationRef = useRef(null);
  const layerStates = useRef({});
  const hasFlownTo = useRef({});

  // --- 1. RENDER & INITIALIZE ---
  useEffect(() => {
    if (!map.current) return;
    if (!Array.isArray(customLayers)) return;

    customLayers.forEach((layer) => {
      const sourceId = `custom-source-${layer.id}`;
      const lineId = `custom-line-${layer.id}`;
      const fillId = `custom-fill-${layer.id}`;
      
      const isVisible = layer.visible ? "visible" : "none";
      const validData = layer.data || { type: "FeatureCollection", features: [] };
      const layerType = layer.metadata?.type || "";
      
      const shouldAnimate = 
         layerType.includes("Trade") || 
         layerType.includes("Route");

      if (shouldAnimate && layer.data && !layerStates.current[layer.id]) {
          const emptyGeoJSON = JSON.parse(JSON.stringify(validData));
          
          if (emptyGeoJSON.features) {
              emptyGeoJSON.features.forEach(f => {
                  if (f.geometry?.type === "LineString") {
                      f.geometry.coordinates = []; 
                  } else if (f.geometry?.type === "MultiLineString") {
                      f.geometry.coordinates = f.geometry.coordinates.map(() => []);
                  }
              });
          }

          layerStates.current[layer.id] = {
              fullData: validData,       
              displayData: emptyGeoJSON, 
              speed: 0,
              isFinished: false,
              pauseCounter: 0
          };
      }

      const initialData = (shouldAnimate && layerStates.current[layer.id]) 
          ? layerStates.current[layer.id].displayData 
          : validData;

      // 1. Setup Data Source
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, { type: "geojson", data: initialData });
      } else if (!shouldAnimate) {
        map.current.getSource(sourceId).setData(validData);
      }

      // 2. Setup Line Layer
      if (!map.current.getLayer(lineId)) {
        map.current.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          layout: { 
            visibility: isVisible, 
            "line-cap": "round", 
            "line-join": "round" 
          },
          paint: {
            "line-color": layer.color || "#0080ff",
            "line-width": 4,
            "line-opacity": 0.8
          },
          filter: ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]]
        });
      } else {
        map.current.setLayoutProperty(lineId, "visibility", isVisible);
        map.current.setPaintProperty(lineId, "line-color", layer.color || "#0080ff");
      }

      // 3. Setup Fill Layer
      if (!map.current.getLayer(fillId)) {
        map.current.addLayer({
          id: fillId,
          type: "fill",
          source: sourceId,
          layout: { visibility: isVisible },
          paint: {
            "fill-color": layer.color || "#0080ff",
            "fill-opacity": 0.3
          },
          filter: ["==", "$type", "Polygon"]
        }, lineId);
      } else {
        map.current.setLayoutProperty(fillId, "visibility", isVisible);
      }

      // --- 4. DYNAMIC FLY TO IMPLEMENTATION ---
      if (layer.visible && validData.features && validData.features.length > 0 && !hasFlownTo.current[layer.id]) {
          const bounds = calculateBounds(validData);
          
          if (bounds) {
              hasFlownTo.current[layer.id] = true;

              const camera = map.current.cameraForBounds(bounds, {
                  padding: 150, // INCREASED PADDING: Gives the shape more breathing room
                  maxZoom: 12   // LOWERED MAX ZOOM: Prevents zooming in too close on tiny features
              });

              if (camera) {
                  // MANUAL PULLBACK: Subtract 1 from whatever zoom MapLibre thinks is perfect
                  const targetZoom = camera.zoom ; 
                  const targetLng = camera.center.lng;
                  const targetLat = camera.center.lat;

                  setTimeout(() => {
                      try {
                          if (window.mapxFlyTo && Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
                              window.mapxFlyTo({ lng: targetLng, lat: targetLat, zoom: targetZoom });
                          } else if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
                              map.current.flyTo({
                                  center: [targetLng, targetLat],
                                  zoom: targetZoom,
                                  speed: 0.7,
                                  curve: 1.5,
                                  easing: (t) => 1 - Math.pow(1 - t, 2),
                                  essential: false,
                              });
                          }
                      } catch (e) {
                          console.error("FlyTo Failed", e);
                      }
                  }, 150); 
              }
          }
      }
      
      // 5. Setup Popups
      if (!map.current._clickBound?.[layer.id]) {
          const handlePopup = (e) => {
             new maplibregl.Popup({ 
                 closeButton: false,
                 className: 'glass-popup' // <-- 1. Add custom class here
             })
                .setLngLat(e.lngLat)
                // 2. Simplify the HTML and rely on CSS
                .setHTML(`<div class="glass-popup-text">${layer.name}</div>`) 
                .addTo(map.current);
          };
          if (!map.current._clickBound) map.current._clickBound = {};
          map.current.on('click', lineId, handlePopup);
          map.current._clickBound[layer.id] = true;
      }
    });

  }, [customLayers]);


  // --- 2. ANIMATION LOOP ---
  useEffect(() => {
    let isActive = true;
    const FRAMES_PER_POINT = 2; 

    const animate = () => {
        if (!isActive || !map.current) return;

        Object.keys(layerStates.current).forEach(layerId => {
            const state = layerStates.current[layerId];
            const layerConfig = customLayers.find(l => l.id.toString() === layerId);

            if (!layerConfig || !layerConfig.visible) return;

            if (layerConfig.isPlaying && state.isFinished) {
                if (state.displayData.features) {
                    state.displayData.features.forEach(f => {
                        if (f.geometry?.type === "LineString") f.geometry.coordinates = [];
                        if (f.geometry?.type === "MultiLineString") f.geometry.coordinates.forEach(a => a.length = 0);
                    });
                }
                state.isFinished = false; 
                
                const sourceId = `custom-source-${layerId}`;
                if (map.current.getSource(sourceId)) {
                    map.current.getSource(sourceId).setData(state.displayData);
                }
            }

            if (!layerConfig.isPlaying || state.isFinished) return;

            state.speed++;
            if (state.speed < FRAMES_PER_POINT) return;
            state.speed = 0;

            let animationComplete = true;

            if (state.fullData.features) {
                state.fullData.features.forEach((fullFeature, fIndex) => {
                    const displayFeature = state.displayData.features[fIndex];
                    if (!displayFeature) return;
                    
                    if (fullFeature.geometry?.type === "LineString") {
                        const full = fullFeature.geometry.coordinates;
                        const current = displayFeature.geometry.coordinates;

                        if (current.length < full.length) {
                            current.push(full[current.length]);
                            animationComplete = false; 
                        }
                    } 
                    else if (fullFeature.geometry?.type === "MultiLineString") {
                        fullFeature.geometry.coordinates.forEach((fullLine, lineIdx) => {
                            const currentLine = displayFeature.geometry.coordinates[lineIdx];
                            
                            if (currentLine && currentLine.length < fullLine.length) {
                                currentLine.push(fullLine[currentLine.length]);
                                animationComplete = false;
                            }
                        });
                    }
                });
            }

            const sourceId = `custom-source-${layerId}`;
            if (map.current.getSource(sourceId)) {
                map.current.getSource(sourceId).setData(state.displayData);
            }

            if (animationComplete && !state.isFinished) {
                state.isFinished = true;
                if (dispatch) {
                    dispatch(setLayerPlaying({ id: layerConfig.id, isPlaying: false }));
                }
            }
        });

        if (isActive) {
            animationRef.current = requestAnimationFrame(animate);
        }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
        isActive = false;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [customLayers, dispatch]); 
};