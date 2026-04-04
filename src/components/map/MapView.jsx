import React, { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import LiquidGlass from "../Chatbot/LiquidGlass";
// Redux & Utils
import { fetchAllEmpirePolygons, openNotes, setFlyToPosition, setMarkers } from "../../store/mapSlice";
import { colorPolygonsFourColor, colorIndexToHex, colorIndexToHexDark } from "../../utils/polygonColoring";
import { getEraForYear, getAbsoluteYear, isMaRange } from "../../utils/era";
import * as turf from "@turf/turf";

// Map utilities
import { getBaseStyle, getBaseStyleWithFallback, getEffectiveProvider, isEsriProvider, DEFAULT_THEME, MAPTILER_KEY, buildCloudlessStyle } from "./utils/mapStyles";
import { createCursorManager } from "./utils/cursorManager";
import { buildEmpireLabelPoints as buildLabelPoints, createTextFeature, sanitizeText } from "./utils/textToolHelpers";
import { addDrawingSources, addDrawingLayers, LAYER_IDS } from "./utils/mapLayers";
import { useLayerManager } from "./hooks/useLayerManager";
// Overlays
import { createSelectionOverlay } from "./overlays/selectionOverlay";
import { createTextToolbar } from "./overlays/textToolbar";

// Controllers
import { createDrawModeController } from "./controllers/drawModeController";
import FreehandController from "../../draw/freehandController";
import LineController from "../../draw/lineController";
import PolygonController from "../../draw/polygonController";
import CircleController from "../../draw/circleController";
import ArrowController from "../../draw/arrowController";

// Managers
import { store as reduxStore } from "../../store/store";
import { imageManager } from './ImageManager';
import { hyperlinkManager } from "./HyperlinkManager";
import { createNoteManager } from './NoteManager';
import { useMarkerManager } from "./marker";
import { createMaOverlayManager } from "./maOverlayManager";
import { maybeHandleMaMapShapes, handleInitialMaContext, createMaSafeLoader } from "./maEraGuards";

// API
import { createMapShape, deleteMapShape, getAllMapShapes, updateMapShape } from "../api/mapshapes";
import { getMetadataByEmpireId } from '../api/metaData'
// Controls
import { PhotonSearchControl, ScreenshotControl, MeasureDistanceControl, ResetNorthControl, ZoomControl, CompactAttributionControl  } from "./controls/MapControls";

// Components
import GalaxyCanvas from "../common/GalaxyCanvas";
import { attachMapViewCollector } from "./utils/mapViewState";

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

const MODERN_ERA_START = 1900;
const MAX_COORDINATES_THRESHOLD = 50000;
const MAX_POLYGONS_THRESHOLD = 300;

const SIMPLIFICATION_CONFIG = {
  aggressive: 0.1,
  high: 0.05,
  medium: 0.01,
  low: 0.005,
  none: 0
};

const ZOOM_TOLERANCES = {
  0: 0.05,  // Was 0.1
  2: 0.04,  // Was 0.08
  3: 0.02,  // Was 0.05
  4: 0.01,  // Was 0.03
  5: 0.005, // Was 0.02
  6: 0.002, // Was 0.01
  7: 0.001,
  8: 0,     // 0 means no simplification
  10: 0,
  12: 0
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MapView({ leftOffset = 0, rightOffset = 0 }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const currentMetadataRef = useRef(null);
  const dispatch = useDispatch();
  const currentToolRef = useRef("select");

  useMarkerManager(map);
  const markersList = useSelector((state) => state.map.markers);
  const flyToPosition = useSelector((state) => state.map.flyToPosition);
  const markerOn = (flyToPosition)||(markersList && markersList.length > 0);
  const handleClear = () => {
     dispatch(setMarkers([]));
     dispatch(setFlyToPosition(null));
  };

  // Redux state
  const polygons = useSelector((state) => state.map.polygons);
  const year = useSelector((state) => state.map.year);
  const loading = useSelector((state) => state.map.loading);
  const ownerEmail = useSelector((state) => state.project.ownerEmail);
  const { id: projectId } = useParams();

  // Local state
  const [stats, setStats] = useState({ original: 0, simplified: 0, reduction: 0 });
  const [currentZoom, setCurrentZoom] = useState(2);

  // Refs for polygons
  const polygonsRef = useRef(polygons);
  const yearRef = useRef(year);
  const prevYearRef = useRef(year);
  const prevPolygonsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const lastCenturyRef = useRef(null);
  const rawPolygonsRef = useRef([]);
  const simplificationCacheRef = useRef(new Map());
  const zoomDebounceRef = useRef(null);

  // Refs for drawing tools
  const finalFeaturesRef = useRef([]);
  const selectedFeatureIdRef = useRef(null);
  const featureSeqRef = useRef(1);
  const maOverlayManagerRef = useRef(null);
  const selectedEmpireNameRef = useRef(null); // Track selected empire for glow effect
  const ownerEmailRef = useRef(ownerEmail);
  // Keep refs updated
  useEffect(() => { polygonsRef.current = polygons; }, [polygons]);
  useEffect(() => { yearRef.current = year; }, [year]);
useEffect(() => {
  ownerEmailRef.current = ownerEmail;
}, [ownerEmail]);
  // ========================================================================
  // POLYGON SIMPLIFICATION UTILITIES
  // ========================================================================

  const countCoordinates = useCallback((features) => {
    if (!features || !features.length) return 0;
    let count = 0;
    const countInner = (coords) => {
      if (!coords) return;
      if (typeof coords[0] === 'number') { count++; return; }
      for (let i = 0; i < coords.length; i++) countInner(coords[i]);
    };
    for (let i = 0; i < features.length; i++) {
      countInner(features[i]?.geometry?.coordinates);
    }
    return count;
  }, []);

  const simplifyFeature = useCallback((feature, tolerance) => {
    if (!feature || !feature.geometry) return feature;
    const geomType = feature.geometry.type;
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') return feature;
    try {
      const simplified = turf.simplify(feature, {
        tolerance: tolerance,
        highQuality: false,
        mutate: false
      });
      return { ...simplified, properties: { ...feature.properties } };
    } catch (e) {
      return feature;
    }
  }, []);

  const getSimplificationTolerance = useCallback((features, zoom, forYear) => {
    const coordCount = countCoordinates(features);
    const polyCount = features?.length || 0;
    const isModernEra = forYear >= MODERN_ERA_START;
    
    let baseTolerance = 0;
    const zoomLevels = Object.keys(ZOOM_TOLERANCES).map(Number).sort((a, b) => a - b);
    for (let i = zoomLevels.length - 1; i >= 0; i--) {
      if (zoom >= zoomLevels[i]) {
        baseTolerance = ZOOM_TOLERANCES[zoomLevels[i]];
        break;
      }
    }
    
    let sizeFactor = 1;
    if (coordCount > 200000) sizeFactor = 3;
    else if (coordCount > 100000) sizeFactor = 2;
    else if (coordCount > MAX_COORDINATES_THRESHOLD) sizeFactor = 1.5;
    else if (polyCount > MAX_POLYGONS_THRESHOLD) sizeFactor = 1.3;
    
    if (isModernEra && coordCount > 30000) sizeFactor *= 1.5;
    
    return Math.max(baseTolerance * sizeFactor, 0.001);
  }, [countCoordinates]);

  const simplifyPolygons = useCallback((features, tolerance, cacheKey) => {
    if (!features || features.length === 0) return [];
    if (tolerance <= 0) return features;
    
    const fullCacheKey = `${cacheKey}-${tolerance.toFixed(4)}`;
    if (simplificationCacheRef.current.has(fullCacheKey)) {
      return simplificationCacheRef.current.get(fullCacheKey);
    }
    
    const originalCoords = countCoordinates(features);
    const simplified = features.map(f => simplifyFeature(f, tolerance));
    const newCoords = countCoordinates(simplified);
    const reduction = originalCoords > 0 ? Math.round((1 - newCoords / originalCoords) * 100) : 0;
    
    setStats({ original: originalCoords, simplified: newCoords, reduction });
    
    if (simplificationCacheRef.current.size > 20) {
      const firstKey = simplificationCacheRef.current.keys().next().value;
      simplificationCacheRef.current.delete(firstKey);
    }
    simplificationCacheRef.current.set(fullCacheKey, simplified);
    
    return simplified;
  }, [countCoordinates, simplifyFeature]);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  const getCenturyKey = useCallback((yr) => {
    if (yr >= 1) {
      const start = Math.floor((yr - 1) / 100) * 100 + 1;
      return `${start}-${start + 99}`;
    } else {
      const end = Math.ceil(yr / 100) * 100;
      return `${end - 99}-${end}`;
    }
  }, []);

  const buildEmpireLabelPoints = useCallback((features) => {
    return buildLabelPoints(features);
  }, []);

  const processPolygons = useCallback((polys) => {
    if (!polys || polys.length === 0) return [];
    let colored = polys;
    try {
      colored = colorPolygonsFourColor(polys, {
        minSharedMeters: 25,
        maxColors: 6,
        adjacencyMode: "touch"
      });
    } catch (e) {
      // Silently handle coloring errors
      colored = polys;
    }
    return colored;
  }, []);

  // ========================================================================
  // LOAD MAP SHAPES
  // ========================================================================

  const loadMapShapesByContext = useCallback(async ({ year, era }) => {
    if (!projectId) return;
    if (maybeHandleMaMapShapes({ era, mapRef: map, finalFeaturesRef })) return;
    
    console.log("🔄 Loading shapes for year:", year, "era:", era);
    try {
      const response = await getAllMapShapes(projectId, year, era);
      const shapesFromBackend = response?.mapShapes || response || [];
      const features = shapesFromBackend.flatMap((shape) => {
        const sid = shape?.shapeId || shape?.id;
        const feats = shape?.geojson?.features || [];
        return feats.map((feat) => ({
          ...feat,
          properties: { 
            ...feat.properties, 
            id: sid || feat.properties?.id,
            year: shape?.yearInTimeline?.year,
            era: shape?.yearInTimeline?.era
          }
        }));
      });
      finalFeaturesRef.current = features;
      map.current?.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({ 
        type: "FeatureCollection", 
        features 
      });
      console.log("🎨 Map source updated with features");
    } catch (err) {
      console.error("❌ Error loading shapes:", err);
      finalFeaturesRef.current = [];
      map.current?.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({ 
        type: "FeatureCollection", 
        features: [] 
      });
    }
  }, [projectId]);

  // ========================================================================
  // GLOBE PROJECTION SETUP
  // ========================================================================

  const setupGlobeProjection = useCallback(() => {
    if (!map.current) return;
    try {
      map.current.setProjection({ type: "globe" });
      if (map.current.setFog) {
        map.current.setFog({
          color: "#d6e7ff",
          "high-color": "#add3ff",
          "space-color": "rgba(0, 0, 0, 0)",
          "horizon-blend": 0.02,
        });
      }
      const canvas = map.current.getCanvas();
      if (canvas) canvas.style.backgroundColor = "transparent";
    } catch (e) {
      // Silently handle projection setup errors
    }
  }, []);

  // ========================================================================
  // OPTIMIZED POLYGON UPDATE
  // ========================================================================

  const updateMapPolygons = useCallback((polys, animated = false) => {
    if (!map.current) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    rawPolygonsRef.current = polys;
    const zoom = map.current.getZoom();
    const tolerance = getSimplificationTolerance(polys, zoom, yearRef.current);
    
    let processedPolys = polys;
    if (tolerance > 0) {
      const cacheKey = `${yearRef.current}-${polys.length}`;
      processedPolys = simplifyPolygons(polys, tolerance, cacheKey);
    }
    
    const colored = processPolygons(processedPolys);
    const labels = buildEmpireLabelPoints(colored);
    
    const doUpdate = () => {
      try {
        const polygonSource = map.current?.getSource("polygons-source");
        const labelSource = map.current?.getSource("empire-labels-source");
        
        if (polygonSource) {
          polygonSource.setData({
            type: "FeatureCollection",
            features: colored
          });
        }
        
        if (labelSource) {
          labelSource.setData(labels);
        }
      } catch (e) {
        console.error('[MapView] Update failed:', e);
      }
    };
    
    if (animated) {
      animationFrameRef.current = requestAnimationFrame(doUpdate);
    } else {
      doUpdate();
    }
    
    prevPolygonsRef.current = colored;
  }, [processPolygons, buildEmpireLabelPoints, getSimplificationTolerance, simplifyPolygons]);

  const handleZoomChange = useCallback(() => {
    if (!map.current || !rawPolygonsRef.current.length) return;
    const zoom = map.current.getZoom();
    setCurrentZoom(zoom);
    clearTimeout(zoomDebounceRef.current);
    zoomDebounceRef.current = setTimeout(() => {
      updateMapPolygons(rawPolygonsRef.current, true);
    }, 200);
  }, [updateMapPolygons]);

  const initializeMapLayers = useCallback(() => {
    if (!map.current) return;
    
    // Add drawing layers FIRST
    addDrawingSources(map.current);
    addDrawingLayers(map.current);
    
    // Polygon source
    if (!map.current.getSource("polygons-source")) {
      map.current.addSource("polygons-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        buffer: 64,
        tolerance: 0.1, 
        cluster: false,
        generateId: true
      });
    }
    
    // Label source
    if (!map.current.getSource("empire-labels-source")) {
      map.current.addSource("empire-labels-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    
    // Subtle glow/shadow layer behind polygons for depth
    if (!map.current.getLayer("polygon-glow")) {
      map.current.addLayer({
        id: "polygon-glow",
        type: "fill",
        source: "polygons-source",
        paint: {
          "fill-color": "#5C4A37", // Darker sepia for more visible shadow
          "fill-opacity": 0.25, // Increased opacity for better visibility
          "fill-antialias": true,
        }
      }, "polygon-fill"); // Insert before polygon-fill
    } else {
      // Update existing glow layer properties
      try {
        map.current.setPaintProperty("polygon-glow", "fill-color", "#5C4A37");
        map.current.setPaintProperty("polygon-glow", "fill-opacity", 0.25);
      } catch (e) {
        // Silently handle property update errors
      }
    }
    
    // Polygon fill layer - merged with hillshade for realistic terrain effect
    if (!map.current.getLayer("polygon-fill")) {
      map.current.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygons-source",
        paint: {
          "fill-color": [
            "case",
            ["has", "colorIndex"],
            [
              "match",
              ["get", "colorIndex"],
              0, colorIndexToHex(0),
              1, colorIndexToHex(1),
              2, colorIndexToHex(2),
              3, colorIndexToHex(3),
              4, colorIndexToHex(4),
              5, colorIndexToHex(5),
              colorIndexToHex(0)
            ],
            "#B8860B" 
          ],
          "fill-opacity": 0.65, // Increased opacity to show colors clearly while allowing hillshade through
          "fill-antialias": true,
        }
      });
    } else {
      // Update existing layer properties to ensure opacity is applied
      try {
        map.current.setPaintProperty("polygon-fill", "fill-opacity", 0.65);
        // Remove blend mode if it exists to ensure colors are visible
        try {
          map.current.setLayoutProperty("polygon-fill", "fill-blend-mode", undefined);
        } catch (_) {}
      } catch (e) {
        // Silently handle property update errors
      }
    }
    
    // Shadow border layer behind main border for depth effect
    if (!map.current.getLayer("polygon-border-shadow")) {
      map.current.addLayer({
        id: "polygon-border-shadow",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#2A1F14", // Dark shadow color
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 2.5, 
            4, 3.0, 
            10, 4.0 
          ],
          "line-opacity": 0.4, // Shadow opacity
          "line-blur": 2.0, // Strong blur for shadow effect
        },
      }, "polygon-border"); // Insert before polygon-border
    } else {
      // Update existing shadow border properties
      try {
        map.current.setPaintProperty("polygon-border-shadow", "line-color", "#2A1F14");
        map.current.setPaintProperty("polygon-border-shadow", "line-opacity", 0.4);
        map.current.setPaintProperty("polygon-border-shadow", "line-blur", 2.0);
        map.current.setPaintProperty("polygon-border-shadow", "line-width", [
          "interpolate", ["linear"], ["zoom"],
          1, 2.5, 
          4, 3.0, 
          10, 4.0 
        ]);
      } catch (e) {
        // Silently handle property update errors
      }
    }
    
    // Polygon border layer - subtle borders that work with hillshade
    if (!map.current.getLayer("polygon-border")) {
      map.current.addLayer({
        id: "polygon-border",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": [
            "case",
            ["has", "colorIndex"],
            [
              "match",
              ["get", "colorIndex"],
              0, colorIndexToHexDark(0),
              1, colorIndexToHexDark(1),
              2, colorIndexToHexDark(2),
              3, colorIndexToHexDark(3),
              4, colorIndexToHexDark(4),
              5, colorIndexToHexDark(5),
              colorIndexToHexDark(0)
            ],
            "#8B6914" 
          ],
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 1.0, 
            4, 1.5, 
            10, 2.5 
          ],
          "line-opacity": 0.85, // Slightly reduced opacity for subtle borders that blend with terrain
          "line-blur": 0.5, // Soft blur for elegant borders
        },
      });
    } else {
      // Update existing layer properties to ensure opacity and line width are applied
      try {
        map.current.setPaintProperty("polygon-border", "line-opacity", 0.85);
        map.current.setPaintProperty("polygon-border", "line-blur", 0.5);
        map.current.setPaintProperty("polygon-border", "line-width", [
          "interpolate", ["linear"], ["zoom"],
          1, 1.0, 
          4, 1.5, 
          10, 2.5 
        ]);
      } catch (e) {
        // Silently handle property update errors
      }
    }
    
    // Empire labels
    if (!map.current.getLayer("empire-labels")) {
      map.current.addLayer({
        id: "empire-labels",
        type: "symbol",
        source: "empire-labels-source",
        minzoom: 2,
        maxzoom: 14,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            2, 7,
            4, 9,
            6, 11,
            8, 12,
            10, 14,
            12, 16,
            14, 18
          ],
          
          "text-anchor": "center",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          
          // UPDATED: Changed back to 10.
          // This allows text to wrap to multiple lines if the name is long.
          "text-max-width": 10,
          
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "symbol-sort-key": ["*", -1, ["coalesce", ["get", "area"], 0]],
        },
        paint: {
          "text-color": "#1a1a1a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-halo-blur": 1,
          "text-opacity": [
            "interpolate", ["linear"], ["zoom"],
            2, 0.8, 5, 0.95, 8, 1
          ],
        }
      });
    }
    
    // White border line - appears right after the main border for glow effect
    if (!map.current.getLayer("polygon-empire-white-border")) {
      map.current.addLayer({
        id: "polygon-empire-white-border",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFFFFF", // White color
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 1.5, 
            4, 2.0, 
            10, 2.5 
          ],
          "line-opacity": 0.9, // High opacity white line
          "line-blur": 0.3, // Minimal blur for crisp white line
        },
        filter: ["==", ["id"], "never-match-this-id"], // Initially hidden
      }, "empire-labels");
    }
    
    // Empire glow border layers - creates fading glow effect
    // Multiple layers with increasing blur and decreasing opacity for realistic fade
    if (!map.current.getLayer("polygon-empire-glow-outer")) {
      // Outer glow layer - most blurred and faded
      map.current.addLayer({
        id: "polygon-empire-glow-outer",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFD700", // Golden glow color
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 10.0, 
            4, 12.0, 
            10, 14.0 
          ],
          "line-opacity": 0.25, // Very faded
          "line-blur": 7.0, // Maximum blur for outer glow
        },
        filter: ["==", ["id"], "never-match-this-id"], // Initially hidden
      }, "empire-labels");
    }
    
    if (!map.current.getLayer("polygon-empire-glow-middle")) {
      // Middle glow layer - medium blur
      map.current.addLayer({
        id: "polygon-empire-glow-middle",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFD700", // Golden glow color
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 6.0, 
            4, 7.5, 
            10, 9.0 
          ],
          "line-opacity": 0.45, // Medium opacity
          "line-blur": 4.0, // Medium blur
        },
        filter: ["==", ["id"], "never-match-this-id"], // Initially hidden
      }, "empire-labels");
    }
    
    if (!map.current.getLayer("polygon-empire-glow-inner")) {
      // Inner glow layer - closest to white border, less blur
      map.current.addLayer({
        id: "polygon-empire-glow-inner",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFD700", // Golden glow color
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 3.5, 
            4, 4.0, 
            10, 4.5 
          ],
          "line-opacity": 0.75, // Higher opacity
          "line-blur": 2.0, // Less blur for inner glow
        },
        filter: ["==", ["id"], "never-match-this-id"], // Initially hidden
      }, "empire-labels");
    }
  }, []);

  // ========================================================================
  // SETUP DRAWING TOOLS
  // ========================================================================

  const setupDrawingTools = useCallback(() => {
    if (!map.current) return;

    const worker = new Worker(
      new URL("../../draw/workers/geometry.worker.js", import.meta.url),
      { type: "module" }
    );

// Updated createOnFinalize to accept extraProps (like color)
const createOnFinalize = (prefix, tool, geometryType = "LineString") => (coords, extraProps = {}) => {
    const id = `${prefix}_${Date.now()}_${featureSeqRef.current++}`;
    
    const geometry = geometryType === "Polygon"
      ? { type: "Polygon", coordinates: [coords] }
      : { type: geometryType, coordinates: coords };
      
    const feature = {
      type: "Feature",
      properties: { 
          id, 
          tool, 
          created_at: new Date().toISOString(),
          // --- ADD THIS LINE ---
          ...extraProps // This adds { color: "#..." } to the feature
      },
      geometry
    };
    
    finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
    
    map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
      type: "FeatureCollection",
      features: finalFeaturesRef.current
    });

    // Show selection overlay for the new shape
    selectedFeatureIdRef.current = id;
    let anchor = null;
    if (geometry.type === "LineString" && geometry.coordinates.length > 0) {
      anchor = geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
    } else if (geometry.type === "Polygon" && geometry.coordinates[0]?.length > 0) {
      anchor = geometry.coordinates[0][Math.floor(geometry.coordinates[0].length / 2)];
    } else if (geometry.type === "Point") {
      anchor = geometry.coordinates;
    }
    if (anchor) {
      selectionOverlay.show({ lng: anchor[0], lat: anchor[1] });
    }
};

    const controllers = {
      freehand: new FreehandController({
        map: map.current,
        liveSourceId: LAYER_IDS.LIVE_SOURCE,
        worker,
        tool: "freehand",
        onFinalize: createOnFinalize("fh", "freehand")
      }),
      highlight: new FreehandController({
        map: map.current,
        liveSourceId: LAYER_IDS.LIVE_SOURCE,
        worker,
        tool: "highlight",
        onFinalize: createOnFinalize("hl", "highlight")
      }),
      line: new LineController({
        map: map.current,
        liveSourceId: LAYER_IDS.LIVE_SOURCE,
        onFinalize: createOnFinalize("ln", "line")
      }),
      polygon: new PolygonController({
        map: map.current,
        liveSourceId: LAYER_IDS.LIVE_SOURCE,
        onFinalize: (ring) => createOnFinalize("pg", "polygon", "Polygon")(ring)
      }),
      circle: new CircleController({
        map: map.current,
        liveSourceId: LAYER_IDS.LIVE_SOURCE,
        onFinalize: (ring) => createOnFinalize("cr", "circle", "Polygon")(ring)
      }),
      arrow: new ArrowController({
        map: map.current,
        liveSourceId: LAYER_IDS.LIVE_SOURCE,
        onFinalize: ({ shaft, head }) => {
          const id = `ar_${Date.now()}_${featureSeqRef.current++}`;
          finalFeaturesRef.current.push(
            {
              type: "Feature",
              properties: { id, tool: "arrow" },
              geometry: { type: "LineString", coordinates: shaft }
            },
            {
              type: "Feature",
              properties: { id, tool: "arrow" },
              geometry: { type: "Polygon", coordinates: [head] }
            }
          );
          map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
            type: "FeatureCollection",
            features: finalFeaturesRef.current
          });

          // Show selection overlay for the arrow
          selectedFeatureIdRef.current = id;
          const anchor = shaft[Math.floor(shaft.length / 2)];
          if (anchor) {
            selectionOverlay.show({ lng: anchor[0], lat: anchor[1] });
          }
        }
      }),
    };

    const noteManager = createNoteManager({
      map,
      dispatch,
      openNotesAction: openNotes,
      yearRef,
      projectIdParam: projectId,
      reduxStore
    });

    const textToolbar = createTextToolbar(map, {
      finalFeaturesRef,
      onSaveNew: async (lngLat, text, size, color) => {
        const currentEmail = ownerEmailRef.current;
        const feature = createTextFeature([lngLat.lng, lngLat.lat], text, size, color);
        finalFeaturesRef.current.push(feature);
        map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
          type: "FeatureCollection",
          features: finalFeaturesRef.current
        });

        try {
          const res = await createMapShape(
            projectId,
            getAbsoluteYear(yearRef.current),
            getEraForYear(yearRef.current),
            currentEmail,
            { type: 'FeatureCollection', features: [feature] }
          );
          if (res?.shapeId) {
            feature.properties.id = res.shapeId;
            map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
              type: "FeatureCollection",
              features: finalFeaturesRef.current
            });
          }
        } catch (_) {}
      },
