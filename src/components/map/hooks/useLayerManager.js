import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export const useLayerManager = (map, customLayers) => {
  const animationRef = useRef(null);
  
  // State: { [id]: { fullData, displayData, speed, lastRestartTrigger, isFinished } }
  const layerStates = useRef({});

  // --- 1. SETUP LAYERS ---
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
         layerType.includes("River") || 
         layerType.includes("Trade") || 
         layerType.includes("Route");

      // Initialize Animation State
      if (shouldAnimate && layer.data && !layerStates.current[layer.id]) {
          const emptyGeoJSON = JSON.parse(JSON.stringify(validData));
          
          emptyGeoJSON.features.forEach(f => {
              if (f.geometry.type === "LineString") f.geometry.coordinates = []; 
              else if (f.geometry.type === "MultiLineString") f.geometry.coordinates = f.geometry.coordinates.map(() => []);
          });

          layerStates.current[layer.id] = {
              fullData: validData,           
              displayData: emptyGeoJSON,     
              speed: 0,
              isFinished: false,
              lastRestartTrigger: layer.restartTrigger || 0 // Track Redux trigger
          };
      }

      // Add Source
      const initialData = (shouldAnimate && layerStates.current[layer.id]) 
          ? layerStates.current[layer.id].displayData 
          : validData;

      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, { type: "geojson", data: initialData });
      } else if (!shouldAnimate) {
        map.current.getSource(sourceId).setData(validData);
      }

      // Add Layers (Line & Fill) - Logic unchanged
      if (!map.current.getLayer(lineId)) {
        map.current.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          layout: { visibility: isVisible, "line-cap": "round", "line-join": "round" },
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
      // (Add Fill logic here if needed...)
    });

  }, [customLayers]);


  // --- 2. CONTROLLED ANIMATION LOOP ---
  useEffect(() => {
    let isActive = true;
    const FRAMES_PER_POINT = 2; 

    const animate = () => {
        if (!isActive || !map.current) return;

        Object.keys(layerStates.current).forEach(layerId => {
            const state = layerStates.current[layerId];
            const layerConfig = customLayers.find(l => l.id.toString() === layerId);

            if (!layerConfig || !layerConfig.visible) return;

            // 1. CHECK FOR RESTART COMMAND
            if (layerConfig.restartTrigger > state.lastRestartTrigger) {
                // Wipe coordinates to start over
                state.displayData.features.forEach(f => {
                    if (f.geometry.type === "LineString") f.geometry.coordinates = [];
                    if (f.geometry.type === "MultiLineString") f.geometry.coordinates.forEach(a => a.length = 0);
                });
                state.isFinished = false;
                state.lastRestartTrigger = layerConfig.restartTrigger; // Sync trigger
                // Update map immediately to clear lines
                const sourceId = `custom-source-${layerId}`;
                if (map.current.getSource(sourceId)) {
                    map.current.getSource(sourceId).setData(state.displayData);
                }
                return; // Skip drawing this frame
            }

            // 2. CHECK PLAY/PAUSE
            if (!layerConfig.isPlaying || state.isFinished) return;

            // 3. DRAW LOGIC
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

            // Update Map
            const sourceId = `custom-source-${layerId}`;
            if (map.current.getSource(sourceId)) {
                map.current.getSource(sourceId).setData(state.displayData);
            }

            if (animationComplete) {
                state.isFinished = true; // Stop here. Wait for Repeat button.
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