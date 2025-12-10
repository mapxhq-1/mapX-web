// hooks/usePolygonOptimizer.js
import { useRef, useCallback, useEffect } from 'react';
import * as turf from '@turf/turf';

export function usePolygonOptimizer(map, options = {}) {
    const {
        maxPolygons = 500,
        maxCoordinates = 50000,
        debounceMs = 150
    } = options;
    
    const workerRef = useRef(null);
    const pendingRef = useRef(null);
    const rawPolygonsRef = useRef([]);
    const currentToleranceRef = useRef(0.01);
    
    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/polygonWorker.js', import.meta.url),
            { type: 'module' }
        );
        
        workerRef.current.onmessage = (e) => {
            const { type, payload } = e.data;
            
            if (type === 'SIMPLIFY_RESULT' || type === 'FILTER_RESULT') {
                requestAnimationFrame(() => {
                    const source = map.current?.getSource('polygons-source');
                    if (source) {
                        source.setData({
                            type: 'FeatureCollection',
                            features: payload
                        });
                    }
                });
            }
        };
        
        return () => {
            workerRef.current?.terminate();
        };
    }, [map]);
    
    // Get tolerance for zoom
    const getToleranceForZoom = useCallback((zoom) => {
        if (zoom < 3) return 0.1;
        if (zoom < 5) return 0.05;
        if (zoom < 7) return 0.01;
        if (zoom < 10) return 0.005;
        return 0.001;
    }, []);
    
    // Count coordinates
    const countCoordinates = useCallback((features) => {
        let count = 0;
        const countInner = (coords) => {
            if (!coords) return;
            if (typeof coords[0] === 'number') { count++; return; }
            coords.forEach(c => countInner(c));
        };
        features.forEach(f => countInner(f.geometry?.coordinates));
        return count;
    }, []);
    
    // Simplify polygons
    const simplifyPolygons = useCallback((features, tolerance) => {
        return features.map(feature => {
            try {
                const geomType = feature.geometry?.type;
                if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                    return {
                        ...turf.simplify(feature, { tolerance, highQuality: false }),
                        properties: feature.properties
                    };
                }
                return feature;
            } catch {
                return feature;
            }
        });
    }, []);
    
    // Process and update polygons
    const processPolygons = useCallback((polygons, forceSimplify = false) => {
        if (!polygons || !polygons.length) {
            const source = map.current?.getSource('polygons-source');
            if (source) {
                source.setData({ type: 'FeatureCollection', features: [] });
            }
            return;
        }
        
        rawPolygonsRef.current = polygons;
        
        const coordCount = countCoordinates(polygons);
        const needsSimplification = forceSimplify || 
            polygons.length > maxPolygons || 
            coordCount > maxCoordinates;
        
        console.log(`[optimizer] ${polygons.length} polygons, ${coordCount} coords, simplify: ${needsSimplification}`);
        
        if (needsSimplification) {
            const zoom = map.current?.getZoom() || 2;
            const tolerance = getToleranceForZoom(zoom);
            currentToleranceRef.current = tolerance;
            
            // Use worker for large datasets
            if (coordCount > 100000 && workerRef.current) {
                workerRef.current.postMessage({
                    type: 'SIMPLIFY',
                    id: Date.now(),
                    payload: { features: polygons, tolerance }
                });
            } else {
                // Simplify synchronously for smaller datasets
                const simplified = simplifyPolygons(polygons, tolerance);
                const source = map.current?.getSource('polygons-source');
                if (source) {
                    source.setData({
                        type: 'FeatureCollection',
                        features: simplified
                    });
                }
            }
        } else {
            // No simplification needed
            const source = map.current?.getSource('polygons-source');
            if (source) {
                source.setData({
                    type: 'FeatureCollection',
                    features: polygons
                });
            }
        }
    }, [map, maxPolygons, maxCoordinates, countCoordinates, getToleranceForZoom, simplifyPolygons]);
    
    // Handle zoom changes
    const handleZoomChange = useCallback(() => {
        if (!map.current || !rawPolygonsRef.current.length) return;
        
        const zoom = map.current.getZoom();
        const newTolerance = getToleranceForZoom(zoom);
        
        // Only re-process if tolerance changed
        if (Math.abs(newTolerance - currentToleranceRef.current) > 0.001) {
            currentToleranceRef.current = newTolerance;
            processPolygons(rawPolygonsRef.current, true);
        }
    }, [map, getToleranceForZoom, processPolygons]);
    
    // Setup zoom listener
    useEffect(() => {
        if (!map.current) return;
        
        let timeoutId;
        const debouncedZoom = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleZoomChange, debounceMs);
        };
        
        map.current.on('zoomend', debouncedZoom);
        
        return () => {
            map.current?.off('zoomend', debouncedZoom);
            clearTimeout(timeoutId);
        };
    }, [map, handleZoomChange, debounceMs]);
    
    return {
        processPolygons,
        getRawPolygons: () => rawPolygonsRef.current,
        getCurrentTolerance: () => currentToleranceRef.current
    };
}