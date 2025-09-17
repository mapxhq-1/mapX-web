// Freehand (pencil) controller for MapLibre GL
// Captures pointer events, samples in screen space, updates live GeoJSON via rAF,
// and finalizes geometry via a worker simplification step

export class FreehandController {
	constructor(params) {
		this.map = params.map; // maplibregl.Map
		this.liveSourceId = params.liveSourceId;
		this.worker = params.worker; // geometry worker
		this.baseToleranceMeters = params.baseToleranceMeters || 0.75;
		this.minPixelDelta = params.minPixelDelta || 2;
		this.maxTimeDeltaMs = params.maxTimeDeltaMs || 40;
		this.tool = params.tool || "freehand";
		this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
		this.isActive = false;
		this.isDrawing = false;
		this._pointsLngLat = [];
		this._lastAcceptedPoint = null; // { sx, sy, ts }
		this._rafScheduled = false;
		this._tmpFeature = { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: { tool: this.tool } };
		this._onMouseDown = this._onMouseDown.bind(this);
		this._onMouseMove = this._onMouseMove.bind(this);
		this._onMouseUp = this._onMouseUp.bind(this);
		this._onKeyDown = this._onKeyDown.bind(this);
	}

	setActive(active) {
		if (active === this.isActive) return;
		this.isActive = active;
		if (active) {
			try { this.map && this.map.dragPan && this.map.dragPan.disable(); } catch (_) {}
			this._attach();
		} else {
			// On deactivate, finalize current stroke if drawing; otherwise just clear live preview
			if (this.isDrawing && this._pointsLngLat && this._pointsLngLat.length >= 2) {
				this._finalizeStroke();
			} else {
				this._cancelStroke();
			}
			this._detach();
			try { this.map && this.map.dragPan && this.map.dragPan.enable(); } catch (_) {}
		}
	}

	_attach() {
		if (!this.map) return;
		this.map.getCanvas().style.cursor = "crosshair";
		this.map.on("mousedown", this._onMouseDown);
		this.map.on("mousemove", this._onMouseMove);
		this.map.on("mouseup", this._onMouseUp);
		window.addEventListener("keydown", this._onKeyDown);
	}

	_detach() {
		if (!this.map) return;
		this.map.getCanvas().style.cursor = "";
		this.map.off("mousedown", this._onMouseDown);
		this.map.off("mousemove", this._onMouseMove);
		this.map.off("mouseup", this._onMouseUp);
		window.removeEventListener("keydown", this._onKeyDown);
		try { this.map && this.map.dragPan && this.map.dragPan.enable(); } catch (_) {}
	}

	_onKeyDown(ev) {
		if (ev.key === "Escape") {
			this._cancelStroke();
		}
	}

	_onMouseDown(e) {
		if (!this.isActive) return;
		this.isDrawing = true;
		this._pointsLngLat = [];
		this._lastAcceptedPoint = null;
		this._acceptSample(e);
	}

	_onMouseMove(e) {
		if (!this.isActive || !this.isDrawing) return;
		this._acceptSample(e);
	}

	_onMouseUp(e) {
		if (!this.isActive || !this.isDrawing) return;
		this._acceptSample(e);
		this.isDrawing = false;
		this._finalizeStroke();
	}

	_acceptSample(e) {
		const now = performance.now();
		const sx = e.point && typeof e.point.x === "number" ? e.point.x : 0;
		const sy = e.point && typeof e.point.y === "number" ? e.point.y : 0;
		if (this._lastAcceptedPoint) {
			const dx = sx - this._lastAcceptedPoint.sx;
			const dy = sy - this._lastAcceptedPoint.sy;
			const dist = Math.hypot(dx, dy);
			const dt = now - this._lastAcceptedPoint.ts;
			if (dist < this.minPixelDelta && dt < this.maxTimeDeltaMs) {
				return;
			}
		}
		this._lastAcceptedPoint = { sx, sy, ts: now };
		this._pointsLngLat.push([e.lngLat.lng, e.lngLat.lat]);
		this._scheduleRaf();
	}

	_scheduleRaf() {
		if (this._rafScheduled) return;
		this._rafScheduled = true;
		requestAnimationFrame(() => {
			try {
				this._rafScheduled = false;
				const src = this.map.getSource(this.liveSourceId);
				if (!src) return;
				this._tmpFeature.geometry.coordinates = this._pointsLngLat.slice();
				src.setData({ type: "FeatureCollection", features: [this._tmpFeature] });
			} catch (_) {}
		});
	}

	_cancelStroke() {
		this.isDrawing = false;
		this._pointsLngLat = [];
		this._lastAcceptedPoint = null;
		try {
			const src = this.map.getSource(this.liveSourceId);
			src && src.setData({ type: "FeatureCollection", features: [] });
		} catch (_) {}
	}

	_finalizeStroke() {
		const coords = this._pointsLngLat.slice();
		if (!coords || coords.length < 2) {
			this._cancelStroke();
			return;
		}
		// Immediately commit as final; optional smoothing/simplify can be applied later
		this._commitFinalLine(coords);

		// Clear live preview afterwards
		try {
			const live = this.map.getSource(this.liveSourceId);
			live && live.setData({ type: "FeatureCollection", features: [] });
		} catch (_) {}
	}

	_commitFinalLine(coords) {
		try {
			if (this.onFinalize) this.onFinalize(coords);
		} catch (_) {}
		this._pointsLngLat = [];
		this._lastAcceptedPoint = null;
	}
}

export default FreehandController;


