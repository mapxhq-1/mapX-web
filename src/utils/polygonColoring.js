// --- UNIQUE PROCEDURAL PASTEL COLOR ALGORITHM ---

function stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

/**
 * Generates a distinct, soft pastel HSL color based on a string.
 */
function generateColorFromName(name, isDark = false) {
    const hash = stringToHash(name);

    // The Golden Angle spreads colors optimally so consecutive hashes have different hues
    const hue = (hash * 137.5) % 360;

    // PASTEL TWEAK 1: Lower saturation (40% to 60%) so colors aren't neon/bright
    const saturation = 40 + (hash % 20); 

    // PASTEL TWEAK 2: High lightness for fills (75% to 85%) to make them soft.
    // For borders (isDark), we use a mid-tone (45% to 55%) so it's visible but not harsh.
    const lightness = isDark ? (45 + (hash % 10)) : (75 + (hash % 10));

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// --- MAIN EXPORT ---
export function colorPolygonsFourColor(features, options = {}) {
    if (!Array.isArray(features) || features.length === 0) return [];

    return features.map((f, i) => {
        // Clone feature and properties to avoid mutating state directly
        const outF = { ...f, properties: { ...(f.properties || {}) } };
        const t = f?.geometry?.type;
        
        if (t === "Polygon" || t === "MultiPolygon") {
            const rawName = f?.properties?.name;
            const name = (rawName && typeof rawName === 'string' && rawName.trim() !== "") 
                ? rawName.trim().toLowerCase() 
                : `unnamed_${i}`;
            
            // Generate a unique Pastel Fill and Border color purely based on the Empire's name
            const fillColor = generateColorFromName(name, false);
            const lineColor = generateColorFromName(name, true);
            
            outF.properties.fillColor = fillColor;
            outF.properties.lineColor = lineColor;
            
            // Fallback index
            outF.properties.colorIndex = stringToHash(name) % 100; 
        }
        
        return outF;
    });
}