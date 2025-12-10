import React, { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";

import { fetchAllEmpirePolygons } from "../../store/mapSlice";
import { colorPolygonsFourColor, colorIndexToHex, colorIndexToHexDark } from "../../utils/polygonColoring";
import * as turf from "@turf/turf";

import GalaxyCanvas from "../common/GalaxyCanvas";

export default function MapView({ leftOffset = 0, rightOffset = 0 }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const dispatch = useDispatch();
    
    // Redux state
    const polygons = useSelector((state) => state.map.polygons);
    const year = useSelector((state) => state.map.year);
    const loading = useSelector((state) => state.map.loading);
    const { id: projectId } = useParams();
    
    // Refs
    const polygonsRef = useRef(polygons);
    const yearRef = useRef(year);
    const prevYearRef = useRef(year);
    const prevPolygonsRef = useRef([]);
    const animationFrameRef = useRef(null);
    const lastCenturyRef = useRef(null);
    
    // Keep refs updated
    useEffect(() => { polygonsRef.current = polygons; }, [polygons]);
    useEffect(() => { yearRef.current = year; }, [year]);

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
        if (!Array.isArray(features) || features.length === 0) {
            return { type: "FeatureCollection", features: [] };
        }

        const groups = new Map();
        
        for (const f of features) {
            const t = f?.geometry?.type;
            if (t !== "Polygon" && t !== "MultiPolygon") continue;
            
            const name = f?.properties?.name || f?.properties?.Name || 
                         f?.properties?.empire || f?.properties?.title || "";
            if (!name) continue;
            
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(f);
        }

        const points = [];
        
        for (const [name, arr] of groups.entries()) {
            let best = null;
            let bestArea = -1;
            
            for (const f of arr) {
                let a = 0;
                try { a = turf.area(f); } catch (_) {}
                if (a > bestArea) { bestArea = a; best = f; }
            }
            
            if (!best) continue;

            let center = null;
            try { 
                center = turf.centerOfMass(best); 
            } catch (_) { 
                try { center = turf.center(best); } catch (__) {} 
            }

            if (!center?.geometry?.coordinates) continue;
            
            points.push({
                type: "Feature",
                properties: { name, area: bestArea },
                geometry: { type: "Point", coordinates: center.geometry.coordinates }
            });
        }
        
        return { type: "FeatureCollection", features: points };
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
    // GLOBE PROJECTION SETUP
    // ========================================================================
    
    const setupGlobeProjection = useCallback(() => {
        if (!map.current) return;
        
        try {
            // Set globe projection
            map.current.setProjection({ type: "globe" });
            
            // Add atmosphere effect
            if (map.current.setFog) {
                map.current.setFog({
                    color: "#d6e7ff",
                    "high-color": "#add3ff", 
                    "space-color": "rgba(0, 0, 0, 0)", // Transparent for galaxy background
                    "horizon-blend": 0.02,
                });
            }
            
            // Make canvas transparent
            const canvas = map.current.getCanvas();
            if (canvas) {
                canvas.style.backgroundColor = "transparent";
            }
        } catch (e) {
            console.warn('[MapView] Globe projection setup failed:', e);
        }
    }, []);

    // ========================================================================
    // POLYGON UPDATE FUNCTIONS
    // ========================================================================
    
    const updateMapPolygons = useCallback((polys, animated = false) => {
        if (!map.current) return;
        
        // Cancel any pending animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        const processed = processPolygons(polys);
        const labels = buildEmpireLabelPoints(processed);
        
        const doUpdate = () => {
            try {
                const polygonSource = map.current?.getSource("polygons-source");
                const labelSource = map.current?.getSource("empire-labels-source");
                
                if (polygonSource) {
                    polygonSource.setData({
                        type: "FeatureCollection",
                        features: processed
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
            // Use requestAnimationFrame for smooth update
            animationFrameRef.current = requestAnimationFrame(doUpdate);
        } else {
            doUpdate();
        }
        
        prevPolygonsRef.current = processed;
    }, [processPolygons, buildEmpireLabelPoints]);

    // ========================================================================
    // INITIALIZE MAP LAYERS
    // ========================================================================
    
    const initializeMapLayers = useCallback(() => {
        if (!map.current) return;
        
        console.log('[MapView] Initializing layers...');
        
        // Polygon source
        if (!map.current.getSource("polygons-source")) {
            map.current.addSource("polygons-source", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });
        }
        
        // Label source
        if (!map.current.getSource("empire-labels-source")) {
            map.current.addSource("empire-labels-source", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });
        }
        
        // ✅ FIXED: Polygon fill with CORRECT opacity (was 0.2, should be higher)
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
                            colorIndexToHex(0) // default
                        ],
                        "#FFC000"
                    ],
                    "fill-opacity": 0.35, // ✅ Increased from 0.2 for better visibility
                },
            });
        }
        
        // ✅ FIXED: Polygon border with proper colors
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
                            colorIndexToHexDark(0) // default
                        ],
                        "#CC9900"
                    ],
                    "line-width": 2,
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
                layout: {
                    "text-field": ["get", "name"],
                    "text-font": ["Noto Sans Bold"],
                    "text-size": [
                        "interpolate", ["linear"], ["zoom"],
                        2, 8,
                        4, 10,
                        6, 12,
                        8, 14,
                        10, 16,
                        12, 18
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
                        2, 0.8,
                        5, 0.95,
                        8, 1
                    ],
                }
            });
        }
        
        console.log('[MapView] Layers initialized');
    }, []);

    // ========================================================================
    // MAP INITIALIZATION
    // ========================================================================
    
    useEffect(() => {
        if (map.current) return;
        
        console.log('[MapView] Creating map...');
        
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: [78.9629, 20.5937],
            zoom: 2,
            attributionControl: false,
        });

        // On map load
        map.current.on("load", () => {
            console.log('[MapView] Map loaded');
            
            // Setup globe projection
            setupGlobeProjection();
            
            // Initialize layers
            initializeMapLayers();
            
            // Load initial polygons if available
            if (polygonsRef.current && polygonsRef.current.length > 0) {
                updateMapPolygons(polygonsRef.current, false);
            }
        });

        // Re-setup globe after style changes
        map.current.on("styledata", () => {
            setupGlobeProjection();
        });

        // Ensure layers persist after style reload
        map.current.on("style.load", () => {
            setupGlobeProjection();
            initializeMapLayers();
            
            // Restore polygons
            if (polygonsRef.current && polygonsRef.current.length > 0) {
                updateMapPolygons(polygonsRef.current, false);
            }
        });

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [setupGlobeProjection, initializeMapLayers, updateMapPolygons]);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================
    
    // Initial fetch
    useEffect(() => {
        console.log('[MapView] Initial fetch for year:', year);
        dispatch(fetchAllEmpirePolygons());
        lastCenturyRef.current = getCenturyKey(year);
    }, [dispatch, getCenturyKey]);

    // Re-fetch when century changes
    useEffect(() => {
        const currentCentury = getCenturyKey(year);
        
        if (lastCenturyRef.current && lastCenturyRef.current !== currentCentury) {
            console.log('[MapView] Century changed:', lastCenturyRef.current, '→', currentCentury);
            dispatch(fetchAllEmpirePolygons());
        }
        
        lastCenturyRef.current = currentCentury;
    }, [year, dispatch, getCenturyKey]);

    // ========================================================================
    // UPDATE MAP WHEN POLYGONS CHANGE
    // ========================================================================
    
    useEffect(() => {
        if (!map.current) return;
        
        // Wait for source to be ready
        const source = map.current.getSource("polygons-source");
        if (!source) return;
        
        const hasData = polygons && polygons.length > 0;
        const hadData = prevPolygonsRef.current && prevPolygonsRef.current.length > 0;
        
        if (!hasData && !hadData) return;
        
        const isYearChange = prevYearRef.current !== year;
        prevYearRef.current = year;
        
        console.log(`[MapView] Updating polygons: ${polygons?.length || 0} features, yearChange: ${isYearChange}`);
        
        // Use animation for year changes, instant for others
        updateMapPolygons(polygons, isYearChange);
        
    }, [polygons, year, updateMapPolygons]);

    // ========================================================================
    // CONTROL POSITIONING
    // ========================================================================
    
    useEffect(() => {
        if (!map.current) return;
        
        try {
            const container = map.current.getContainer();
            
            const leftCorners = container.querySelectorAll(
                ".maplibregl-ctrl-bottom-left, .maplibregl-ctrl-top-left"
            );
            leftCorners.forEach((el) => {
                el.style.left = `${leftOffset + 8}px`;
            });
            
            const rightCorners = container.querySelectorAll(
                ".maplibregl-ctrl-bottom-right, .maplibregl-ctrl-top-right"
            );
            rightCorners.forEach((el) => {
                el.style.right = `${rightOffset + 8}px`;
            });
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
            
            {/* Loading indicator */}
            {loading && (
                <div style={{
                    position: "absolute",
                    top: 10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.7)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: 4,
                    fontSize: 12,
                    zIndex: 100,
                }}>
                    Loading...
                </div>
            )}
        </div>
    );
}