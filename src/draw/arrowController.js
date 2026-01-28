export class ArrowController {
    constructor(params) {
        this.map = params.map;
        this.liveSourceId = params.liveSourceId;
        this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
        this.isActive = false;
        this.isDrawing = false;
        this._start = null;
        this._sign = 1; // curve side
        
        // Track the last known position for touchend events
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
            try { this.map.touchZoomRotate.disable(); } catch (_) {} // Disable touch zoom/rotate

            // Mouse events
            this.map.on("mousedown", this._onMouseDown);
            this.map.on("mousemove", this._onMouseMove);
            this.map.on("mouseup", this._onMouseUp);
            
            // Touch events (mapped to same handlers)
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
            
            // Re-enable map interaction
            try { this.map.dragPan.enable(); } catch (_) {}
            try { this.map.touchZoomRotate.enable(); } catch (_) {}

            this._clearLive();
            this.map.getCanvas().style.cursor = "";
        }
    }

    _onKey(ev) { if (ev.key === "Escape") this._clearLive(); }

    _onMouseDown(e) {
        // Prevent default browser behavior (scrolling/refreshing)
        if (e.originalEvent) e.preventDefault();

        this.isDrawing = true;
        this._start = [e.lngLat.lng, e.lngLat.lat];
        this._lastLngLat = this._start; // Initialize last known pos
        this._firstScreen = { x: e.point.x, y: e.point.y };
        this._updateLive(this._start, this._start);
    }

    _onMouseMove(e) {
        if (!this.isDrawing) return;
        if (e.originalEvent) e.preventDefault();

        const end = [e.lngLat.lng, e.lngLat.lat];
        this._lastLngLat = end; // Update last known pos

        if (this._firstScreen) {
            const dx = e.point.x - this._firstScreen.x;
            const dy = e.point.y - this._firstScreen.y;
            this._sign = dy * 1 >= 0 ? 1 : -1;
        }
        this._updateLive(this._start, end);
    }

    _onMouseUp(e) {
        if (!this.isDrawing) return;
        if (e.originalEvent) e.preventDefault();

        this.isDrawing = false;

        // On touchscreen, 'touchend' might not have coordinates. 
        // Use e.lngLat if available, otherwise fall back to the last move position.
        let end;
        if (e.lngLat) {
            end = [e.lngLat.lng, e.lngLat.lat];
        } else {
            end = this._lastLngLat;
        }

        const { shaft, head } = this._buildArrow(this._start, end, this._sign);
        try { this.onFinalize && this.onFinalize({ shaft, head }); } catch (_) {}
        this._clearLive();
    }

    _clearLive() {
        try {
            const src = this.map.getSource(this.liveSourceId);
            src && src.setData({ type: "FeatureCollection", features: [] });
        } catch (_) {}
        this._start = null;
        this._lastLngLat = null;
    }

    _updateLive(start, end) {
        const { shaft, head } = this._buildArrow(start, end, this._sign);
        try {
            const src = this.map.getSource(this.liveSourceId);
            src && src.setData({
                type: "FeatureCollection",
                features: [
                    { type: "Feature", properties: { tool: "arrow" }, geometry: { type: "LineString", coordinates: shaft } },
                    { type: "Feature", properties: { tool: "arrow" }, geometry: { type: "Polygon", coordinates: [head] } },
                ],
            });
        } catch (_) {}
    }

    _buildArrow(start, end, sign) {
        // Quadratic bezier shaft with control at midpoint offset
        const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
        const vx = end[0] - start[0];
        const vy = end[1] - start[1];
        const len = Math.sqrt(vx * vx + vy * vy) || 0.00001; // Avoid divide by zero
        // Perpendicular unit
        const px = (-vy) / len;
        const py = (vx) / len;
        const offset = 0.2 * len; // curvature
        const ctrl = [mid[0] + sign * px * offset, mid[1] + sign * py * offset];
        const shaft = this._sampleQuadratic(start, ctrl, end, 64);
        // Arrow head at end
        const tx = end[0] - ctrl[0];
        const ty = end[1] - ctrl[1];
        const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
        const ux = tx / tlen, uy = ty / tlen; // unit tangent
        const nx = -uy, ny = ux; // normal
        const headLen = 0.08 * len;
        const headWidth = 0.04 * len;
        const base = [end[0] - ux * headLen, end[1] - uy * headLen];
        const left = [base[0] + nx * headWidth, base[1] + ny * headWidth];
        const right = [base[0] - nx * headWidth, base[1] - ny * headWidth];
        const head = [end, left, right, end];
        return { shaft, head };
    }

    _sampleQuadratic(a, b, c, steps) {
        const out = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
            const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
            out.push([x, y]);
        }
        return out;
    }
}

export default ArrowController;