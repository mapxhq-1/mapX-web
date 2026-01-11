// ============================================================================
// Map Provider Integration - Style Management
// Esri Only - MapTiler and OpenFreeMap commented out
// ============================================================================

// COMMENTED: MapTiler integration (disabled)
// const STYLE_CONFIG = {
//     maptiler: {
//         basic: (key) => `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`,
//         light: (key) => `https://api.maptiler.com/maps/bright-v2/style.json?key=${key}`,
//         dark: (key) => `https://api.maptiler.com/maps/darkmatter/style.json?key=${key}`,
//     },
//     openfreemap: {
//         basic: 'https://tiles.openfreemap.org/styles/liberty',
//         light: 'https://tiles.openfreemap.org/styles/positron',
//         dark: 'https://tiles.openfreemap.org/styles/dark',
//     },
//     esri: {
//         hillshade: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
//         streetMap: 'https://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
//     }
// };

const STYLE_CONFIG = {
    esri: {
        hillshade: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
        streetMap: 'https://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        lightGrayBase: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        lightGrayReference: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    }
};

export const styleCache = new Map();

// Esri only - no fallback to other providers
export const MAP_PROVIDER = 'esri'; // Hardcoded to Esri
// COMMENTED: MapTiler configuration (disabled)
// export const MAP_PROVIDER = import.meta.env.VITE_MAP_PROVIDER || 'maptiler';
// export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
// export const DEFAULT_THEME = import.meta.env.VITE_MAPTILER_DEFAULT_THEME || 'basic';
export const MAPTILER_KEY = ''; // Not used
export const DEFAULT_THEME = 'basic'; // World Street Map
export const ESRI_STYLE = 'basic'; // Default to World Street Map

// Build Esri raster style for MapLibre GL
function buildEsriStyle(styleType = 'basic') {
    
    // Handle Light Gray Canvas theme merged with Hillshade (used for 'light')
    // Hillshade as base, then Light Gray layers on top with reduced opacity to show hillshade through
    if (styleType === 'light') {
        const hillshadeUrl = STYLE_CONFIG.esri.hillshade;
        const lightBaseUrl = STYLE_CONFIG.esri.lightGrayBase;
        const lightReferenceUrl = STYLE_CONFIG.esri.lightGrayReference;
        const attribution = '© Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, (c) OpenStreetMap contributors, and the GIS User Community';
        
        return {
            version: 8,
            sources: {
                "esri-hillshade": {
                    type: "raster",
                    tiles: [hillshadeUrl],
                    tileSize: 256,
                    attribution: '© Esri, USGS',
                    minzoom: 0,
                    maxzoom: 17,
                },
                "esri-light-base": {
                    type: "raster",
                    tiles: [lightBaseUrl],
                    tileSize: 256,
                    attribution: attribution,
                    minzoom: 0,
                    maxzoom: 16,
                },
                "esri-light-reference": {
                    type: "raster",
                    tiles: [lightReferenceUrl],
                    tileSize: 256,
                    attribution: attribution,
                    minzoom: 0,
                    maxzoom: 16,
                },
            },
            layers: [
                {
                    id: "esri-hillshade-layer",
                    type: "raster",
                    source: "esri-hillshade"
                },
                {
                    id: "esri-light-base-layer",
                    type: "raster",
                    source: "esri-light-base",
                    minzoom: 0,
                    maxzoom: 16,
                    paint: {
                        "raster-opacity": 0.7  // Reduce opacity to show hillshade through
                    }
                },
                {
                    id: "esri-light-reference-layer",
                    type: "raster",
                    source: "esri-light-reference",
                    minzoom: 0,
                    maxzoom: 16,
                    paint: {
                        "raster-opacity": 0.8  // Slightly more opaque for reference details
                    }
                }
            ],
            glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        };
    }
    
    
    // Default: World Street Map only (used for 'basic')
    const streetMapUrl = STYLE_CONFIG.esri.streetMap;
    const attribution = '© Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, (c) OpenStreetMap contributors, and the GIS User Community';

    const style = {
        version: 8,
        sources: {
            "esri-streetmap": {
                type: "raster",
                tiles: [streetMapUrl],
                tileSize: 256,
                attribution: attribution,
                minzoom: 0,
                maxzoom: 23,
            },
        },
        layers: [
            {
                id: "esri-streetmap-layer",
                type: "raster",
                source: "esri-streetmap",
                minzoom: 0,
                maxzoom: 23,
            }
        ],
        glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    };
    return style;
}

// Check if current provider is Esri
export function isEsriProvider() {
    const effectiveProvider = getEffectiveProvider();
    return effectiveProvider === 'esri';
}

export async function getBaseStyle(provider, theme, apiKey) {
    const cacheKey = `${provider}-${theme}-${apiKey || 'none'}`;
    
    if (styleCache.has(cacheKey)) {
        return styleCache.get(cacheKey);
    }

    // Esri only - no other providers
    if (provider === 'esri') {
        const esriTheme = theme || 'basic';
        try {
            const esriStyle = buildEsriStyle(esriTheme);
            if (!esriStyle?.version || !esriStyle?.sources || !esriStyle?.layers) {
                throw new Error('Invalid Esri style structure');
            }
            styleCache.set(cacheKey, esriStyle);
            return esriStyle;
        } catch (error) {
            console.error('[MapView] Failed to build Esri style:', error);
            throw error;
        }
    }

    // COMMENTED: OpenFreeMap integration (disabled)
    // const validThemes = ['basic', 'light', 'dark'];
    // if (!validThemes.includes(theme)) {
    //     console.warn(`[MapView] Invalid theme "${theme}". Using "basic".`);
    //     theme = 'basic';
    // }
    // if (provider === 'openfreemap') {
    //     const styleUrl = STYLE_CONFIG.openfreemap[theme] || STYLE_CONFIG.openfreemap.basic;
    //     styleCache.set(cacheKey, styleUrl);
    //     return styleUrl;
    // }

    // COMMENTED: MapTiler integration (disabled)
    // if (provider === 'maptiler') {
    //     if (!apiKey) {
    //         console.warn('[MapView] MapTiler API key missing. Falling back to OpenFreeMap.');
    //         return getBaseStyle('openfreemap', theme, null);
    //     }
    //     const styleUrl = STYLE_CONFIG.maptiler[theme](apiKey);
    //     for (let attempt = 0; attempt < 2; attempt++) {
    //         try {
    //             const response = await fetch(styleUrl, { headers: { Accept: 'application/json' } });
    //             if (!response.ok) throw new Error(`HTTP ${response.status}`);
    //             const styleJson = await response.json();
    //             if (!styleJson?.version || !styleJson?.sources || !styleJson?.layers) {
    //                 throw new Error('Invalid style JSON structure');
    //             }
    //             if (!styleJson.glyphs) {
    //                 styleJson.glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
    //             }
    //             styleCache.set(cacheKey, styleJson);
    //             return styleJson;
    //         } catch (error) {
    //             if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 100));
    //         }
    //     }
    //     return getBaseStyle('openfreemap', theme, null);
    // }

    // No fallback - Esri only
    throw new Error(`Unsupported provider: ${provider}. Only Esri is supported.`);
}

export function getEffectiveProvider() {
    return 'esri';
}

// Get base style - Esri only, no fallback
export async function getBaseStyleWithFallback(provider, theme, apiKey) {
    try {
        const style = await getBaseStyle(provider, theme, apiKey);
        return style;
    } catch (error) {
        console.error(`[MapView] Failed to load ${provider} style:`, error);
        throw error;
        
        // COMMENTED: Original fallback logic (disabled)
        // if (provider !== 'openfreemap') {
        //     console.warn('[MapView] Falling back to OpenFreeMap');
        //     return await getBaseStyle('openfreemap', 'basic', null);
        // }
        // throw error;
    }
}

export function buildCloudlessStyle() {
    return {
        version: 8,
        sources: {
            "eox-s2cloudless": {
                type: "raster",
                tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
                scheme: "xyz",
                tileSize: 256,
                attribution: "Sentinel-2 cloudless © EOX IT Services GmbH",
                minzoom: 0,
                maxzoom: 12,
            },
        },
        layers: [{ id: "eox-s2cloudless-layer", type: "raster", source: "eox-s2cloudless" }],
        glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    };
}