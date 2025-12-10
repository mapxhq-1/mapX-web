// This runs in a Web Worker to avoid blocking the main thread

import { colorPolygonsFourColor } from '../../../utils/polygonColoring';
import * as turf from '@turf/turf';

self.onmessage = function(e) {
    const { type, payload, id } = e.data;
    
    try {
        switch (type) {
            case 'COLOR_POLYGONS': {
                const { polygons, options } = payload;
                const colored = colorPolygonsFourColor(polygons || [], options);
                self.postMessage({ id, type: 'COLOR_POLYGONS_RESULT', payload: colored });
                break;
            }
            
            case 'BUILD_LABELS': {
                const { features } = payload;
                const labels = buildLabelPoints(features);
                self.postMessage({ id, type: 'BUILD_LABELS_RESULT', payload: labels });
                break;
            }
            
            default:
                self.postMessage({ id, type: 'ERROR', payload: 'Unknown message type' });
        }
    } catch (error) {
        self.postMessage({ id, type: 'ERROR', payload: error.message });
    }
};

function buildLabelPoints(features) {
    if (!Array.isArray(features)) return { type: "FeatureCollection", features: [] };
    
    const groups = new Map();
    
    for (const f of features) {
        const t = f?.geometry?.type;
        if (t !== "Polygon" && t !== "MultiPolygon") continue;
        
        const name = f?.properties?.name || f?.properties?.Name || 
                     f?.properties?.empire || f?.properties?.title || 
                     f?.properties?.label || "";
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
            try { a = turf.area(f); } catch (_) { a = 0; }
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
            properties: { name },
            geometry: { type: "Point", coordinates: center.geometry.coordinates }
        });
    }
    
    return { type: "FeatureCollection", features: points };
}