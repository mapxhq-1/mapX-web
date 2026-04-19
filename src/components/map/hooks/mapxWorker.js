import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { colorPolygonsFourColor } from '../../../utils/polygonColoring';
import { buildEmpireLabelPoints } from '../utils/textToolHelpers'; 

let tileIndex = null;
let currentJobId = null; // Track the active calculation

self.onmessage = function(e) {
    const { type, payload, jobId } = e.data;

    if (type === 'LOAD_DATA') {
        currentJobId = jobId; // Update to the newest job
        const { polygons } = payload;

        if (!polygons || polygons.length === 0) {
            self.postMessage({ type: 'DATA_READY', labels: { type: "FeatureCollection", features: [] } });
            return;
        }

        // 1. Run the heavy coloring algorithm
        let colored = polygons;
        try {
            colored = colorPolygonsFourColor(polygons, { 
                minSharedMeters: 25, 
                maxColors: 6, 
                adjacencyMode: "touch" 
            });
        } catch (err) { 
            console.warn('Worker: Coloring failed', err); 
        }

        // ABORT CHECK: Did the user change the year while we were coloring?
        if (currentJobId !== jobId) return; 

        // 2. Calculate label points
        const labels = buildEmpireLabelPoints(colored);

        // ABORT CHECK: Did the user change the year while calculating labels?
        if (currentJobId !== jobId) return; 

        // 3. Slice the spatial index
        tileIndex = geojsonvt({ type: "FeatureCollection", features: colored }, {
            maxZoom: 14,
            tolerance: 2.0, // Increased tolerance slightly for even faster slicing
            extent: 4096,
            buffer: 64,
            indexMaxZoom: 5,
            indexMaxPoints: 100000
        });

        // ABORT CHECK: Did the user change the year while slicing tiles?
        if (currentJobId !== jobId) return;

        self.postMessage({ type: 'DATA_READY', labels });
    }
    
    else if (type === 'REQUEST_TILE') {
        const { z, x, y, requestKey } = payload;
        
        if (!tileIndex) {
            self.postMessage({ type: 'TILE_RESPONSE', requestKey, buffer: null });
            return;
        }

        const tile = tileIndex.getTile(z, x, y);
        
        if (!tile) {
            self.postMessage({ type: 'TILE_RESPONSE', requestKey, buffer: null });
            return;
        }

        const pbf = vtpbf.fromGeojsonVt({ 'mapx-polygons': tile });
        const arrayBuffer = pbf.buffer || pbf.subarray().buffer || new Uint8Array(pbf).buffer;
        
        self.postMessage({ type: 'TILE_RESPONSE', requestKey, buffer: arrayBuffer }, [arrayBuffer]);
    }
};