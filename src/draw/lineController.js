// Line controller: click-drag to draw a straight line segment

export class LineController {
	constructor(params) {
		this.map = params.map;
		this.liveSourceId = params.liveSourceId;
		this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
		this.isActive = false;
		this.isDrawing = false;
		this._start = null;
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
			this.map.on("mousedown", this._onMouseDown);
			this.map.on("mousemove", this._onMouseMove);
			this.map.on("mouseup", this._onMouseUp);
			window.addEventListener("keydown", this._onKeyDown);
			this.map.getCanvas().style.cursor = "crosshair";
		} else {
			this._cancel();
			this.map.off("mousedown", this._onMouseDown);
			this.map.off("mousemove", this._onMouseMove);
			this.map.off("mouseup", this._onMouseUp);
			window.removeEventListener("keydown", this._onKeyDown);
			try { this.map && this.map.dragPan && this.map.dragPan.enable(); } catch (_) {}
			this.map.getCanvas().style.cursor = "";
		}
	}

	_onKeyDown(ev) {
		if (ev.key === "Escape") this._cancel();
	}

	_onMouseDown(e) {
		if (!this.isActive) return;
		this.isDrawing = true;
		this._start = [e.lngLat.lng, e.lngLat.lat];
		this._updateLive([this._start, this._start]);
	}

	_onMouseMove(e) {
		if (!this.isActive || !this.isDrawing) return;
		const end = [e.lngLat.lng, e.lngLat.lat];
		this._updateLive([this._start, end]);
	}

	_onMouseUp(e) {
		if (!this.isActive || !this.isDrawing) return;
		this.isDrawing = false;
		const end = [e.lngLat.lng, e.lngLat.lat];
		const coords = [this._start, end];
		this._commit(coords);
	}

	_updateLive(coords) {
		try {
			const src = this.map.getSource(this.liveSourceId);
			src && src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { tool: "line" } }] });
		} catch (_) {}
	}

	_cancel() {
		this.isDrawing = false;
		this._start = null;
		try {
			const src = this.map.getSource(this.liveSourceId);
			src && src.setData({ type: "FeatureCollection", features: [] });
		} catch (_) {}
	}

	_commit(coords) {
		try {
			this.onFinalize && this.onFinalize(coords);
		} catch (_) {}
		this._cancel();
	}
}

export default LineController;


