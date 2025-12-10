import { useRef, useCallback, useEffect } from 'react';
import { dataPreloader } from '../utils/dataPreloader';
import { interpolatePolygons, interpolateLabels } from '../utils/polygonInterpolator';
import { useSmoothTransition } from './useSmoothTransition';
import { colorPolygonsFourColor } from '../../../utils/polygonColoring';
import * as turf from '@turf/turf';

/**
 * Hook that synchronizes map data with year changes smoothly
 */
export function useMapDataSync(map, options = {}) {
    const {
        projectId,
        transitionDuration = 400,
        preloadRange = 3,
        onTransitionStart,
        onTransitionEnd
    } = options;

    const currentDataRef = useRef({ polygons: [], labels: null });
    const targetDataRef = useRef({ polygons: [], labels: null });
    const lastYearRef = useRef(null);

    // Build label points
    const buildLabels = useCallback((features) => {
        if (!Array.isArray(features) || features.length === 0) {
            return { type: "FeatureCollection", features: [] };
        }

        const groups = new Map();
        for (const f of features) {
            const t = f?.geometry?.type;
            if (t !== "Polygon" && t !== "MultiPolygon") continue;
            const name = f?.properties?.name || f?.properties?.Name || 
                         f?.properties?.empire || f?.properties?.title || "";
            if (!name) continue;
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(f);
        }

        const points = [];
        for (const [name, arr] of groups.entries()) {
            let best = null, bestArea = -1;
            for (const f of arr) {
                let a = 0;
                try { a = turf.area(f); } catch (_) {}
                if (a > bestArea) { bestArea = a; best = f; }
            }
            if (!best) continue;

            let center = null;
            try { center = turf.centerOfMass(best); } 
            catch (_) { try { center = turf.center(best); } catch (__) {} }

            if (!center?.geometry?.coordinates) continue;
            points.push({
                type: "Feature",
                properties: { name },
                geometry: { type: "Point", coordinates: center.geometry.coordinates }
            });
        }
        return { type: "FeatureCollection", features: points };
    }, []);

    // Process polygons (color + labels)
    const processPolygons = useCallback((polygons) => {
        let colored = polygons;
        try {
            colored = colorPolygonsFourColor(polygons || [], {
                minSharedMeters: 25,
                maxColors: 6,
                adjacencyMode: "touch"
            });
        } catch (e) {
            colored = polygons || [];
        }
        const labels = buildLabels(colored);
        return { polygons: colored, labels };
    }, [buildLabels]);

    // Update map sources
    const updateMapSources = useCallback((polygons, labels) => {
        if (!map.current) return;

        try {
            const polygonSource = map.current.getSource("polygons-source");
            const labelSource = map.current.getSource("empire-labels-source");

            if (polygonSource) {
                polygonSource.setData({
                    type: "FeatureCollection",
                    features: polygons
                });
            }

            if (labelSource && labels) {
                labelSource.setData(labels);
            }
        } catch (e) {
            console.error('Map source update error:', e);
        }
    }, [map]);

    // Smooth transition animation
    const transition = useSmoothTransition({
        duration: transitionDuration,
        easing: 'easeOutCubic',
        onFrame: (progress, from, to) => {
            if (!from || !to) return;

            const interpolatedPolygons = interpolatePolygons(
                from.polygons,
                to.polygons,
                progress
            );

            const interpolatedLabels = interpolateLabels(
                from.labels,
                to.labels,
                progress
            );

            updateMapSources(interpolatedPolygons, interpolatedLabels);
        },
        onComplete: (to) => {
            if (to) {
                currentDataRef.current = to;
                updateMapSources(to.polygons, to.labels);
            }
            if (onTransitionEnd) onTransitionEnd();
        }
    });

    // Fetch data for a year
    const fetchDataForYear = useCallback(async (year, era) => {
        // This should be replaced with your actual API call
        // For now, return from Redux or API
        return { polygons: [], shapes: [] };
    }, []);

    // Main sync function
    const syncToYear = useCallback(async (year, era, polygonsFromRedux) => {
        if (!map.current) return;

        // Check cache first
        const cachedData = dataPreloader.get(year, era, projectId);
        
        let targetData;
        if (cachedData) {
            targetData = cachedData;
        } else if (polygonsFromRedux) {
            // Process Redux data
            targetData = processPolygons(polygonsFromRedux);
            dataPreloader.set(year, era, projectId, targetData);
        } else {
            // Fetch from API (fallback)
            const fetched = await fetchDataForYear(year, era);
            targetData = processPolygons(fetched.polygons);
            dataPreloader.set(year, era, projectId, targetData);
        }

        targetDataRef.current = targetData;

        // If this is the first load, set immediately
        if (!currentDataRef.current.polygons.length) {
            currentDataRef.current = targetData;
            updateMapSources(targetData.polygons, targetData.labels);
            return;
        }

        // If same data, skip
        if (lastYearRef.current === year) {
            return;
        }

        lastYearRef.current = year;

        // Start smooth transition
        if (onTransitionStart) onTransitionStart();
        transition.start(currentDataRef.current, targetData);

        // Preload adjacent years
        dataPreloader.preloadAdjacent(
            year,
            era,
            projectId,
            async (y, e, p) => {
                // Return dummy - actual preloading happens via Redux
                return { polygons: [], shapes: [] };
            },
            preloadRange
        );
    }, [map, projectId, processPolygons, updateMapSources, transition, 
        onTransitionStart, preloadRange, fetchDataForYear]);

    // Instant update (for rapid scrubbing)
    const instantUpdate = useCallback((polygons) => {
        transition.stop();
        const processed = processPolygons(polygons);
        currentDataRef.current = processed;
        updateMapSources(processed.polygons, processed.labels);
    }, [transition, processPolygons, updateMapSources]);

    return {
        syncToYear,
        instantUpdate,
        isTransitioning: transition.isAnimating,
        preloadYear: (year, era) => {
            dataPreloader.preload(year, era, projectId, fetchDataForYear);
        }
    };
}