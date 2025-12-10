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
    
    // Add layers
    if (!map.getLayer("polygon-fill")) {
        map.addLayer({
            id: "polygon-fill",
            type: "fill",
            source: LAYER_IDS.POLYGONS_SOURCE,
            paint: { "fill-color": getColorExpression(false), "fill-opacity": 0.2 }
        });
    }
    
    if (!map.getLayer("polygon-border")) {
        map.addLayer({
            id: "polygon-border",
            type: "line",
            source: LAYER_IDS.POLYGONS_SOURCE,
            paint: { "line-color": getColorExpression(true), "line-width": 2 }
        });
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