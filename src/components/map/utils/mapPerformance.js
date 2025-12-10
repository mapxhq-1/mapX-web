/**
 * Performance utilities for smooth map updates
 */

// Debounce function with immediate option
export function debounce(fn, delay, immediate = false) {
    let timeoutId = null;
    let lastArgs = null;
    
    const debounced = (...args) => {
        lastArgs = args;
        
        if (immediate && !timeoutId) {
            fn(...args);
        }
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (!immediate) {
                fn(...lastArgs);
            }
            timeoutId = null;
        }, delay);
    };
    
    debounced.cancel = () => {
        clearTimeout(timeoutId);
        timeoutId = null;
    };
    
    debounced.flush = () => {
        if (timeoutId && lastArgs) {
            clearTimeout(timeoutId);
            fn(...lastArgs);
            timeoutId = null;
        }
    };
    
    return debounced;
}

// Throttle for rate-limiting
export function throttle(fn, limit) {
    let inThrottle = false;
    let lastArgs = null;
    
    return (...args) => {
        lastArgs = args;
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    fn(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        }
    };
}

// Simple LRU cache for polygon coloring results
class LRUCache {
    constructor(maxSize = 10) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }
    
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove oldest (first) entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    
    clear() {
        this.cache.clear();
    }
}

export const polygonCache = new LRUCache(20);

// Generate cache key from polygons
export function getPolygonCacheKey(polygons) {
    if (!polygons || polygons.length === 0) return 'empty';
    // Use a hash of feature IDs and a count
    const ids = polygons.slice(0, 10).map(p => p.properties?.id || p.id || '').join('|');
    return `${polygons.length}-${ids}`;
}

// Batch multiple source updates into one frame
export function batchSourceUpdates(map, updates) {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            try {
                updates.forEach(({ sourceId, data }) => {
                    const source = map.getSource(sourceId);
                    if (source) {
                        source.setData(data);
                    }
                });
            } catch (e) {
                console.error('Batch update error:', e);
            }
            resolve();
        });
    });
}

// Smooth opacity transition helper
export function fadeTransition(map, layerId, property, fromValue, toValue, duration = 300) {
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = fromValue + (toValue - fromValue) * eased;
            
            try {
                if (map.getLayer(layerId)) {
                    map.setPaintProperty(layerId, property, currentValue);
                }
            } catch (e) {}
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        
        requestAnimationFrame(animate);
    });
}