// Inside setupDrawingTools -> createTextToolbar options:

onSaveEdit: async (id, text, size, color) => {
    // 1. Find the existing feature
    const idx = finalFeaturesRef.current.findIndex(f => String(f.properties?.id) === String(id));

    if (idx === -1) {
        console.error("Could not find feature to edit:", id);
        return;
    }

    const oldFeature = finalFeaturesRef.current[idx];

    // 2. SANITIZE: Create a CLEAN GeoJSON object
    // We strictly construct only the fields GeoJSON needs. 
    // This strips out any internal MapLibre properties (layer, source, etc.) that might cause rendering issues.
    const updatedFeature = {
        type: "Feature",
        id: oldFeature.id || id, // Preserve top-level ID if it exists
        geometry: {
            type: oldFeature.geometry.type,
            coordinates: oldFeature.geometry.coordinates // Preserve coordinates exactly
        },
        properties: {
            ...oldFeature.properties, // Keep existing props (like created_at, tool)
            text: sanitizeText(text), // Update text
            fontSize: Number(size),   // Ensure Number type
            color: color,
            id: id                    // Ensure Property ID matches
        }
    };

    // 3. Update Local State & Repaint
    finalFeaturesRef.current[idx] = updatedFeature;
    
    // Using a new array reference [...] ensures React/MapLibre detects the change
    const newFeatureCollection = {
        type: "FeatureCollection",
        features: [...finalFeaturesRef.current]
    };
    
    map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData(newFeatureCollection);

    // 4. API Call
    try {
        if (id && !String(id).includes('_')) {
            console.log("Saving text edit to server...", id);
            // Wrap in FeatureCollection for the API payload
            const updatePayload = {
                geojson: {
                    type: 'FeatureCollection',
                    features: [updatedFeature]
                },
                yearInTimeline: {
                    year: updatedFeature.properties.year,
                    era: updatedFeature.properties.era
                }
            };
            const currentEmail = ownerEmailRef.current;
            console.log({id, currentEmail, updatePayload});

            await updateMapShape(id, currentEmail, updatePayload);
            console.log("✅ Text successfully updated on server");
        }
    } catch (err) {
        console.error("❌ Failed to save text edit to server:", err);
    }
},
      onDelete: async (id) => {
        if (!id) return;
        const isSaved = !String(id).includes('_');
        const currentEmail = ownerEmailRef.current;
        if (isSaved) try { await deleteMapShape(id, currentEmail); } catch (_) {}
        finalFeaturesRef.current = finalFeaturesRef.current.filter(
          f => f.properties?.id !== id
        );
        map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
          type: "FeatureCollection",
          features: finalFeaturesRef.current
        });
      }
    });

    const selectionOverlay = createSelectionOverlay(map, {
      finalFeaturesRef,
      selectedFeatureIdRef,
      onSave: async () => {
        const id = selectedFeatureIdRef.current;
        if (!id) return;
        const features = finalFeaturesRef.current.filter(f => f.properties?.id === id);
        const currentEmail = ownerEmailRef.current;
        if (features.length) {
          try {
            const res = await createMapShape(
              projectId,
              getAbsoluteYear(yearRef.current),
              getEraForYear(yearRef.current),
              currentEmail,
              { type: 'FeatureCollection', features }
            );
            if (res?.shapeId) {
              finalFeaturesRef.current = finalFeaturesRef.current.map(f =>
                f.properties?.id === id
                  ? { ...f, properties: { ...f.properties, id: res.shapeId } }
                  : f
              );
              map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
                type: "FeatureCollection",
                features: finalFeaturesRef.current
              });
            }
          } catch (_) {}
        }
      },
      onDelete: async () => {
        const id = selectedFeatureIdRef.current;
        if (!id) return;
        const isSaved = !String(id).includes('_');
        const currentEmail = ownerEmailRef.current;
        if (isSaved) try { await deleteMapShape(id, currentEmail); } catch (_) {}
        finalFeaturesRef.current = finalFeaturesRef.current.filter(
          f => f.properties?.id !== id
        );
        map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
          type: "FeatureCollection",
          features: finalFeaturesRef.current
        });
        selectedFeatureIdRef.current = null;
      }
    });

    const onSelectClick = (e) => {
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ["draw-final-line", "draw-final-fill", "draw-final-text"]
      });
      if (features?.length) {
        const f = features[0];
        const id = f.properties?.id;
        selectedFeatureIdRef.current = id;

        if (f.properties?.tool === 'text') {
          const coords = f.geometry?.coordinates;
          if (coords) textToolbar.showEdit(f, { lng: coords[0], lat: coords[1] });
          return;
        }

        map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], id || "__none__"]);
        map.current.setFilter("draw-final-fill-selected", ["==", ["get", "id"], id || "__none__"]);

        const coords = f.geometry?.coordinates;
        let anchor = null;
        if (f.geometry?.type === "LineString" && coords?.length > 1) {
          anchor = coords[Math.floor(coords.length / 2)];
        }
        if (f.geometry?.type === "Polygon" && coords?.[0]?.length > 2) {
          anchor = coords[0][Math.floor(coords[0].length / 2)];
        }
        if (anchor) selectionOverlay.show({ lng: anchor[0], lat: anchor[1] });
      } else {
        selectedFeatureIdRef.current = null;
        map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]);
        map.current.setFilter("draw-final-fill-selected", ["==", ["get", "id"], "__none__"]);
        selectionOverlay.hide();
      }
    };

    const cursorManager = createCursorManager(map);
    const manager = imageManager(map,dispatch);
    const hyperlinker = hyperlinkManager(map,dispatch);

    const modeController = createDrawModeController({
      mapRef: map,
      cursorManager,
      controllers,
      textToolbar,
      selectionOverlay,
      noteManager,
      imageManager: manager,
      hyperlinkManager: hyperlinker,
      finalFeaturesRef,
      selectedFeatureIdRef,
      onSelectClick
    });

