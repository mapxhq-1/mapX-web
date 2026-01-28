// Polygon controller: click/tap to add vertices, double-click/tap or Enter to close

export class PolygonController {
    constructor(params) {
        this.map = params.map;
        this.liveSourceId = params.liveSourceId;
        this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
        this.isActive = false;
        this.points = [];
        this._temp = null;

        // Touch handling variables
        this._lastTapTime = 0;
        this._lastLngLat = null;

        this._onClick = this._onClick.bind(this);
        this._onMove = this._onMove.bind(this);
        this._onDbl = this._onDbl.bind(this);
        this._onKey = this._onKey.bind(this);
        
        // Touch specific handlers
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
    }

    setActive(active) {
        if (active === this.isActive) return;
        this.isActive = active;
        if (active) {
            // Disable map interaction
            try { this.map.dragPan.disable(); } catch (_) {}
            try { this.map.touchZoomRotate.disable(); } catch (_) {} // Disable touch zoom

            this.points = [];
            this._temp = null;

            // Mouse events
            this.map.on("click", this._onClick);
            this.map.on("mousemove", this._onMove);
            this.map.on("dblclick", this._onDbl);

            // Touch events
            this.map.on("touchstart", this._onTouchStart);
            this.map.on("touchmove", this._onTouchMove);
            this.map.on("touchend", this._onTouchEnd);

            window.addEventListener("keydown", this._onKey);
            this.map.getCanvas().style.cursor = "crosshair";
        } else {
            // Mouse events
            this.map.off("click", this._onClick);
            this.map.off("mousemove", this._onMove);
            this.map.off("dblclick", this._onDbl);

            // Touch events
            this.map.off("touchstart", this._onTouchStart);
            this.map.off("touchmove", this._onTouchMove);
            this.map.off("touchend", this._onTouchEnd);

            window.removeEventListener("keydown", this._onKey);
            
            // Re-enable map interaction
            try { this.map.dragPan.enable(); } catch (_) {}
            try { this.map.touchZoomRotate.enable(); } catch (_) {}
            
            this._clearLive();
            this.map.getCanvas().style.cursor = "";
        }
    }

    _onKey(ev) {
        if (ev.key === "Escape") this._finalize(false);
        if (ev.key === "Enter") this._finalize(true);
    }

    // --- Mouse Handlers ---

    _onClick(e) {
        // Only accept real mouse clicks (touch events handled separately)
        if (e.originalEvent && e.originalEvent.sourceCapabilities && e.originalEvent.sourceCapabilities.firesTouchEvents) return;
        
        this.points.push([e.lngLat.lng, e.lngLat.lat]);
        this._updateLive();
    }

    _onMove(e) {
        if (!this.isActive || this.points.length === 0) return;
        this._temp = [e.lngLat.lng, e.lngLat.lat];
        this._updateLive();
    }

    _onDbl() {
        this._finalize(true);
    }

    // --- Touch Handlers ---

    _onTouchStart(e) {
        if (e.originalEvent) e.preventDefault();
        // Record position for rubber banding
        this._lastLngLat = [e.lngLat.lng, e.lngLat.lat];
        
        // If we have started drawing, show the temporary line immediately
        if (this.points.length > 0) {
            this._temp = this._lastLngLat;
            this._updateLive();
        }
    }

    _onTouchMove(e) {
        if (e.originalEvent) e.preventDefault();
        this._lastLngLat = [e.lngLat.lng, e.lngLat.lat];
        
        // Rubber band effect: update the "next" point as user drags finger
        if (this.points.length > 0) {
            this._temp = this._lastLngLat;
            this._updateLive();
        }
    }

    _onTouchEnd(e) {
        if (e.originalEvent) e.preventDefault();
        
        const now = Date.now();
        // Check for Double Tap (within 300ms of last tap)
        if (now - this._lastTapTime < 300) {
            // Double tap detected: Add the final point and close
            if (this._lastLngLat) {
                this.points.push(this._lastLngLat);
            }
            this._finalize(true);
            this._lastTapTime = 0; // Reset
        } else {
            // Single Tap: Add point
            this._lastTapTime = now;
            if (this._lastLngLat) {
                this.points.push(this._lastLngLat);
                this._temp = null; // Clear temp until next touchstart
                this._updateLive();
            }
        }
    }

    // --- Common Logic ---

    _updateLive() {
        try {
            const coords = this._buildRing();
            const src = this.map.getSource(this.liveSourceId);
            src && src.setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: { tool: "polygon" }, geometry: { type: "Polygon", coordinates: [coords] } }] });
        } catch (_) {}
    }

    _buildRing() {
        const ring = [...this.points];
        if (this._temp) ring.push(this._temp);
        if (ring.length > 2) {
            const first = ring[0];
            const last = ring[ring.length - 1];
            // Ensure the polygon is closed visually
            if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
        }
        return ring;
    }

    _clearLive() {
        try {
            const src = this.map.getSource(this.liveSourceId);
            src && src.setData({ type: "FeatureCollection", features: [] });
        } catch (_) {}
    }

    _finalize(close) {
        if (!close || this.points.length < 3) {
            this._clearLive();
            this.points = [];
            this._temp = null;
            return;
        }
        const ring = this._buildRing();
        try { this.onFinalize && this.onFinalize(ring); } catch (_) {}
        this.points = [];
        this._temp = null;
        this._clearLive();
    }
}

export default PolygonController;