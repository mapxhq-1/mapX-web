import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export const useLayerManager = (map, customLayers) => {
  const animationRef = useRef(null);
  const layerStates = useRef({});

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
      
      // --- CHANGED LOGIC: Only animate Trade Routes ---
      const shouldAnimate = 
         layerType.includes("Trade") || 
         layerType.includes("Route");

      // Initialize Animation State (ONLY for Trade Routes)
      if (shouldAnimate && layer.data && !layerStates.current[layer.id]) {
          const emptyGeoJSON = JSON.parse(JSON.stringify(validData));
          
          emptyGeoJSON.features.forEach(f => {
              if (f.geometry.type === "LineString") {
                  f.geometry.coordinates = []; 
              } else if (f.geometry.type === "MultiLineString") {
                  f.geometry.coordinates = f.geometry.coordinates.map(() => []);
              }
          });

          layerStates.current[layer.id] = {
              fullData: validData,       
              displayData: emptyGeoJSON, 
              speed: 0,
              isFinished: false,
              pauseCounter: 0,
              lastRestartTrigger: layer.restartTrigger || 0
          };
      }

      // Add Source
      // If animating, start empty. If River (static), start full.
      const initialData = (shouldAnimate && layerStates.current[layer.id]) 
          ? layerStates.current[layer.id].displayData 
          : validData;

      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, { type: "geojson", data: initialData });
      } else if (!shouldAnimate) {
        // Force update static layers (Rivers) to full data immediately
        map.current.getSource(sourceId).setData(validData);
      }

      // Add Line Layer
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

      // Add Fill
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
      
      // Popup
      if (!map.current._clickBound?.[layer.id]) {
          const handlePopup = (e) => {
             new maplibregl.Popup({ closeButton: false })
                .setLngLat(e.lngLat)
                .setHTML(`<div style="color:black; padding:4px; font-weight:bold;">${layer.name}</div>`)
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

            // Handle Restart
            if (layerConfig.restartTrigger > state.lastRestartTrigger) {
                state.displayData.features.forEach(f => {
                    if (f.geometry.type === "LineString") f.geometry.coordinates = [];
                    if (f.geometry.type === "MultiLineString") f.geometry.coordinates.forEach(a => a.length = 0);
                });
                state.isFinished = false;
                state.lastRestartTrigger = layerConfig.restartTrigger;
                const sourceId = `custom-source-${layerId}`;
                if (map.current.getSource(sourceId)) {
                    map.current.getSource(sourceId).setData(state.displayData);
                }
                return;
            }

            if (!layerConfig.isPlaying || state.isFinished) return;

            state.speed++;
            if (state.speed < FRAMES_PER_POINT) return;
            state.speed = 0;

            let animationComplete = true;

            state.fullData.features.forEach((fullFeature, fIndex) => {
                const displayFeature = state.displayData.features[fIndex];
                
                if (fullFeature.geometry.type === "LineString") {
                    const full = fullFeature.geometry.coordinates;
                    const current = displayFeature.geometry.coordinates;

                    if (current.length < full.length) {
                        current.push(full[current.length]);
                        animationComplete = false; 
                    }
                } 
                else if (fullFeature.geometry.type === "MultiLineString") {
                    fullFeature.geometry.coordinates.forEach((fullLine, lineIdx) => {
                        const currentLine = displayFeature.geometry.coordinates[lineIdx];
                        
                        if (currentLine.length < fullLine.length) {
                            currentLine.push(fullLine[currentLine.length]);
                            animationComplete = false;
                        }
                    });
                }
            });

            const sourceId = `custom-source-${layerId}`;
            if (map.current.getSource(sourceId)) {
                map.current.getSource(sourceId).setData(state.displayData);
            }

            if (animationComplete) {
                state.isFinished = true;
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
  }, [customLayers]);
};