const onEmpireClick = async (e) => {
      if (currentToolRef.current !== 'select') return;
      
      // 1. Priority: Check drawing tools first
      const drawingFeatures = map.current.queryRenderedFeatures(e.point, {
        layers: ["draw-final-line", "draw-final-fill", "draw-final-text"]
      });
      
      if (drawingFeatures?.length) {
        onSelectClick(e); 
        return;
      }
      
      // 2. Check for empire clicks
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ["polygon-fill", "polygon-border"]
      });
      
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

      if (features?.length) {
        const feature = features[0];
        const empireId = feature.properties?.id; 
        const empireName = feature.properties?.name || feature.properties?.Name;
        
        console.log(empireName);
        
        if (empireId) {
            selectedEmpireNameRef.current = empireId;
            const filterExpr = ["==", ["get", "id"], empireId];
            try {
                map.current.setFilter("polygon-empire-white-border", filterExpr);
                map.current.setFilter("polygon-empire-glow-outer", filterExpr);
                map.current.setFilter("polygon-empire-glow-middle", filterExpr);
                map.current.setFilter("polygon-empire-glow-inner", filterExpr);
                
                // SUBTLE GLOW UPDATES
                map.current.setPaintProperty("empire-labels", "text-halo-color", [
                    "case", ["==", ["get", "id"], empireId], "rgba(255, 215, 0, 0.5)", "#ffffff"
                ]);
                map.current.setPaintProperty("empire-labels", "text-halo-width", [
                    "case", ["==", ["get", "id"], empireId], 3, 2
                ]);
                map.current.setPaintProperty("empire-labels", "text-halo-blur", [
                    "case", ["==", ["get", "id"], empireId], 2, 1
                ]);
            } catch (e) { console.error("Glow filter error:", e); }
        } else if (empireName) {
            selectedEmpireNameRef.current = empireName;
            const filterExpr = ["==", ["get", "name"], empireName];
            try {
                map.current.setFilter("polygon-empire-white-border", filterExpr);
                map.current.setFilter("polygon-empire-glow-outer", filterExpr);
                map.current.setFilter("polygon-empire-glow-middle", filterExpr);
                map.current.setFilter("polygon-empire-glow-inner", filterExpr);
                
                // SUBTLE GLOW UPDATES
                map.current.setPaintProperty("empire-labels", "text-halo-color", [
                    "case", ["==", ["get", "name"], empireName], "rgba(255, 215, 0, 0.5)", "#ffffff"
                ]);
                map.current.setPaintProperty("empire-labels", "text-halo-width", [
                    "case", ["==", ["get", "name"], empireName], 3, 2
                ]);
                map.current.setPaintProperty("empire-labels", "text-halo-blur", [
                    "case", ["==", ["get", "name"], empireName], 2, 1
                ]);
            } catch (e) {}
        }

        if (empireId) {
            try {
                const data = await getMetadataByEmpireId(empireId);

                if (data) {
                    currentMetadataRef.current = data;
                    const hasImages = data.images && Array.isArray(data.images) && data.images.length > 0;

const htmlContent = `
    <style>
        /* Removes MapLibre's default white styling, borders, and the popup arrow tip */
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
        .maplibregl-popup-tip { display: none !important; }
        
        .dyno-scroll::-webkit-scrollbar { width: 3px; }
        .dyno-scroll::-webkit-scrollbar-track { background: transparent; }
        .dyno-scroll::-webkit-scrollbar-thumb { background-color: rgba(42, 31, 20, 0.2); border-radius: 10px; }
        
        /* Smooth Reveal for the Gallery Panel */
        .gallery-panel {
            transition: opacity 0.3s ease, transform 0.3s ease;
            opacity: 1;
            transform: translateX(0);
            display: flex;
        }
        .popup-collapsed .gallery-panel { 
            opacity: 0;
            transform: translateX(-10px);
            position: absolute;
            pointer-events: none;
            visibility: hidden;
            z-index: -1;
        }

        /* Targeted Width Animation */
        .animate-resize {
            transition: width 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }

        #popup-wrapper:not(.popup-collapsed) .outside-icon-container { display: none !important; }
    </style>

    <div id="popup-wrapper" class="flex gap-1 resize overflow-hidden relative ${hasImages ? '' : 'popup-collapsed'}" 
         style="width: ${hasImages ? '704px' : '380px'}; height: 350px; min-width: ${hasImages ? '704px' : '380px'}; min-height: 250px; padding: 2px;">
        
        <div class="flex-1 min-w-[320px] bg-[#f1ebe3] rounded-lg shadow-xl border border-[#d4c5b0] flex flex-col relative z-10 py-2 px-4 h-full">
            
            <div class="flex justify-between items-center w-full mb-2 border-b border-black/10 pb-2 h-[48px] shrink-0">
                <h3 class="text-[#2A1F14] font-bold text-sm leading-snug pr-2 flex-1 line-clamp-2">
                    ${data.name || empireName || 'Empire Details'}
                </h3>
                
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[10px] text-[#8c7b6e] font-medium tracking-tight">To know more</span>
                    <button class="bg-[#075e54] text-white px-4 py-1.5 rounded-full shadow hover:bg-[#054c44] transition-all duration-200 font-['Potta_One'] text-[10px] tracking-widest uppercase whitespace-nowrap" onclick="window.handleAskDyno()">
                        Ask Dyno
                    </button>
                </div>
            </div>
            
            <div class="dyno-scroll flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-0 min-h-0">
                ${Object.entries(data)
                    .filter(([key]) => !['name', 'id', 'empire_id', 'images'].includes(key.toLowerCase()))
                    .map(([key, value]) => `
                        <div class="flex items-start text-xs border-b border-black/5 last:border-0">
                            <span class="font-semibold text-[#6b5b4e] capitalize w-[90px] shrink-0 text-left py-1.5 pr-1 break-words whitespace-normal leading-tight">${key.replace(/_/g, ' ')}</span> 
                            <div class="w-px min-w-[1px] shrink-0 bg-black/15 mx-2 my-1 self-stretch"></div>
                            <span class="font-medium text-gray-800 text-left leading-tight break-words whitespace-normal min-w-0 flex-1 py-1.5">${value !== null && value !== undefined && value !== '' ? value : '-'}</span>
                        </div>
                    `).join('')}
            </div>
        </div>

        ${hasImages ? `
        <div class="outside-icon-container flex items-start shrink-0 h-full pt-1">
            <button onclick="
                const wrapper = document.getElementById('popup-wrapper');
                wrapper.classList.add('animate-resize');
                wrapper.classList.remove('popup-collapsed');
                wrapper.style.minWidth = '704px';
                wrapper.style.width = (wrapper.offsetWidth + 324) + 'px';
                setTimeout(() => wrapper.classList.remove('animate-resize'), 350);
            " class="bg-[#f1ebe3] hover:bg-[#e0d5c1] border border-[#d4c5b0] text-[#2A1F14] rounded-full w-8 h-8 flex items-center justify-center shadow-md transition-colors shrink-0" title="Open Gallery">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
            </button>
        </div>
        ` : ''}

        ${hasImages ? `
        <div class="gallery-panel w-[320px] shrink-0 bg-[#f1ebe3] rounded-lg shadow-xl border border-[#d4c5b0] p-4 flex flex-col overflow-hidden relative z-10 h-full">
            
            <div class="flex justify-between items-center w-full mb-2 border-b border-black/10 pb-2 h-[48px] shrink-0">
                <h3 class="text-[#2A1F14] font-bold text-sm leading-snug">Gallery</h3>
                
                <button onclick="
                    const wrapper = document.getElementById('popup-wrapper');
                    wrapper.classList.add('animate-resize');
                    wrapper.classList.add('popup-collapsed');
                    wrapper.style.minWidth = '380px';
                    wrapper.style.width = Math.max(380, wrapper.offsetWidth - 324) + 'px';
                    setTimeout(() => wrapper.classList.remove('animate-resize'), 350);
                " class="bg-black/5 hover:bg-black/10 border border-black/10 text-[#2A1F14] rounded-full w-7 h-7 flex items-center justify-center transition-colors shrink-0" title="Close Gallery">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="dyno-scroll flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-3 min-h-0">
                ${data.images.map(img => `
                    <div class="flex flex-col gap-1">
                        <img src="${img.url}" alt="${img.caption || 'Empire Image'}" class="w-full h-auto rounded border border-black/10 object-cover" loading="lazy" />
                        ${img.caption ? `<span class="text-[10px] text-[#6b5b4e] italic text-center px-1">${img.caption}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

    </div>
`;

                    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: "none" })
                        .setLngLat(e.lngLat)
                        .setHTML(htmlContent)
                        .addTo(map.current);
                }
            } catch (err) { console.error(err); }
        }
      } else {
         // Cleanup
         if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
         selectedEmpireNameRef.current = null;
         currentMetadataRef.current = null;
         
         // Remove Glow
         try { 
             const hideExpr = ["==", ["id"], "never-match-this-id"];
             map.current.setFilter("polygon-empire-white-border", hideExpr); 
             map.current.setFilter("polygon-empire-glow-outer", hideExpr);
             map.current.setFilter("polygon-empire-glow-middle", hideExpr);
             map.current.setFilter("polygon-empire-glow-inner", hideExpr);

             map.current.setPaintProperty("empire-labels", "text-halo-color", "#ffffff");
             map.current.setPaintProperty("empire-labels", "text-halo-width", 2);
             map.current.setPaintProperty("empire-labels", "text-halo-blur", 1);
         } catch(e){} 
      }
    };
    
    // Add click handler for empire polygons (runs after onSelectClick)
    map.current.on("click", onEmpireClick);
    
    map.current.on("move", () => {
      selectionOverlay.updatePosition();
      textToolbar.updatePosition();
    });

    // Export APIs
    window.mapxDrawSetMode = (mode, color = null) => {
    currentToolRef.current = mode;
    modeController.setMode(mode, color);
};
    window.mapxDrawGetAll = () => ({
      type: "FeatureCollection",
      features: [...finalFeaturesRef.current]
    });
    window.mapxFlyTo = (input) => {
      let lng, lat, zoom;
      if (Array.isArray(input)) [lng, lat] = input;
      else if (input) { lng = input.lng; lat = input.lat; zoom = input.zoom; }
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        map.current.flyTo({
          center: [lng, lat],
          zoom: zoom ?? Math.max(map.current.getZoom(), 5),
          // padding: { right: 350 }
        });
      }
    };

    window.mapxSetStyle = async (theme) => {
      if (theme?.startsWith('http')) { 
        try {
          map.current.setStyle(theme); 
        } catch (error) {
          console.error('[MapView] Failed to set style from URL:', error);
        }
        return; 
      }
      
      try {
        const provider = getEffectiveProvider();
        const validThemes = ['basic', 'light'];
        if (!validThemes.includes(theme)) {
          theme = 'basic';
        }
        const style = await getBaseStyleWithFallback(provider, theme, MAPTILER_KEY);
        if (style) {
          const cacheKey = `${provider}-${theme}-${MAPTILER_KEY || 'none'}`;
          const styleCache = (await import('./utils/mapStyles')).styleCache;
          if (styleCache && styleCache.delete) {
            styleCache.delete(cacheKey);
          }
          map.current.setStyle(style);
        }
      } catch (error) {
        console.error('[MapView] Failed to set style:', error);
      }
    };
    window.mapxSetSatellite = () => map.current.setStyle(buildCloudlessStyle());

    const initialContext = {
      year: getAbsoluteYear(year),
      projectIdParam: projectId,
      era: getEraForYear(year)
    };
    handleInitialMaContext({
      context: initialContext,
      onLoad: manager.loadImagesByContext,
      onClear: manager.clearAllImages
    });
    handleInitialMaContext({
      context: initialContext,
      onLoad: hyperlinker.loadHyperlinksByContext,
      onClear: hyperlinker.clearAllHyperlinks
    });

    window.mapxImagesLoadByContext = createMaSafeLoader({
      onLoad: manager.loadImagesByContext,
      onClear: manager.clearAllImages
    });
    window.mapxHyperlinksLoadByContext = createMaSafeLoader({
      onLoad: hyperlinker.loadHyperlinksByContext,
      onClear: hyperlinker.clearAllHyperlinks
    });

    return { manager, hyperlinker, noteManager };
  }, [projectId, ownerEmail, year, dispatch]);

  // Reload shapes when year changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    loadMapShapesByContext({ year: getAbsoluteYear(year), era: getEraForYear(year) });
  }, [year, loadMapShapesByContext]);

  // ========================================================================
  // SETUP CONTROLS
  // ========================================================================

  const setupControls = useCallback(() => {
    if (!map.current) return;

    const container = map.current.getContainer();
    container.querySelectorAll(".maplibregl-ctrl-bottom-left, .maplibregl-ctrl-top-left")
      .forEach(el => { el.style.left = `${leftOffset + 8}px`; el.style.zIndex = "20"; });
    container.querySelectorAll(".maplibregl-ctrl-bottom-right, .maplibregl-ctrl-top-right")
      .forEach(el => { el.style.right = `${rightOffset + 8}px`; el.style.zIndex = "20"; });

    const bottomLeft = container.querySelector(".maplibregl-ctrl-bottom-left");
    const bottomRight = container.querySelector(".maplibregl-ctrl-bottom-right");
    if (bottomLeft) bottomLeft.style.bottom = "130px";
    // if (bottomRight) bottomRight.style.bottom = "130px";

    map.current.addControl(new ScreenshotControl(), "bottom-left");
    map.current.addControl(new MeasureDistanceControl(), "bottom-left");
    map.current.addControl(new PhotonSearchControl(), "bottom-left");
    map.current.addControl(new CompactAttributionControl(), "bottom-right");
    map.current.addControl(new ZoomControl(), "bottom-right");
    map.current.addControl(new ResetNorthControl(), "bottom-right");

  }, [leftOffset, rightOffset]);

  const customLayers = useSelector((state) => state.layers.layers);
  useLayerManager(map, customLayers,dispatch);
// Effect to handle the "Ask Dyno" event dispatch
  useEffect(() => {
    window.handleAskDyno = () => {
      const data = currentMetadataRef.current;
      if (!data) {
        console.warn("No metadata found for Ask Dyno");
        return;
      }

      // 1. Get the Empire Name
      const name = data["Empire Name"] || "This empire";

      // 2. Stringify the Metadata
      // We filter out internal IDs and join the rest into a readable string
      const contextString = Object.entries(data)
        .filter(([key]) => !['id', 'empire_id', 'name', '_id'].includes(key.toLowerCase())) // Exclude ID and Name (since name is in the prompt)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      const queryText = `Tell me more about ${name}.//////${contextString}`;
      // console.log({queryText})
      // 4. Dispatch the Event
      const event = new CustomEvent('trigger-know-more', { 
        detail: { 
          query: queryText,
        } 
      });
      
      window.dispatchEvent(event);
    };

    return () => {
      delete window.handleAskDyno;
    };
  }, []);

  useEffect(() => {
    if (map.current) return;

    let managersRef = { manager: null, hyperlinker: null, noteManager: null };

    (async () => {
      try {
        const provider = getEffectiveProvider();
        const initialTheme = 'basic';
        const initialStyle = await getBaseStyleWithFallback(
          provider,
          initialTheme,
          MAPTILER_KEY
        );
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: initialStyle,
          center: [78.9629, 20.5937],
          zoom: 2,
          projection: { type: "globe" },
          attributionControl: false,
          fadeDuration: 0,
          trackResize: true,
          refreshExpiredTiles: false,
        });
      } catch (error) {
        console.error('[MapView] Failed to initialize map with provider style:', error);
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [78.9629, 20.5937],
          zoom: 2,
          projection: { type: "globe" },
          attributionControl: false,
          fadeDuration: 0,
          trackResize: true,
          refreshExpiredTiles: false,
        });
      }
      attachMapViewCollector(map.current);
      maOverlayManagerRef.current = createMaOverlayManager(map, yearRef);

      // Add error event listener for tile loading failures
      if (!map.current.__ml_error_hook) {
        map.current.__ml_error_hook = true;
        map.current.on("error", (e) => {
          const error = e && e.error ? e.error : e;
          if (error && error.message) {
            if (error.message.includes('tile') || error.message.includes('Failed to load')) {
              // Silently handle tile loading errors (non-critical)
            } else {
              console.error('[MapView] MapLibre error:', error);
            }
          }
        });
      }

      // ... inside MapView.js useEffect ...

    map.current.on("load", () => {
        maOverlayManagerRef.current?.handleMapLoad();
        setupGlobeProjection();
        initializeMapLayers();
        setupControls();
        
        // 1. Initialize Tools
        const tools = setupDrawingTools(); 
        
        // 2. Assign to local ref for external use if needed
        managersRef = tools; 

        // 3. FORCE Select mode by default on load
        if (window.mapxDrawSetMode) {
            window.mapxDrawSetMode("select");
        }

        if (polygonsRef.current && polygonsRef.current.length > 0) {
            updateMapPolygons(polygonsRef.current, false);
        }

        loadMapShapesByContext({
            year: getAbsoluteYear(year),
            era: getEraForYear(year)
        });
    });

      map.current.on("zoomend", handleZoomChange);
      map.current.on("zoom", () => setCurrentZoom(map.current.getZoom()));

      map.current.on("styledata", () => {
        maOverlayManagerRef.current?.handleStyleChange();
        setupGlobeProjection();
        initializeMapLayers();
        map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
          type: "FeatureCollection",
          features: finalFeaturesRef.current
        });
      });

      map.current.on("style.load", () => {
        setupGlobeProjection();
        initializeMapLayers();
        if (polygonsRef.current && polygonsRef.current.length > 0) {
          updateMapPolygons(polygonsRef.current, false);
        }
      });
    })();

    return () => {
      clearTimeout(zoomDebounceRef.current);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      maOverlayManagerRef.current?.dispose();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array - only run once!

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    dispatch(fetchAllEmpirePolygons());
    lastCenturyRef.current = getCenturyKey(year);
  }, [dispatch, getCenturyKey, year]);

