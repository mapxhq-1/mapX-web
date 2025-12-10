/**
 * Preloads data for adjacent years to enable instant transitions
 */

class DataPreloader {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 10; // Cache up to 10 year snapshots
        this.pendingRequests = new Map();
    }

    // Generate cache key
    getCacheKey(year, era, projectId) {
        return `${projectId}-${year}-${era}`;
    }

    // Check if data is cached
    has(year, era, projectId) {
        return this.cache.has(this.getCacheKey(year, era, projectId));
    }

    // Get cached data
    get(year, era, projectId) {
        const key = this.getCacheKey(year, era, projectId);
        const data = this.cache.get(key);
        if (data) {
            // Move to end (LRU)
            this.cache.delete(key);
            this.cache.set(key, data);
        }
        return data;
    }

    // Store data in cache
    set(year, era, projectId, data) {
        const key = this.getCacheKey(year, era, projectId);
        
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            polygons: data.polygons || [],
            shapes: data.shapes || [],
            labels: data.labels || { type: "FeatureCollection", features: [] },
            timestamp: Date.now()
        });
    }

    // Preload data for a year (returns promise)
    async preload(year, era, projectId, fetchFn) {
        const key = this.getCacheKey(year, era, projectId);
        
        // Already cached
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        // Already loading
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }
        
        // Start loading
        const promise = fetchFn(year, era, projectId)
            .then(data => {
                this.set(year, era, projectId, data);
                this.pendingRequests.delete(key);
                return data;
            })
            .catch(err => {
                this.pendingRequests.delete(key);
                throw err;
            });
        
        this.pendingRequests.set(key, promise);
        return promise;
    }

    // Preload adjacent years (for smooth scrubbing)
    async preloadAdjacent(currentYear, era, projectId, fetchFn, range = 2) {
        const yearsToPreload = [];
        
        for (let offset = -range; offset <= range; offset++) {
            if (offset === 0) continue;
            yearsToPreload.push(currentYear + offset);
        }
        
        // Preload in background without blocking
        yearsToPreload.forEach(year => {
            this.preload(year, era, projectId, fetchFn).catch(() => {});
        });
    }

    // Clear all cache
    clear() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}

export const dataPreloader = new DataPreloader();