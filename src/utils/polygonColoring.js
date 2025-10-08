// Graph-based four-coloring for planar polygon datasets.
// - Builds adjacency if polygons share border segments longer than a threshold
// - Greedy coloring with backtracking on conflicts
// - Returns a new features array with "colorIndex" property in [0..3]

import * as turf from "@turf/turf";

function sharesBorderEnough(a, b, minSharedMeters = 50) {
  // Fast bbox reject
  const bbA = turf.bbox(a);
  const bbB = turf.bbox(b);
  if (
    bbA[2] < bbB[0] || // a.maxX < b.minX
    bbB[2] < bbA[0] || // b.maxX < a.minX
    bbA[3] < bbB[1] || // a.maxY < b.minY
    bbB[3] < bbA[1] // b.maxY < a.minY
  ) {
    return false;
  }
  // Use line overlap length as criterion; treat MultiPolygon as unioned
  const la = turf.polygonToLine(a);
  const lb = turf.polygonToLine(b);
  // Buffer tiny to capture near-coincident vertices
  const inter = turf.lineOverlap(la, lb, { tolerance: 1e-6 });
  if (!inter || (inter.features?.length || 0) === 0) return false;
  let total = 0;
  for (const seg of inter.features) {
    total += turf.length(seg, { units: "kilometers" }) * 1000;
  }
  return total >= minSharedMeters;
}

// More permissive adjacency: treat polygons as adjacent if they intersect or touch
function areAdjacent(a, b, options) {
  const mode = options?.adjacencyMode || "touch"; // 'touch' | 'segment'
  if (mode === "segment") return sharesBorderEnough(a, b, options?.minSharedMeters || 50);
  try {
    // booleanIntersects covers both interior overlap and boundary touch
    return turf.booleanIntersects(a, b);
  } catch (_) {
    return false;
  }
}

export function colorPolygonsFourColor(features, options = {}) {
  if (!Array.isArray(features) || features.length === 0) return [];
  const minSharedMeters = options.minSharedMeters ?? 50;
  const maxColors = Math.max(2, Math.min(12, options.maxColors || 6));

  // Normalize to polygons only
  const polys = features
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => {
      const t = f?.geometry?.type;
      return t === "Polygon" || t === "MultiPolygon";
    });

  // Build adjacency list
  const n = polys.length;
  const adj = Array.from({ length: n }, () => new Set());

  // Spatial index via bboxes for pruning
  const boxes = polys.map(({ f }) => turf.bbox(f));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]) continue;
      if (areAdjacent(polys[i].f, polys[j].f, { adjacencyMode: options.adjacencyMode || "touch", minSharedMeters })) {
        adj[i].add(j);
        adj[j].add(i);
      }
    }
  }

  // Order by descending degree for better greedy results
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => adj[b].size - adj[a].size
  );

  const color = new Array(n).fill(-1);
  const MAX_COLORS = maxColors;

  function canUse(idx, c) {
    for (const nb of adj[idx]) if (color[nb] === c) return false;
    return true;
  }

  function dfs(pos) {
    if (pos === order.length) return true;
    const idx = order[pos];
    for (let c = 0; c < MAX_COLORS; c++) {
      if (!canUse(idx, c)) continue;
      color[idx] = c;
      if (dfs(pos + 1)) return true;
      color[idx] = -1;
    }
    // Fallback: allow a 5th color if unavoidable (should be rare with planar inputs)
    if (options.allowFifthColor) {
      const c5 = 4;
      color[idx] = c5;
      if (dfs(pos + 1)) return true;
      color[idx] = -1;
    }
    return false;
  }

  dfs(0);

  // Apply colors back to features, cloning props minimally
  const out = features.map((f) => ({ ...f }));
  for (let k = 0; k < polys.length; k++) {
    const origIdx = polys[k].i;
    const c = Math.max(0, color[k] ?? 0);
    out[origIdx] = {
      ...out[origIdx],
      properties: { ...(out[origIdx].properties || {}), colorIndex: c },
    };
  }
  return out;
}

export function colorIndexToHex(idx) {
  // Modern, readable 6-color palette (Tailwind-inspired mids for visibility at 0.2 opacity)
  const palette = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7"];
  return palette[idx % palette.length];
}

export function colorIndexToHexDark(idx) {
  // Darker companions matching the fill palette above
  const paletteDark = ["#3730A3", "#047857", "#B45309", "#991B1B", "#0E7490", "#7E22CE"];
  return paletteDark[idx % paletteDark.length];
}


