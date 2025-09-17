// Geometry worker: simplify strokes off the main thread
// Implements Ramer–Douglas–Peucker locally to avoid bundler issues

function metersToDegreesLat(meters) {
	// ~111.32 km per degree latitude
	return meters / 111320;
}

function metersToDegreesLon(meters, refLatDeg) {
	const latRad = (Math.PI / 180) * Math.max(-89.999, Math.min(89.999, refLatDeg || 0));
	const metersPerDegree = 111320 * Math.cos(latRad);
	const safe = Math.max(1e-6, metersPerDegree);
	return meters / safe;
}

function metersToDegreesIsotropic(meters, refLatDeg) {
	// Conservative choice: take the smaller of lon/lat degree spans for tolerance
	const dLat = metersToDegreesLat(meters);
	const dLon = metersToDegreesLon(meters, refLatDeg);
	return Math.min(dLat, dLon);
}

self.onmessage = async (ev) => {
	try {
		const data = ev.data || {};
		if (data.type === "simplify-line") {
			const coords = data.coords; // Array<[lng,lat]>
			const toleranceMeters = Number(data.toleranceMeters || 1);
			const refLat = Number(data.refLat || 0);
			const toleranceDeg = metersToDegreesIsotropic(toleranceMeters, refLat);
			const simplified = rdpSimplify(coords, toleranceDeg);
			self.postMessage({ ok: true, type: "simplify-line:done", coords: simplified });
			return;
		}
		self.postMessage({ ok: false, error: "unknown_task" });
	} catch (err) {
		self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
	}
};

// Ramer–Douglas–Peucker simplification for [lng, lat] arrays in degrees
function rdpSimplify(points, epsilon) {
	if (!Array.isArray(points) || points.length <= 2) return points ? points.slice() : [];
	const first = 0;
	const last = points.length - 1;
	const keep = new Array(points.length).fill(false);
	keep[first] = true;
	keep[last] = true;

	const stack = [[first, last]];
	const eps2 = epsilon * epsilon;

	while (stack.length) {
		const [start, end] = stack.pop();
		let maxDist2 = -1;
		let index = -1;
		const p1 = points[start];
		const p2 = points[end];
		for (let i = start + 1; i < end; i++) {
			const d2 = perpendicularSquaredDistance(points[i], p1, p2);
			if (d2 > maxDist2) {
				maxDist2 = d2;
				index = i;
			}
		}
		if (maxDist2 > eps2 && index !== -1) {
			keep[index] = true;
			stack.push([start, index]);
			stack.push([index, end]);
		}
	}

	const out = [];
	for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
	return out;
}

function perpendicularSquaredDistance(p, a, b) {
	const x = p[0], y = p[1];
	const x1 = a[0], y1 = a[1];
	const x2 = b[0], y2 = b[1];
	let dx = x2 - x1;
	let dy = y2 - y1;
	if (dx === 0 && dy === 0) {
		dx = x - x1;
		dy = y - y1;
		return dx * dx + dy * dy;
	}
	const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
	const tClamped = Math.max(0, Math.min(1, t));
	const px = x1 + tClamped * dx;
	const py = y1 + tClamped * dy;
	const ddx = x - px;
	const ddy = y - py;
	return ddx * ddx + ddy * ddy;
}

self.onmessage = async (ev) => {
	try {
		const data = ev.data || {};
		if (data.type === "simplify-line") {
			const coords = data.coords; // Array<[lng,lat]>
			const toleranceMeters = Number(data.toleranceMeters || 1);
			const refLat = Number(data.refLat || 0);
			const toleranceDeg = metersToDegreesIsotropic(toleranceMeters, refLat);
			const geo = lineString(coords);
			// highQuality=false for speed; preserve topology is irrelevant for LineString
			const simplified = simplify(geo, {
				tolerance: toleranceDeg,
				highQuality: false,
				mutate: false,
			});
			self.postMessage({ ok: true, type: "simplify-line:done", coords: simplified.geometry.coordinates });
			return;
		}
		self.postMessage({ ok: false, error: "unknown_task" });
	} catch (err) {
		self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
	}
};


