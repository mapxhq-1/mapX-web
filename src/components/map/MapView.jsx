import React, { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import LiquidGlass from "../Chatbot/LiquidGlass";
// Redux & Utils
import { fetchAllEmpirePolygons, openNotes, setFlyToPosition, setMarkers } from "../../store/mapSlice";
import { colorPolygonsFourColor } from "../../utils/polygonColoring";
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
import MapxWorker from './hooks/mapxWorker.js?worker';

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
  0: 0.05,
  2: 0.04,
  3: 0.02,
  4: 0.01,
  5: 0.005,
  6: 0.002,
  7: 0.001,
  8: 0,
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
  const workerRef = useRef(null);
  const protocolRequestsRef = useRef(new Map());
  const requestCounterRef = useRef(0);

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

  // ============================================================
  // PERFORMANCE REFS (new)
  // ============================================================
  // Caches the last colored + labeled output so zoom-only updates skip recoloring
  const coloredCacheRef = useRef(null); // { year, polygons, colored, labels }
  // Ensures popup CSS is injected into <head> only once for the lifetime of the map
  const popupStylesInjectedRef = useRef(false);
  // Prevents queryRenderedFeatures from firing on rapid click spam
  const lastClickTimeRef = useRef(0);

  // Refs for drawing tools
  const finalFeaturesRef = useRef([]);
  const selectedFeatureIdRef = useRef(null);
  const featureSeqRef = useRef(1);
  const maOverlayManagerRef = useRef(null);
  const selectedEmpireNameRef = useRef(null);
  const ownerEmailRef = useRef(ownerEmail);

  // Keep refs updated
  useEffect(() => { polygonsRef.current = polygons; }, [polygons]);
  useEffect(() => { yearRef.current = year; }, [year]);
  useEffect(() => { ownerEmailRef.current = ownerEmail; }, [ownerEmail]);

  // ========================================================================
  // POPUP STYLES — injected once into <head>, never re-injected per click
  // ========================================================================

  const injectPopupStyles = useCallback(() => {
    if (popupStylesInjectedRef.current) return;
    if (document.getElementById('dyno-popup-styles')) {
      popupStylesInjectedRef.current = true;
      return;
    }
    popupStylesInjectedRef.current = true;
    const style = document.createElement('style');
    style.id = 'dyno-popup-styles';
    style.textContent = `
      .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
      .maplibregl-popup-tip { display: none !important; }
      .dyno-scroll::-webkit-scrollbar { width: 3px; }
      .dyno-scroll::-webkit-scrollbar-track { background: transparent; }
      .dyno-scroll::-webkit-scrollbar-thumb { background-color: rgba(42, 31, 20, 0.2); border-radius: 10px; }
      .gallery-panel { transition: opacity 0.3s ease, transform 0.3s ease; opacity: 1; transform: translateX(0); display: flex; }
      .popup-collapsed .gallery-panel { opacity: 0; transform: translateX(-10px); position: absolute; pointer-events: none; visibility: hidden; z-index: -1; }
      .animate-resize { transition: width 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) !important; }
      #popup-wrapper:not(.popup-collapsed) .outside-icon-container { display: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

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
    
    // Increased cache from 20 → 50 entries to reduce thrashing on zoom
    if (simplificationCacheRef.current.size > 50) {
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
    } catch (err) {
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

  const updateMapPolygons = useCallback((polys, animated = false, forceRecolor = false) => {
    if (!map.current) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    rawPolygonsRef.current = polys;
    const zoom = map.current.getZoom();
    const tolerance = getSimplificationTolerance(polys, zoom, yearRef.current);
    
    // Simplify geometry (zoom-level dependent)
    let processedPolys = polys;
    if (tolerance > 0) {
      const cacheKey = `${yearRef.current}-${polys.length}`;
      processedPolys = simplifyPolygons(polys, tolerance, cacheKey);
    }

    // ----------------------------------------------------------------
    // KEY OPTIMIZATION: Only re-run colorPolygonsFourColor when the
    // year or polygon data actually changed, not on every zoom event.
    // colorPolygonsFourColor is O(n²) and is the #1 perf bottleneck.
    // ----------------------------------------------------------------
    const needsRecolor = forceRecolor
      || !coloredCacheRef.current
      || coloredCacheRef.current.year !== yearRef.current
      || coloredCacheRef.current.polygons !== polys; // reference equality

    let colored, labels;
    if (needsRecolor) {
      colored = processPolygons(processedPolys);
      // Labels only rebuilt when polygon set changes — not on zoom
      labels = buildEmpireLabelPoints(colored);
      coloredCacheRef.current = {
        year: yearRef.current,
        polygons: polys,
        colored,
        labels
      };
    } else {
      // Zoom-only update: still apply simplification geometry,
      // but skip expensive recoloring and label recalculation
      colored = processPolygons(processedPolys);
      labels = coloredCacheRef.current.labels; // reuse cached labels
    }
    
    const doUpdate = () => {
      try {
        map.current?.getSource("polygons-source")?.setData({
          type: "FeatureCollection",
          features: colored
        });
        map.current?.getSource("empire-labels-source")?.setData(labels);
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
      // forceRecolor = false: zoom changes never trigger expensive recoloring
      updateMapPolygons(rawPolygonsRef.current, true, false);
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

    const allLayers = map.current.getStyle().layers;
    const lowestDrawingLayer = allLayers.find(layer => 
      layer.source === LAYER_IDS.LIVE_SOURCE || 
      layer.source === LAYER_IDS.FINAL_SOURCE
    );
    
    const insertBeforeId = lowestDrawingLayer ? lowestDrawingLayer.id : undefined;
    
    // Subtle glow/shadow layer behind polygons for depth
    if (!map.current.getLayer("polygon-glow")) {
      map.current.addLayer({
        id: "polygon-glow",
        type: "fill",
        source: "polygons-source",
        paint: {
          "fill-color": "#5C4A37",
          "fill-opacity": 0.25,
          "fill-antialias": true,
        }
      }, insertBeforeId);
    } else {
      try {
        map.current.setPaintProperty("polygon-glow", "fill-color", "#5C4A37");
        map.current.setPaintProperty("polygon-glow", "fill-opacity", 0.25);
      } catch (e) {}
    }
    
    // Polygon fill layer
if (!map.current.getLayer("polygon-fill")) {
      map.current.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygons-source",
        paint: {
          // NEW: Directly fetch the injected fillColor
          "fill-color": [
            "case",
            ["has", "fillColor"], ["get", "fillColor"],
            "#B8860B" // Fallback color if the property is missing
          ],
          "fill-opacity": 0.65,
          "fill-antialias": true,
        }
      }, insertBeforeId);
    }

    if (!map.current.getLayer("polygon-border")) {
      map.current.addLayer({
        id: "polygon-border",
        type: "line",
        source: "polygons-source",
        paint: {
          // NEW: Directly fetch the injected lineColor
          "line-color": [
            "case",
            ["has", "lineColor"], ["get", "lineColor"],
            "#8B6914" // Fallback color if the property is missing
          ],
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 1.0, 
            4, 1.5, 
            10, 2.5 
          ],
          "line-opacity": 0.85,
          "line-blur": 0.5,
        }
      });
    } else {
      try {
        map.current.setPaintProperty("polygon-fill", "fill-opacity", 0.65);
        try {
          map.current.setLayoutProperty("polygon-fill", "fill-blend-mode", undefined);
        } catch (_) {}
      } catch (e) {}
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
    
    // White border line for selected empire glow
    if (!map.current.getLayer("polygon-empire-white-border")) {
      map.current.addLayer({
        id: "polygon-empire-white-border",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFFFFF",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 1.5, 
            4, 2.0, 
            10, 2.5 
          ],
          "line-opacity": 0.9,
          "line-blur": 0.3,
        },
        filter: ["==", ["id"], "never-match-this-id"],
      }, "empire-labels");
    }
    
    // Empire glow border layers
    if (!map.current.getLayer("polygon-empire-glow-outer")) {
      map.current.addLayer({
        id: "polygon-empire-glow-outer",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFD700",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 10.0, 
            4, 12.0, 
            10, 14.0 
          ],
          "line-opacity": 0.25,
          "line-blur": 7.0,
        },
        filter: ["==", ["id"], "never-match-this-id"],
      }, "empire-labels");
    }
    
    if (!map.current.getLayer("polygon-empire-glow-middle")) {
      map.current.addLayer({
        id: "polygon-empire-glow-middle",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFD700",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 6.0, 
            4, 7.5, 
            10, 9.0 
          ],
          "line-opacity": 0.45,
          "line-blur": 4.0,
        },
        filter: ["==", ["id"], "never-match-this-id"],
      }, "empire-labels");
    }
    
    if (!map.current.getLayer("polygon-empire-glow-inner")) {
      map.current.addLayer({
        id: "polygon-empire-glow-inner",
        type: "line",
        source: "polygons-source",
        paint: {
          "line-color": "#FFD700",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            1, 3.5, 
            4, 4.0, 
            10, 4.5 
          ],
          "line-opacity": 0.75,
          "line-blur": 2.0,
        },
        filter: ["==", ["id"], "never-match-this-id"],
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
            ...extraProps
        },
        geometry
      };
      
      finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
      
      map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
        type: "FeatureCollection",
        features: finalFeaturesRef.current
      });

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
      onSaveEdit: async (id, text, size, color) => {
        const idx = finalFeaturesRef.current.findIndex(f => String(f.properties?.id) === String(id));

        if (idx === -1) {
          console.error("Could not find feature to edit:", id);
          return;
        }

        const oldFeature = finalFeaturesRef.current[idx];

        const updatedFeature = {
          type: "Feature",
          id: oldFeature.id || id,
          geometry: {
            type: oldFeature.geometry.type,
            coordinates: oldFeature.geometry.coordinates
          },
          properties: {
            ...oldFeature.properties,
            text: sanitizeText(text),
            fontSize: Number(size),
            color: color,
            id: id
          }
        };

        finalFeaturesRef.current[idx] = updatedFeature;
        
        const newFeatureCollection = {
          type: "FeatureCollection",
          features: [...finalFeaturesRef.current]
        };
        
        map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData(newFeatureCollection);

        try {
          if (id && !String(id).includes('_')) {
            console.log("Saving text edit to server...", id);
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
    const manager = imageManager(map, dispatch);
    const hyperlinker = hyperlinkManager(map, dispatch);

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
      // ----------------------------------------------------------------
      // PERFORMANCE: Throttle rapid clicks — queryRenderedFeatures is
      // not free, especially with many polygon layers rendered.
      // 50ms guard prevents redundant calls on double-taps / fast clicks.
      // ----------------------------------------------------------------
      const now = Date.now();
      if (now - lastClickTimeRef.current < 50) return;
      lastClickTimeRef.current = now;

      if (currentToolRef.current !== 'select') return;
      
      // Priority: Check drawing tools first
      const drawingFeatures = map.current.queryRenderedFeatures(e.point, {
        layers: ["draw-final-line", "draw-final-fill", "draw-final-text"]
      });
      
      if (drawingFeatures?.length) {
        onSelectClick(e); 
        return;
      }
      
      // Check for empire clicks
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ["polygon-fill", "polygon-border"]
      });
      
      // Remove any existing popup immediately on new click
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
          // =====================================================================
          // 1. RENDER SKELETON IMMEDIATELY
          // =====================================================================
          const skeletonHtml = `
            <div id="popup-wrapper" class="flex gap-1 resize overflow-hidden relative popup-collapsed" 
                 style="width: 380px; height: 350px; min-width: 380px; min-height: 250px; padding: 2px;">
                <div class="flex-1 min-w-[320px] bg-[#f1ebe3] rounded-lg shadow-xl border border-[#d4c5b0] flex flex-col relative z-10 py-2 px-4 h-full">
                    
                    <div class="flex justify-between items-center w-full mb-2 border-b border-black/10 pb-2 h-[48px] shrink-0 animate-pulse">
                        <div class="h-4 bg-[#d4c5b0] rounded w-1/2"></div>
                        <div class="h-6 bg-[#d4c5b0] rounded-full w-24"></div>
                    </div>
                    
                    <div class="flex-1 overflow-hidden pr-1 space-y-4 mt-2">
                        ${[1, 2, 3, 4, 5, 6].map(() => `
                            <div class="flex items-start animate-pulse">
                                <div class="h-3 bg-[#d4c5b0] rounded w-[80px] shrink-0 mt-1"></div> 
                                <div class="w-px min-w-[1px] shrink-0 bg-black/15 mx-2 my-1 self-stretch"></div>
                                <div class="flex flex-col gap-2 w-full mt-1">
                                    <div class="h-3 bg-[#e0d5c1] rounded w-full"></div>
                                    <div class="h-3 bg-[#e0d5c1] rounded w-2/3"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
          `;

          popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: "none" })
            .setLngLat(e.lngLat)
            .setHTML(skeletonHtml)
            .addTo(map.current);

          // =====================================================================
          // 2. FETCH DATA
          // =====================================================================
          try {
            const data = await getMetadataByEmpireId(empireId);

            // =====================================================================
            // 3. RACE CONDITION GUARD
            // If the user clicked somewhere else while waiting, abort updating this popup.
            // =====================================================================
            if (selectedEmpireNameRef.current !== empireId) return;
            if (!popupRef.current) return;

            if (data) {
              currentMetadataRef.current = data;
              const hasImages = data.images && Array.isArray(data.images) && data.images.length > 0;
              const safeEmpireName = (data.name || empireName || 'this empire').replace(/'/g, "\\'").replace(/"/g, "&quot;");

              // =====================================================================
              // 4. BUILD FINAL HTML
              // =====================================================================
              const htmlContent = `
                <div id="popup-wrapper" class="flex gap-1 resize overflow-hidden relative ${hasImages ? '' : 'popup-collapsed'}" 
                     style="width: ${hasImages ? '704px' : '380px'}; height: 350px; min-width: ${hasImages ? '704px' : '380px'}; min-height: 250px; padding: 2px;">
                    
                    <div class="flex-1 min-w-[320px] bg-[#f1ebe3] rounded-lg shadow-xl border border-[#d4c5b0] flex flex-col relative z-10 py-2 px-4 h-full">
                        
                        <div class="flex justify-between items-center w-full mb-2 border-b border-black/10 pb-2 h-[48px] shrink-0">
                            <h3 class="text-[#2A1F14] font-bold text-sm leading-snug pr-2 flex-1 line-clamp-2">
                                ${data.name || empireName || 'Empire Details'}
                            </h3>
                            
                            <div class="flex items-center gap-2 shrink-0">
                                <span class="text-[10px] text-[#8c7b6e] font-medium tracking-tight">To know more</span>
                                <button class="bg-[#075e54] text-white px-4 py-1.5 rounded-full shadow hover:bg-[#054c44] transition-all duration-200 font-['Potta_One'] text-[10px] tracking-widest uppercase whitespace-nowrap" 
                                        onclick="
                                            const q = 'Tell me more about ${safeEmpireName}';
                                            localStorage.setItem('pendingDynoQuery', q);
                                            window.dispatchEvent(new CustomEvent('trigger-know-more', { detail: { query: q } }));
                                            setTimeout(() => localStorage.removeItem('pendingDynoQuery'), 500);
                                        ">
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

              // =====================================================================
              // 5. UPDATE EXISTING POPUP INSTEAD OF CREATING A NEW ONE
              // =====================================================================
              popupRef.current.setHTML(htmlContent);
            }
          } catch (err) { 
            console.error(err); 
            // Optional: Show error state in popup if it fails
            if (popupRef.current && selectedEmpireNameRef.current === empireId) {
                popupRef.current.setHTML(`
                  <div class="flex-1 min-w-[320px] bg-[#f1ebe3] rounded-lg shadow-xl border border-red-300 flex flex-col items-center justify-center py-2 px-4 h-[350px]">
                      <span class="text-red-500 font-bold">Failed to load data</span>
                  </div>
                `);
            }
          }
        }
      } else {
        // Clicked empty space — clean up
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        selectedEmpireNameRef.current = null;
        currentMetadataRef.current = null;
        
        try { 
          const hideExpr = ["==", ["id"], "never-match-this-id"];
          map.current.setFilter("polygon-empire-white-border", hideExpr); 
          map.current.setFilter("polygon-empire-glow-outer", hideExpr);
          map.current.setFilter("polygon-empire-glow-middle", hideExpr);
          map.current.setFilter("polygon-empire-glow-inner", hideExpr);

          map.current.setPaintProperty("empire-labels", "text-halo-color", "#ffffff");
          map.current.setPaintProperty("empire-labels", "text-halo-width", 2);
          map.current.setPaintProperty("empire-labels", "text-halo-blur", 1);
        } catch(e) {} 
      }
    };

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
    if (bottomLeft) bottomLeft.style.bottom = "130px";

    map.current.addControl(new ScreenshotControl(), "bottom-left");
    map.current.addControl(new MeasureDistanceControl(), "bottom-left");
    map.current.addControl(new PhotonSearchControl(), "bottom-left");
    map.current.addControl(new CompactAttributionControl(), "bottom-right");
    map.current.addControl(new ZoomControl(), "bottom-right");
    map.current.addControl(new ResetNorthControl(), "bottom-right");
  }, [leftOffset, rightOffset]);

  const customLayers = useSelector((state) => state.layers.layers);
  useLayerManager(map, customLayers, dispatch);

  // Effect to handle the "Ask Dyno" event dispatch
  useEffect(() => {
    window.handleAskDyno = () => {
      const data = currentMetadataRef.current;
      if (!data) {
        console.warn("No metadata found for Ask Dyno");
        return;
      }

      const name = data["Empire Name"] || "This empire";

      const contextString = Object.entries(data)
        .filter(([key]) => !['id', 'empire_id', 'name', '_id'].includes(key.toLowerCase()))
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      const queryText = `Tell me more about ${name}.//////${contextString}`;

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

      // ====================================================================
      // 1. INITIALIZE MAPX VECTOR TILE WORKER & PROTOCOL
      // ====================================================================
      workerRef.current = new MapxWorker();      
      workerRef.current.onmessage = (e) => {
          const { type, requestKey, buffer, labels } = e.data;
          
          if (type === 'DATA_READY') {
              // Apply labels instantly
              map.current.getSource('empire-labels-source')?.setData(labels);
              
              // Force MapLibre to fetch fresh vector tiles
              if (map.current.getSource('polygons-source')) {
                  map.current.getSource('polygons-source').setTiles([`mapx://tile/{z}/{x}/{y}?t=${Date.now()}`]);
              }
          }
          else if (type === 'TILE_RESPONSE' && protocolRequestsRef.current.has(requestKey)) {
              const callback = protocolRequestsRef.current.get(requestKey);
              protocolRequestsRef.current.delete(requestKey);
              if (buffer) {
                  callback(null, buffer, null, null);
              } else {
                  callback(null, new ArrayBuffer(0), null, null);
              }
          }
      };

      maplibregl.addProtocol('mapx', (params, callback) => {
          if (!workerRef.current) return { cancel: () => {} };
          const match = params.url.match(/mapx:\/\/tile\/(\d+)\/(\d+)\/(\d+)/);
          if (!match) return { cancel: () => {} };

          const requestKey = `req_${requestCounterRef.current++}`;
          protocolRequestsRef.current.set(requestKey, callback);

          workerRef.current.postMessage({
              type: 'REQUEST_TILE',
              payload: { z: parseInt(match[1]), x: parseInt(match[2]), y: parseInt(match[3]), requestKey }
          });

          return { cancel: () => { protocolRequestsRef.current.delete(requestKey); } };
      });
      // ====================================================================

      attachMapViewCollector(map.current);
      maOverlayManagerRef.current = createMaOverlayManager(map, yearRef);

      if (!map.current.__ml_error_hook) {
        map.current.__ml_error_hook = true;
        map.current.on("error", (e) => {
          const error = e && e.error ? e.error : e;
          if (error && error.message) {
            if (error.message.includes('tile') || error.message.includes('Failed to load')) {
              // Silently handle tile loading errors
            } else {
              console.error('[MapView] MapLibre error:', error);
            }
          }
        });
      }

      map.current.on("load", () => {
        maOverlayManagerRef.current?.handleMapLoad();
        setupGlobeProjection();
        initializeMapLayers();
        setupControls();

        // ----------------------------------------------------------------
        // PERFORMANCE: Inject popup CSS once here, at map load, so it is
        // never re-injected on empire clicks.
        // ----------------------------------------------------------------
        injectPopupStyles();
        
        const tools = setupDrawingTools(); 
        managersRef = tools; 

        if (window.mapxDrawSetMode) {
          window.mapxDrawSetMode("select");
        }

        // Push initial data to worker instead of synchronous main-thread processing
        if (polygonsRef.current && polygonsRef.current.length > 0) {
          workerRef.current.postMessage({
              type: 'LOAD_DATA',
              payload: { polygons: polygonsRef.current }
          });
        }

        loadMapShapesByContext({
          year: getAbsoluteYear(year),
          era: getEraForYear(year)
        });
      });

      // Keep zoom tracker for UI elements, but remove main-thread update triggers
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
        
        // Force tile refresh if style reloads
        if (map.current.getSource('polygons-source')) {
          map.current.getSource('polygons-source').setTiles([`mapx://tile/{z}/{x}/{y}?t=${Date.now()}`]);
        }
      });
    })();

    return () => {
      // Clean up the custom protocol and worker memory
      maplibregl.removeProtocol('mapx');
      workerRef.current?.terminate();

      maOverlayManagerRef.current?.dispose();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
}, []); 

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
        // Clear caches on century boundary — data is completely different
        simplificationCacheRef.current.clear();
        coloredCacheRef.current = null; // Also bust the coloring cache
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

    // ----------------------------------------------------------------
    // PERFORMANCE: Pass forceRecolor only when the year changed.
    // On zoom/pan updates this is always false — see handleZoomChange.
    // ----------------------------------------------------------------
    updateMapPolygons(polygons, isYearChange, isYearChange);
  }, [polygons, year, updateMapPolygons]);

  // ========================================================================
  // HANDLE YEAR CHANGES (for tools & popups)
  // ========================================================================

  useEffect(() => {
    if (!map.current) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

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
    } catch(e) {}

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
          className="absolute bottom-45 left-1/2 -translate-x-1/2 z-[1000]" 
          style={{ width: 'fit-content', borderRadius: '999px', overflow: 'hidden' }}
        >
          <LiquidGlass>
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleClear}
                className="cursor-pointer px-4 py-2 text-white text-sm font-medium text-shadow-zinc-700 text-shadow-sm"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  whiteSpace: 'nowrap', 
                  position: 'relative', 
                  zIndex: 1,
                }}
              >
                Clear Locations
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