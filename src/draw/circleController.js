// Circle controller: first click sets center, drag defines radius, release to finalize

export class CircleController {
	constructor(params) {
		this.map = params.map;
		this.liveSourceId = params.liveSourceId;
		this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
		this.isActive = false;
		this.center = null;
		this.isDrawing = false;
		this._onMouseDown = this._onMouseDown.bind(this);
		this._onMouseMove = this._onMouseMove.bind(this);
		this._onMouseUp = this._onMouseUp.bind(this);
		this._onKey = this._onKey.bind(this);
	}

	setActive(active) {
		if (active === this.isActive) return;
		this.isActive = active;
		if (active) {
			try { this.map && this.map.dragPan && this.map.dragPan.disable(); } catch (_) {}
			this.map.on("mousedown", this._onMouseDown);
			this.map.on("mousemove", this._onMouseMove);
			this.map.on("mouseup", this._onMouseUp);
			window.addEventListener("keydown", this._onKey);
			this.map.getCanvas().style.cursor = "crosshair";
		} else {
			this.map.off("mousedown", this._onMouseDown);
			this.map.off("mousemove", this._onMouseMove);
			this.map.off("mouseup", this._onMouseUp);
			window.removeEventListener("keydown", this._onKey);
			this._clearLive();
			try { this.map && this.map.dragPan && this.map.dragPan.enable(); } catch (_) {}
			this.map.getCanvas().style.cursor = "";
		}
	}

	_onKey(ev) {
		if (ev.key === "Escape") this._cancel();
	}

	_onMouseDown(e) {
		this.isDrawing = true;
		this.center = [e.lngLat.lng, e.lngLat.lat];
		this._updateLive(this.center, this.center);
	}

	_onMouseMove(e) {
		if (!this.isDrawing || !this.center) return;
		const edge = [e.lngLat.lng, e.lngLat.lat];
		this._updateLive(this.center, edge);
	}

	_onMouseUp(e) {
		if (!this.isDrawing || !this.center) return;
		this.isDrawing = false;
		const edge = [e.lngLat.lng, e.lngLat.lat];
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


