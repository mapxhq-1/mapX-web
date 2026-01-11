import { colorPolygonsFourColor, colorIndexToHex, colorIndexToHexDark } from "../../../utils/polygonColoring";
import { buildEmpireLabelPoints } from "./textToolHelpers";

export const LAYER_IDS = {
    LIVE_SOURCE: "draw-live-src",
    FINAL_SOURCE: "draw-final-src",
    POLYGONS_SOURCE: "polygons-source",
    LABELS_SOURCE: "empire-labels-source",
};

const getColorExpression = (dark = false) => {
    const colorFn = dark ? colorIndexToHexDark : colorIndexToHex;
    return [
        "case",
        ["has", "colorIndex"],
        ["match", ["get", "colorIndex"], 
            0, colorFn(0), 
            1, colorFn(1), 
            2, colorFn(2), 
            3, colorFn(3), 
            4, colorFn(4), 
            colorFn(5)
        ],
        dark ? "#0000ff" : "#FFC000"
    ];
};

export function addDrawingSources(map) {
    const sources = [
        { id: LAYER_IDS.LIVE_SOURCE, data: { type: "FeatureCollection", features: [] } },
        { id: LAYER_IDS.FINAL_SOURCE, data: { type: "FeatureCollection", features: [] } },
    ];
    
    sources.forEach(({ id, data }) => {
        if (!map.getSource(id)) {
            map.addSource(id, { type: "geojson", data });
        }
    });
}

export function addDrawingLayers(map) {
    const layers = [
        {
            id: "draw-live-shadow",
            type: "line",
            source: LAYER_IDS.LIVE_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
                "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"],
                "line-width": ["case", ["==", ["get", "tool"], "highlight"], 20, 6],
                "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.12, 0.2]
            }
        },
        {
            id: "draw-live-line",
            type: "line",
            source: LAYER_IDS.LIVE_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
                "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"],
                "line-width": ["case", ["==", ["get", "tool"], "highlight"], 15, 3],
                "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.4, 0.9]
            }
        },
        {
            id: "draw-final-fill",
            type: "fill",
            source: LAYER_IDS.FINAL_SOURCE,
            paint: { "fill-color": "#000000", "fill-opacity": 0.1 },
            filter: ["any", ["==", ["get", "tool"], "polygon"], ["==", ["get", "tool"], "circle"]]
        },
        {
            id: "draw-final-fill-selected",
            type: "fill",
            source: LAYER_IDS.FINAL_SOURCE,
            paint: { "fill-color": "#1e90ff", "fill-opacity": 0.15 },
            filter: ["all", ["any", ["==", ["get", "tool"], "polygon"], ["==", ["get", "tool"], "circle"]], ["==", ["get", "id"], "__none__"]]
        },
        {
            id: "draw-final-line",
            type: "line",
            source: LAYER_IDS.FINAL_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
                "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"],
                "line-width": ["case", ["==", ["get", "tool"], "highlight"], 15, 3],
                "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.4, 1]
            }
        },
        {
            id: "draw-final-line-selected",
            type: "line",
            source: LAYER_IDS.FINAL_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#1e90ff", "line-width": 5, "line-opacity": 0.7 },
            filter: ["==", ["get", "id"], "__none__"]
        },
        {
            id: "draw-final-text",
            type: "symbol",
            source: LAYER_IDS.FINAL_SOURCE,
            filter: ["==", ["get", "tool"], "text"],
            layout: {
                "text-field": ["get", "text"],
                "text-font": ["Noto Sans Regular"],
                "text-size": ["coalesce", ["get", "fontSize"], 16],
                "text-anchor": "center",
                "text-allow-overlap": false,
                "text-max-width": 16,
            },
            paint: {
                "text-color": ["coalesce", ["get", "color"], "#ffffff"],
                "text-halo-color": "#000000",
                "text-halo-width": 1,
            }
        }
    ];
    
    layers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
            map.addLayer(layer);
        }
    });
}

