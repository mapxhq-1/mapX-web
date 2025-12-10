import { useRef, useCallback, useEffect } from 'react';
import { debounce, polygonCache, getPolygonCacheKey } from '../utils/mapPerformance';
import { colorPolygonsFourColor } from '../../../utils/polygonColoring';
import * as turf from '@turf/turf';

/**
 * Hook for processing polygons with caching and debouncing
 */
export function usePolygonProcessor(map, options = {}) {
    const { debounceMs = 150 } = options;
    const processingRef = useRef(false);
    const pendingUpdateRef = useRef(null);
    
    // Build label points (memoized)
    const buildEmpireLabelPoints = useCallback((features) => {
        if (!Array.isArray(features) || features.length === 0) {
            return { type: "FeatureCollection", features: [] };
        }
        
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
    }, []);
    
    // Process polygons with caching
    const processPolygons = useCallback((polygons) => {
        if (!polygons || polygons.length === 0) {
            return { colored: [], labels: { type: "FeatureCollection", features: [] } };
        }
        
        const cacheKey = getPolygonCacheKey(polygons);
        const cached = polygonCache.get(cacheKey);
        
        if (cached) {
            return cached;
        }
        
        let colored = polygons;
        try {
            colored = colorPolygonsFourColor(polygons, { 
                minSharedMeters: 25, 
                maxColors: 6, 
                adjacencyMode: "touch" 
            });
        } catch (e) {
            console.warn('Polygon coloring failed:', e);
        }
        
        const labels = buildEmpireLabelPoints(colored);
        
        const result = { colored, labels };
        polygonCache.set(cacheKey, result);
        
        return result;
    }, [buildEmpireLabelPoints]);
    
    // Debounced update function
    const debouncedUpdate = useRef(
        debounce((mapInstance, polygons, onComplete) => {
            if (!mapInstance) return;
            
            processingRef.current = true;
            
            // Use requestIdleCallback if available, otherwise requestAnimationFrame
            const scheduleWork = window.requestIdleCallback || requestAnimationFrame;
            
            scheduleWork(() => {
                try {
                    const { colored, labels } = processPolygons(polygons);
                    
                    // Batch the updates in a single frame
                    requestAnimationFrame(() => {
                        try {
                            const polygonSource = mapInstance.getSource("polygons-source");
                            const labelSource = mapInstance.getSource("empire-labels-source");
                            
                            if (polygonSource) {
                                polygonSource.setData({
                                    type: "FeatureCollection",
                                    features: colored
                                });
                            }
                            
                            if (labelSource) {
                                labelSource.setData(labels);
                            }
                            
                            if (onComplete) onComplete(colored, labels);
                        } catch (e) {
                            console.error('Map update error:', e);
                        }
                        
                        processingRef.current = false;
                        
                        // Process any pending update
                        if (pendingUpdateRef.current) {
                            const pending = pendingUpdateRef.current;
                            pendingUpdateRef.current = null;
                            debouncedUpdate.current(pending.map, pending.polygons, pending.onComplete);
                        }
                    });
                } catch (e) {
                    console.error('Polygon processing error:', e);
                    processingRef.current = false;
                }
            });
        }, debounceMs)
    ).current;
    
    // Main update function
    const updatePolygons = useCallback((mapInstance, polygons, onComplete) => {
        if (processingRef.current) {
            // Queue this update for later
            pendingUpdateRef.current = { map: mapInstance, polygons, onComplete };
            return;
        }
        
        debouncedUpdate(mapInstance, polygons, onComplete);
    }, [debouncedUpdate]);
    
    // Cleanup
    useEffect(() => {
        return () => {
            debouncedUpdate.cancel && debouncedUpdate.cancel();
        };
    }, [debouncedUpdate]);
    
    return {
        updatePolygons,
        processPolygons,
        buildEmpireLabelPoints,
        isProcessing: () => processingRef.current
    };
}