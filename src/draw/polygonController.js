// Polygon controller: click to add vertices, double-click or Enter to close

export class PolygonController {
	constructor(params) {
		this.map = params.map;
		this.liveSourceId = params.liveSourceId;
		this.onFinalize = typeof params.onFinalize === "function" ? params.onFinalize : null;
		this.isActive = false;
		this.points = [];
		this._onClick = this._onClick.bind(this);
		this._onMove = this._onMove.bind(this);
		this._onDbl = this._onDbl.bind(this);
		this._onKey = this._onKey.bind(this);
		this._temp = null;
	}

	setActive(active) {
		if (active === this.isActive) return;
		this.isActive = active;
		if (active) {
			try { this.map && this.map.dragPan && this.map.dragPan.disable(); } catch (_) {}
			this.points = [];
			this._temp = null;
			this.map.on("click", this._onClick);
			this.map.on("mousemove", this._onMove);
			this.map.on("dblclick", this._onDbl);
			window.addEventListener("keydown", this._onKey);
			this.map.getCanvas().style.cursor = "crosshair";
		} else {
			this.map.off("click", this._onClick);
			this.map.off("mousemove", this._onMove);
			this.map.off("dblclick", this._onDbl);
			window.removeEventListener("keydown", this._onKey);
			this._clearLive();
			try { this.map && this.map.dragPan && this.map.dragPan.enable(); } catch (_) {}
			this.map.getCanvas().style.cursor = "";
		}
	}

	_onKey(ev) {
		if (ev.key === "Escape") this._finalize(false);
		if (ev.key === "Enter") this._finalize(true);
	}

	_onClick(e) {
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


