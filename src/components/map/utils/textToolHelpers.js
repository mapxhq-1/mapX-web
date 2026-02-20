import DOMPurify from "dompurify";
import * as turf from "@turf/turf";
import { v4 as uuidv4 } from "uuid";

export const sanitizeText = (raw) => {
    try {
        return DOMPurify.sanitize(String(raw || ""), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).slice(0, 2000);
    } catch (_) {
        return String(raw || "").slice(0, 2000);
    }
};

export const isValidCoordinate = (coords) => {
    return (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number" &&
        coords[0] >= -180 && coords[0] <= 180 && 
        coords[1] >= -90 && coords[1] <= 90
    );
};

export const getEmpireName = (props) => {
    try {
        return props?.name || props?.Name || props?.empire || props?.title || props?.label || "";
    } catch (_) {
        return "";
    }
};

export const buildEmpireLabelPoints = (features) => {
    try {
        if (!Array.isArray(features)) return { type: "FeatureCollection", features: [] };
        
        const groups = new Map();
        for (const f of features) {
            const t = f?.geometry?.type;
            if (t !== "Polygon" && t !== "MultiPolygon") continue;
            
            const rawName = getEmpireName(f?.properties || {});
            if (!rawName) continue;
            
            // Trim to prevent duplicates caused by trailing spaces in your data
            const name = rawName.trim(); 
            
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(f);
        }
        
        const points = [];
        for (const [name, arr] of groups.entries()) {
            let best = null, bestArea = -1;
            
            // Find the largest polygon piece for this empire
            for (const f of arr) {
                let a = 0;
                try { a = turf.area(f); } catch (_) {}
                if (a > bestArea) { bestArea = a; best = f; }
            }
            if (!best) continue;
            
            let center = null;
            try { 
                // This guarantees the label stays safely inside the polygon boundaries
                center = turf.pointOnFeature(best); 
            } catch (_) {
                try { center = turf.centerOfMass(best); } catch (__) {}
            }
            if (!center?.geometry?.coordinates) continue;
            
            points.push({
                type: "Feature",
                // Passing ALL properties so MapLibre can match the ID for the glow effect
                properties: { ...best.properties, name },
                geometry: { type: "Point", coordinates: center.geometry.coordinates }
            });
        }
        return { type: "FeatureCollection", features: points };
    } catch (_) {
        return { type: "FeatureCollection", features: [] };
    }
};

export const createTextFeature = (coords, textValue, sizePx, colorHex) => {
    if (!isValidCoordinate(coords)) throw new Error("Invalid coordinates");
    
    return {
        type: "Feature",
        properties: {
            id: `tx_${uuidv4()}`,
            tool: "text",
            text: sanitizeText(textValue),
            fontSize: Math.max(8, Math.min(72, Number(sizePx) || 16)),
            color: colorHex || "#ffffff",
            created_at: new Date().toISOString(),
        },
        geometry: { 
            type: "Point", 
            coordinates: [Number(coords[0].toFixed(6)), Number(coords[1].toFixed(6))] 
        },
    };
};