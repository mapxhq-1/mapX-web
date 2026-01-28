// Circle controller: first click sets center, drag defines radius, release to finalize

export class CircleController {
    constructor(params) {
        this.map = params.map;
        this.liveSourceId = params.liveSourceId;
        this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
        this.isActive = false;
        this.center = null;
        this.isDrawing = false;

        // Track last known position for touch events
        this._lastLngLat = null;

        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onKey = this._onKey.bind(this);
    }

    setActive(active) {
        if (active === this.isActive) return;
        this.isActive = active;
        if (active) {
            // Disable map interaction
            try { this.map.dragPan.disable(); } catch (_) {}
            try { this.map.touchZoomRotate.disable(); } catch (_) {} // Disable touch zoom

            // Mouse events
            this.map.on("mousedown", this._onMouseDown);
            this.map.on("mousemove", this._onMouseMove);
            this.map.on("mouseup", this._onMouseUp);

            // Touch events
            this.map.on("touchstart", this._onMouseDown);
            this.map.on("touchmove", this._onMouseMove);
            this.map.on("touchend", this._onMouseUp);

            window.addEventListener("keydown", this._onKey);
            this.map.getCanvas().style.cursor = "crosshair";
        } else {
            // Mouse events
            this.map.off("mousedown", this._onMouseDown);
            this.map.off("mousemove", this._onMouseMove);
            this.map.off("mouseup", this._onMouseUp);

            // Touch events
            this.map.off("touchstart", this._onMouseDown);
            this.map.off("touchmove", this._onMouseMove);
            this.map.off("touchend", this._onMouseUp);

            window.removeEventListener("keydown", this._onKey);
            this._cancel();

            // Re-enable map interaction
            try { this.map.dragPan.enable(); } catch (_) {}
            try { this.map.touchZoomRotate.enable(); } catch (_) {}

            this.map.getCanvas().style.cursor = "";
        }
    }

    _onKey(ev) {
        if (ev.key === "Escape") this._cancel();
    }

    _onMouseDown(e) {
        // Prevent default browser behavior (scrolling)
        if (e.originalEvent) e.preventDefault();

        this.isDrawing = true;
        this.center = [e.lngLat.lng, e.lngLat.lat];
        this._lastLngLat = this.center; // Initialize last known pos
        this._updateLive(this.center, this.center);
    }

    _onMouseMove(e) {
        if (!this.isDrawing || !this.center) return;
        
        // Prevent default browser behavior
        if (e.originalEvent) e.preventDefault();

        const edge = [e.lngLat.lng, e.lngLat.lat];
        this._lastLngLat = edge; // Update last known pos
        this._updateLive(this.center, edge);
    }

    _onMouseUp(e) {
        if (!this.isDrawing || !this.center) return;
        
        // Prevent default browser behavior
        if (e.originalEvent) e.preventDefault();

        this.isDrawing = false;

        // Determine edge coordinate (touch fallback)
        let edge;
        if (e.lngLat) {
            edge = [e.lngLat.lng, e.lngLat.lat];
        } else {
            edge = this._lastLngLat;
        }

        const ring = this._circleRing(this.center, edge, 128);
        try { this.onFinalize && this.onFinalize(ring); } catch (_) {}
        this._cancel();
    }

    _clearLive() {
        try {
            const src = this.map.getSource(this.liveSourceId);
            src && src.setData({ type: "FeatureCollection", features: [] });
        } catch (_) {}
    }

    _cancel() {
        this.center = null;
        this._lastLngLat = null;
        this.isDrawing = false;
        this._clearLive();
    }

    _updateLive(center, edge) {
        try {
            const ring = this._circleRing(center, edge, 64);
            const src = this.map.getSource(this.liveSourceId);
            src && src.setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: { tool: "circle" }, geometry: { type: "Polygon", coordinates: [ring] } }] });
        } catch (_) {}
    }

    _circleRing(center, edge, steps) {
        const [cx, cy] = center;
        const [ex, ey] = edge;
        // Simple Euclidean distance for visual radius (works well at high zoom/small scale)
        // For large geographic circles, you might need a proper haversine distance function.
        const rLng = ex - cx;
        const rLat = ey - cy;
        const r = Math.sqrt(rLng * rLng + rLat * rLat);
        const ring = [];
        for (let i = 0; i < steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            ring.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
        }
        ring.push(ring[0]);
        return ring;
    }
}

export default CircleController;