export function addPolygonLayers(map, polygonsRef) {
    const basePolys = polygonsRef?.current || [];
    let colored = basePolys;
    try {
        colored = colorPolygonsFourColor(basePolys, { minSharedMeters: 25, maxColors: 6, adjacencyMode: "touch" });
    } catch (_) {}
    
    // Add polygon source
    if (!map.getSource(LAYER_IDS.POLYGONS_SOURCE)) {
        map.addSource(LAYER_IDS.POLYGONS_SOURCE, {
            type: "geojson",
            data: { type: "FeatureCollection", features: colored }
        });
    }
    
    // Add label source
    if (!map.getSource(LAYER_IDS.LABELS_SOURCE)) {
        map.addSource(LAYER_IDS.LABELS_SOURCE, {
            type: "geojson",
            data: buildEmpireLabelPoints(colored)
        });
    }
    
    // Subtle glow/shadow layer behind polygons for depth
    if (!map.getLayer("polygon-glow")) {
        map.addLayer({
            id: "polygon-glow",
            type: "fill",
            source: LAYER_IDS.POLYGONS_SOURCE,
            paint: { 
                "fill-color": "#5C4A37", // Darker sepia for more visible shadow
                "fill-opacity": 0.25, // Increased opacity for better visibility
                "fill-antialias": true
            }
        }, "polygon-fill"); // Insert before polygon-fill
    } else {
        // Update existing glow layer properties
        try {
            map.setPaintProperty("polygon-glow", "fill-color", "#5C4A37");
            map.setPaintProperty("polygon-glow", "fill-opacity", 0.25);
        } catch (e) {
            // Silently handle property update errors
        }
    }
    
    // Add layers - merged with hillshade for realistic terrain effect
    if (!map.getLayer("polygon-fill")) {
        map.addLayer({
            id: "polygon-fill",
            type: "fill",
            source: LAYER_IDS.POLYGONS_SOURCE,
            paint: { 
                "fill-color": getColorExpression(false), 
                "fill-opacity": 0.65, // Increased opacity to show colors clearly while allowing hillshade through
                "fill-antialias": true
            }
        });
    } else {
        // Update existing layer properties to ensure opacity is applied
        try {
            map.setPaintProperty("polygon-fill", "fill-opacity", 0.65);
            // Remove blend mode if it exists to ensure colors are visible
            try {
                map.setLayoutProperty("polygon-fill", "fill-blend-mode", undefined);
            } catch (_) {}
        } catch (e) {
            // Silently handle property update errors
        }
    }
    
    // Shadow border layer behind main border for depth effect
    if (!map.getLayer("polygon-border-shadow")) {
        map.addLayer({
            id: "polygon-border-shadow",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
            paint: { 
                "line-color": "#2A1F14", // Dark shadow color
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    1, 2.5, 
                    4, 3.0, 
                    10, 4.0 
                ],
                "line-opacity": 0.4, // Shadow opacity
                "line-blur": 2.0 // Strong blur for shadow effect
            }
        }, "polygon-border"); // Insert before polygon-border
    } else {
        // Update existing shadow border properties
        try {
            map.setPaintProperty("polygon-border-shadow", "line-color", "#2A1F14");
            map.setPaintProperty("polygon-border-shadow", "line-opacity", 0.4);
            map.setPaintProperty("polygon-border-shadow", "line-blur", 1.0);
            map.setPaintProperty("polygon-border-shadow", "line-width", [
                "interpolate", ["linear"], ["zoom"],
                1, 2.5, 
                4, 3.0, 
                10, 4.0 
            ]);
        } catch (e) {
            // Silently handle property update errors
        }
    }
    
    if (!map.getLayer("polygon-border")) {
        map.addLayer({
            id: "polygon-border",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
            paint: { 
                "line-color": getColorExpression(true), 
                "line-width": 1,
                "line-opacity": 0.85, // Slightly reduced opacity for subtle borders that blend with terrain
                "line-blur": 0.5 // Soft blur for elegant borders
            }
        });
    } else {
        // Update existing layer properties to ensure opacity and line width are applied
        try {
            map.setPaintProperty("polygon-border", "line-opacity", 0.85);
            map.setPaintProperty("polygon-border", "line-blur", 0.5);
            map.setPaintProperty("polygon-border", "line-width", 1);
        } catch (e) {
            // Silently handle property update errors
        }
    }
    
    // White border line - appears right after the main border for glow effect
    if (!map.getLayer("polygon-empire-white-border")) {
        map.addLayer({
            id: "polygon-empire-white-border",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
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
    if (!map.getLayer("polygon-empire-glow-outer")) {
        // Outer glow layer - most blurred and faded
        map.addLayer({
            id: "polygon-empire-glow-outer",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
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
    
    if (!map.getLayer("polygon-empire-glow-middle")) {
        // Middle glow layer - medium blur
        map.addLayer({
            id: "polygon-empire-glow-middle",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
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
    
    if (!map.getLayer("polygon-empire-glow-inner")) {
        // Inner glow layer - closest to white border, less blur
        map.addLayer({
            id: "polygon-empire-glow-inner",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
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
    
    if (!map.getLayer("empire-labels")) {
        map.addLayer({
            id: "empire-labels",
            type: "symbol",
            source: LAYER_IDS.LABELS_SOURCE,
            minzoom: 2,
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Noto Sans Bold"],
                "text-size": ["interpolate", ["linear"], ["zoom"], 2, 8, 6, 12, 12, 18],
                "text-anchor": "center",
                "text-transform": "uppercase",
            },
            paint: {
                "text-color": "#1a1a1a",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2,
            }
        });
    }
}

export function ensurePolygonLayers(map, polygonsRef) {
    addPolygonLayers(map, polygonsRef);
    
    // Restore data
    const basePolys = polygonsRef?.current || [];
    let colored = basePolys;
    try {
        colored = colorPolygonsFourColor(basePolys, { minSharedMeters: 25, maxColors: 6, adjacencyMode: "touch" });
    } catch (_) {}
    
    try {
        map.getSource(LAYER_IDS.POLYGONS_SOURCE)?.setData({ type: "FeatureCollection", features: colored });
        map.getSource(LAYER_IDS.LABELS_SOURCE)?.setData(buildEmpireLabelPoints(colored));
    } catch (_) {}
}

export function enforceGlobe(map) {
    try {
        map.setProjection?.({ type: "globe" });
        map.setFog?.({
            color: "#d6e7ff",
            "high-color": "#add3ff",
            "space-color": "rgba(0,0,0,0)",
            "horizon-blend": 0.02,
        });
        const canvas = map.getCanvas?.();
        if (canvas) canvas.style.backgroundColor = "transparent";
    } catch (_) {}
}

export function updatePolygonData(map, polygons) {
    if (!map?.getSource(LAYER_IDS.POLYGONS_SOURCE)) return;
    
    let colored = [];
    try {
        colored = colorPolygonsFourColor(polygons || [], { minSharedMeters: 25, maxColors: 6, adjacencyMode: "touch" });
    } catch (_) {
        colored = polygons || [];
    }
    
    map.getSource(LAYER_IDS.POLYGONS_SOURCE).setData({ type: "FeatureCollection", features: colored });
    
    try {
        const labelSource = map.getSource(LAYER_IDS.LABELS_SOURCE);
        labelSource?.setData(buildEmpireLabelPoints(colored));
    } catch (_) {}
}