/**
 * Interpolates between polygon states for smooth transitions
 */
import * as turf from "@turf/turf";

/**
 * Find matching polygon between two sets by name/id
 */
function findMatchingPolygon(polygon, targetSet) {
    const name = polygon.properties?.name || polygon.properties?.Name || 
                 polygon.properties?.empire || polygon.properties?.id;
    
    if (!name) return null;
    
    return targetSet.find(p => {
        const targetName = p.properties?.name || p.properties?.Name || 
                          p.properties?.empire || p.properties?.id;
        return targetName === name;
    });
}

/**
 * Interpolate between two coordinate arrays
 */
function interpolateCoordinates(from, to, t) {
    if (!from || !to) return to || from;
    
    // Simple case: same number of points
    if (from.length === to.length) {
        return from.map((coord, i) => {
            if (Array.isArray(coord[0])) {
                // Nested (polygon rings)
                return interpolateCoordinates(coord, to[i], t);
            }
            return [
                coord[0] + (to[i][0] - coord[0]) * t,
                coord[1] + (to[i][1] - coord[1]) * t
            ];
        });
    }
    
    // Different point counts - just crossfade
    return t < 0.5 ? from : to;
}

/**
 * Interpolate a single polygon geometry
 */
function interpolateGeometry(from, to, t) {
    if (!from || !to) return to || from;
    if (from.type !== to.type) return t < 0.5 ? from : to;
    
    return {
        type: from.type,
        coordinates: interpolateCoordinates(from.coordinates, to.coordinates, t)
    };
}

/**
 * Create interpolated polygon set between two states
 */
export function interpolatePolygons(fromPolygons, toPolygons, t) {
    if (!fromPolygons || fromPolygons.length === 0) return toPolygons || [];
    if (!toPolygons || toPolygons.length === 0) return fromPolygons || [];
    if (t <= 0) return fromPolygons;
    if (t >= 1) return toPolygons;
    
    const result = [];
    const matchedToIndices = new Set();
    
    // Interpolate matching polygons
    for (const fromPoly of fromPolygons) {
        const toPoly = findMatchingPolygon(fromPoly, toPolygons);
        
        if (toPoly) {
            const toIndex = toPolygons.indexOf(toPoly);
            matchedToIndices.add(toIndex);
            
            result.push({
                type: "Feature",
                properties: {
                    ...fromPoly.properties,
                    ...toPoly.properties,
                    _interpolated: true,
                    _opacity: 1
                },
                geometry: interpolateGeometry(fromPoly.geometry, toPoly.geometry, t)
            });
        } else {
            // Polygon disappearing - fade out
            result.push({
                ...fromPoly,
                properties: {
                    ...fromPoly.properties,
                    _interpolated: true,
                    _opacity: 1 - t // Fade out
                }
            });
        }
    }
    
    // Add new polygons that don't exist in 'from' - fade in
    toPolygons.forEach((toPoly, index) => {
        if (!matchedToIndices.has(index)) {
            result.push({
                ...toPoly,
                properties: {
                    ...toPoly.properties,
                    _interpolated: true,
                    _opacity: t // Fade in
                }
            });
        }
    });
    
    return result;
}

/**
 * Interpolate label positions
 */
export function interpolateLabels(fromLabels, toLabels, t) {
    if (!fromLabels?.features) return toLabels;
    if (!toLabels?.features) return fromLabels;
    if (t <= 0) return fromLabels;
    if (t >= 1) return toLabels;
    
    const result = [];
    const matchedToIndices = new Set();
    
    for (const fromLabel of fromLabels.features) {
        const name = fromLabel.properties?.name;
        const toLabel = toLabels.features.find(l => l.properties?.name === name);
        
        if (toLabel) {
            matchedToIndices.add(toLabels.features.indexOf(toLabel));
            
            const fromCoords = fromLabel.geometry.coordinates;
            const toCoords = toLabel.geometry.coordinates;
            
            result.push({
                type: "Feature",
                properties: { ...fromLabel.properties, _opacity: 1 },
                geometry: {
                    type: "Point",
                    coordinates: [
                        fromCoords[0] + (toCoords[0] - fromCoords[0]) * t,
                        fromCoords[1] + (toCoords[1] - fromCoords[1]) * t
                    ]
                }
            });
        } else {
            // Label disappearing
            result.push({
                ...fromLabel,
                properties: { ...fromLabel.properties, _opacity: 1 - t }
            });
        }
    }
    
    // New labels appearing
    toLabels.features.forEach((toLabel, index) => {
        if (!matchedToIndices.has(index)) {
            result.push({
                ...toLabel,
                properties: { ...toLabel.properties, _opacity: t }
            });
        }
    });
    
    return { type: "FeatureCollection", features: result };
}