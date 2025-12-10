// ============================================================================
// MapTiler Integration - Style Management
// ============================================================================

const STYLE_CONFIG = {
    maptiler: {
        basic: (key) => `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`,
        light: (key) => `https://api.maptiler.com/maps/bright-v2/style.json?key=${key}`,
        dark: (key) => `https://api.maptiler.com/maps/darkmatter/style.json?key=${key}`,
    },
    openfreemap: {
        basic: 'https://tiles.openfreemap.org/styles/liberty',
        light: 'https://tiles.openfreemap.org/styles/positron',
        dark: 'https://tiles.openfreemap.org/styles/dark',
    }
};

const styleCache = new Map();

export const MAP_PROVIDER = import.meta.env.VITE_MAP_PROVIDER || 'maptiler';
export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
export const DEFAULT_THEME = import.meta.env.VITE_MAPTILER_DEFAULT_THEME || 'basic';

// Debug logging (only in development)
if (import.meta.env.DEV) {
    console.log('[MapView] Environment variables:', {
        MAP_PROVIDER,
        MAPTILER_KEY: MAPTILER_KEY ? `${MAPTILER_KEY.substring(0, 8)}...` : '(empty)',
        DEFAULT_THEME,
    });
}

if (MAP_PROVIDER === 'maptiler' && !MAPTILER_KEY) {
    console.warn('[MapView] ⚠️ VITE_MAPTILER_KEY is missing. Falling back to OpenFreeMap.');
}

export async function getBaseStyle(provider, theme, apiKey) {
    const cacheKey = `${provider}-${theme}-${apiKey || 'none'}`;
    
    if (styleCache.has(cacheKey)) {
        return styleCache.get(cacheKey);
    }

    const validThemes = ['basic', 'light', 'dark'];
    if (!validThemes.includes(theme)) {
        console.warn(`[MapView] Invalid theme "${theme}". Using "basic".`);
        theme = 'basic';
    }

    if (provider === 'openfreemap') {
        const styleUrl = STYLE_CONFIG.openfreemap[theme] || STYLE_CONFIG.openfreemap.basic;
        styleCache.set(cacheKey, styleUrl);
        return styleUrl;
    }

    if (provider === 'maptiler') {
        if (!apiKey) {
            console.warn('[MapView] MapTiler API key missing. Falling back to OpenFreeMap.');
            return getBaseStyle('openfreemap', theme, null);
        }

        const styleUrl = STYLE_CONFIG.maptiler[theme](apiKey);
        
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await fetch(styleUrl, { headers: { Accept: 'application/json' } });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const styleJson = await response.json();
                if (!styleJson?.version || !styleJson?.sources || !styleJson?.layers) {
                    throw new Error('Invalid style JSON structure');
                }
                
                if (!styleJson.glyphs) {
                    styleJson.glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
                }
                
                styleCache.set(cacheKey, styleJson);
                return styleJson;
            } catch (error) {
                if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return getBaseStyle('openfreemap', theme, null);
    }

    return getBaseStyle('openfreemap', theme, null);
}

export function getEffectiveProvider() {
    return MAP_PROVIDER === 'maptiler' && !MAPTILER_KEY ? 'openfreemap' : MAP_PROVIDER;
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