useEffect(() => {
  if (isMaRange(year)) {
    return;
  }
  const currentCentury = getCenturyKey(year);
  
  const isFirstLoad = !lastCenturyRef.current;
  const isCenturyChange = lastCenturyRef.current !== currentCentury;

  if (isFirstLoad || isCenturyChange) {
    if (isCenturyChange) {
      simplificationCacheRef.current.clear();
    }

    dispatch(fetchAllEmpirePolygons());  
    lastCenturyRef.current = currentCentury;
  }
}, [year, dispatch, getCenturyKey]);

  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource("polygons-source");
    if (!source) return;

    const hasData = polygons && polygons.length > 0;
    const hadData = prevPolygonsRef.current && prevPolygonsRef.current.length > 0;
    if (!hasData && !hadData) return;

    const isYearChange = prevYearRef.current !== year;
    prevYearRef.current = year;

    updateMapPolygons(polygons, isYearChange);
  }, [polygons, year, updateMapPolygons]);

// ========================================================================
  // HANDLE YEAR CHANGES (for tools & popups)
  // ========================================================================

  useEffect(() => {
    if (!map.current) return;

    // 1. 👉 CLOSE THE POPUP
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // 2. 👉 RESET THE GLOW FILTERS
    // This ensures the "highlight" disappears from the old empire 
    selectedEmpireNameRef.current = null;
    try { 
        const hideExpr = ["==", ["id"], "never-match-this-id"];
        map.current.setFilter("polygon-empire-white-border", hideExpr); 
        map.current.setFilter("polygon-empire-glow-outer", hideExpr);
        map.current.setFilter("polygon-empire-glow-middle", hideExpr);
        map.current.setFilter("polygon-empire-glow-inner", hideExpr);

        map.current.setPaintProperty("empire-labels", "text-halo-color", "#ffffff");
        map.current.setPaintProperty("empire-labels", "text-halo-width", 2);
        map.current.setPaintProperty("empire-labels", "text-halo-blur", 1);
    } catch(e) {
        // Silently catch if layers aren't ready yet
    }

    // 3. Existing logic for overlays/tools
    maOverlayManagerRef.current?.handleYearChange();

    const ctx = { year: getAbsoluteYear(year), era: getEraForYear(year) };
    setTimeout(() => window.mapxNotesLoadByContext?.(ctx), 1000);
    setTimeout(() => window.mapxHyperlinksLoadByContext?.({ ...ctx, projectIdParam: projectId }), 1000);
    setTimeout(() => window.mapxImagesLoadByContext?.({ ...ctx, projectIdParam: projectId }), 300);
  }, [year, projectId]);

  // ========================================================================
  // CONTROL POSITIONING
  // ========================================================================

  useEffect(() => {
    if (!map.current) return;
    try {
      const container = map.current.getContainer();
      container.querySelectorAll(".maplibregl-ctrl-bottom-left, .maplibregl-ctrl-top-left")
        .forEach((el) => { el.style.left = `${leftOffset + 8}px`; });
      container.querySelectorAll(".maplibregl-ctrl-bottom-right, .maplibregl-ctrl-top-right")
        .forEach((el) => { el.style.right = `${rightOffset + 8}px`; });
    } catch (_) {}
  }, [leftOffset, rightOffset]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <GalaxyCanvas />

      <div
        ref={mapContainer}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          backgroundColor: "transparent",
        }}
      />

      {loading && (
        <div style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "10px 20px",
          borderRadius: 8,
          fontSize: 13,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 16,
            height: 16,
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          Loading...
        </div>
      )}

      {markerOn && (
  <div 
    className="absolute top-30 left-1/2 -translate-x-1/2 z-[1000]" 
    style={{ width: 'fit-content', borderRadius: '999px', overflow: 'hidden' }}
  >
    <LiquidGlass>
      <div style={{ position: 'relative' }}>
        {/* Persistent subtle red tint */}
        <div style={{
          position: 'absolute',
          inset: 0,
          // Constant low-opacity red (12%)
          background: 'rgba(239, 68, 68, 0.20)', 
          borderRadius: '999px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        
        <button
          onClick={handleClear}
          className="cursor-pointer px-4 py-2 text-white text-sm font-medium"
          style={{ 
            background: 'none', 
            border: 'none', 
            whiteSpace: 'nowrap', 
            position: 'relative', 
            zIndex: 1 
          }}
        >
          Clear Markers
        </button>
      </div>
    </LiquidGlass>
  </div>
)}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}