import React, { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";

// Redux & Utils
import { fetchAllEmpirePolygons, openNotes } from "../../store/mapSlice";
import { colorPolygonsFourColor, colorIndexToHex, colorIndexToHexDark } from "../../utils/polygonColoring";
import { getEraForYear, getAbsoluteYear, isMaRange } from "../../utils/era";
import * as turf from "@turf/turf";

// Map utilities
import { getBaseStyle, getEffectiveProvider, DEFAULT_THEME, MAPTILER_KEY, buildCloudlessStyle } from "./utils/mapStyles";
import { createCursorManager } from "./utils/cursorManager";
import { buildEmpireLabelPoints as buildLabelPoints, createTextFeature, sanitizeText } from "./utils/textToolHelpers";
import { addDrawingSources, addDrawingLayers, LAYER_IDS } from "./utils/mapLayers";

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
import { createMaOverlayManager } from "./maOverlayManager";
import { maybeHandleMaMapShapes, handleInitialMaContext, createMaSafeLoader } from "./maEraGuards";

// API
import { createMapShape, deleteMapShape, getAllMapShapes } from "../api/mapshapes";

// Controls
import { PhotonSearchControl, ScreenshotControl, MeasureDistanceControl, ResetNorthControl } from "./controls/MapControls";

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
  const dispatch = useDispatch();

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

  // Keep refs updated
  useEffect(() => { polygonsRef.current = polygons; }, [polygons]);
  useEffect(() => { yearRef.current = year; }, [year]);

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
      console.warn('[MapView] Coloring failed:', e);
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
          properties: { ...feat.properties, id: sid || feat.properties?.id }
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
      console.warn('[MapView] Globe projection setup failed:', e);
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
    
    // Polygon fill layer
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
          "fill-opacity": 0.15, // Transparent fill
        },
      });
    }
    
    // Polygon border layer
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
            1, 2.0, 
            4, 3.5, 
            10, 8.0 
          ],
          "line-opacity": 1,
        },
      });
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

    const createOnFinalize = (prefix, tool, geometryType = "LineString") => (coords) => {
      const id = `${prefix}_${Date.now()}_${featureSeqRef.current++}`;
      const geometry = geometryType === "Polygon"
        ? { type: "Polygon", coordinates: [coords] }
        : { type: geometryType, coordinates: coords };
      const feature = {
        type: "Feature",
        properties: { id, tool, created_at: new Date().toISOString() },
        geometry
      };
      finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
      map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
        type: "FeatureCollection",
        features: finalFeaturesRef.current
      });
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
            ownerEmail,
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
      onSaveEdit: (id, text, size, color) => {
        const idx = finalFeaturesRef.current.findIndex(f => f.properties?.id === id);
        if (idx >= 0) {
          finalFeaturesRef.current[idx].properties = {
            ...finalFeaturesRef.current[idx].properties,
            text: sanitizeText(text),
            fontSize: size,
            color
          };
          map.current.getSource(LAYER_IDS.FINAL_SOURCE)?.setData({
            type: "FeatureCollection",
            features: finalFeaturesRef.current
          });
        }
      },
      onDelete: async (id) => {
        if (!id) return;
        const isSaved = !String(id).includes('_');
        if (isSaved) try { await deleteMapShape(id, ownerEmail); } catch (_) {}
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
        if (features.length) {
          try {
            const res = await createMapShape(
              projectId,
              getAbsoluteYear(yearRef.current),
              getEraForYear(yearRef.current),
              ownerEmail,
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
        if (isSaved) try { await deleteMapShape(id, ownerEmail); } catch (_) {}
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

    map.current.on("move", () => {
      selectionOverlay.updatePosition();
      textToolbar.updatePosition();
    });

    // Export APIs
    window.mapxDrawSetMode = modeController.setMode;
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
      if (theme?.startsWith('http')) { map.current.setStyle(theme); return; }
      const style = await getBaseStyle(getEffectiveProvider(), theme, MAPTILER_KEY);
      if (style) map.current.setStyle(style);
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
    if (bottomRight) bottomRight.style.bottom = "130px";

    map.current.addControl(new ScreenshotControl(), "bottom-left");
    map.current.addControl(new MeasureDistanceControl(), "bottom-left");
    map.current.addControl(new PhotonSearchControl(), "bottom-left");
    map.current.addControl(new ResetNorthControl(), "bottom-right");
  }, [leftOffset, rightOffset]);

  // ========================================================================
  // MAP INITIALIZATION
  // ========================================================================

  useEffect(() => {
    if (map.current) return;

    let managersRef = { manager: null, hyperlinker: null, noteManager: null };

    (async () => {
      try {
        const initialStyle = await getBaseStyle(
          getEffectiveProvider(),
          DEFAULT_THEME,
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

      map.current.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right"
      );

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
  // HANDLE YEAR CHANGES (for tools)
  // ========================================================================

  useEffect(() => {
    if (!map.current) return;
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

      

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}