import * as turf from "@turf/turf";

// --- YOUR ORIGINAL GEOMETRY HELPERS ---
function sharesBorderEnough(a, b, minSharedMeters = 50) {
  const bbA = turf.bbox(a);
  const bbB = turf.bbox(b);
  if (
    bbA[2] < bbB[0] || bbB[2] < bbA[0] || 
    bbA[3] < bbB[1] || bbB[3] < bbA[1]
  ) {
    return false;
  }
  const la = turf.polygonToLine(a);
  const lb = turf.polygonToLine(b);
  const inter = turf.lineOverlap(la, lb, { tolerance: 1e-6 });
  if (!inter || (inter.features?.length || 0) === 0) return false;
  let total = 0;
  for (const seg of inter.features) {
    total += turf.length(seg, { units: "kilometers" }) * 1000;
  }
  return total >= minSharedMeters;
}

function areAdjacent(a, b, options) {
  const mode = options?.adjacencyMode || "touch"; 
  if (mode === "segment") return sharesBorderEnough(a, b, options?.minSharedMeters || 50);
  try {
    return turf.booleanIntersects(a, b);
  } catch (_) {
    return false;
  }
}

// Generates a random-looking but consistent number from a name
function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
  
// --- YOUR ORIGINAL DFS ALGORITHM (UPDATED FOR EMPIRES) ---
export function colorPolygonsFourColor(features, options = {}) {
  if (!Array.isArray(features) || features.length === 0) return [];
  const minSharedMeters = options.minSharedMeters ?? 50;
  const maxColors = Math.max(2, Math.min(12, options.maxColors || 6));

  // 1. Group Polygons into Empires by Name
  const empires = []; 
  const nameToId = new Map();

  features.forEach((f, i) => {
    const t = f?.geometry?.type;
    if (t !== "Polygon" && t !== "MultiPolygon") return;

    const rawName = f?.properties?.name;
    // Clean name to ensure fragments match perfectly
    const name = (rawName && typeof rawName === 'string' && rawName.trim() !== "") 
        ? rawName.trim().toLowerCase() 
        : `unnamed_${i}`; // Unnamed polygons get unique IDs

    let empId = nameToId.get(name);
    if (empId === undefined) {
      empId = empires.length;
      nameToId.set(name, empId);
      empires.push({ id: empId, name: name, polys: [] });
    }
    empires[empId].polys.push(f);
  });

  const n = empires.length;
  const adj = Array.from({ length: n }, () => new Set());

  // 2. Flatten for efficient neighbor checking
  const flatPolys = [];
  empires.forEach(emp => {
    emp.polys.forEach(f => {
      flatPolys.push({ empId: emp.id, f, bbox: turf.bbox(f) });
    });
  });

  // 3. Build Adjacency Graph (Who touches who?)
  for (let i = 0; i < flatPolys.length; i++) {
    for (let j = i + 1; j < flatPolys.length; j++) {
      const p1 = flatPolys[i];
      const p2 = flatPolys[j];

      if (p1.empId === p2.empId) continue; // Same empire, no conflict
      if (adj[p1.empId].has(p2.empId)) continue; // Already logged

      // Fast BBox reject
      if (
        p1.bbox[2] < p2.bbox[0] || p2.bbox[2] < p1.bbox[0] ||
        p1.bbox[3] < p2.bbox[1] || p2.bbox[3] < p1.bbox[1]
      ) continue;

      // Your original Turf geometry check!
      if (areAdjacent(p1.f, p2.f, { adjacencyMode: options.adjacencyMode || "touch", minSharedMeters })) {
        adj[p1.empId].add(p2.empId);
        adj[p2.empId].add(p1.empId);
      }
    }
  }

  // 4. DFS Graph Coloring (Your original greedy logic)
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => adj[b].size - adj[a].size
  );

  const color = new Array(n).fill(-1);
const MAX_COLORS = Math.max(2, Math.min(12, options.maxColors || 8)); // Ensure it uses all 8

  function canUse(idx, c) {
    for (const nb of adj[idx]) if (color[nb] === c) return false;
    return true;
  }

  function dfs(pos) {
    if (pos === order.length) return true;
    const idx = order[pos];
    
    // Pick a "Favorite" starting color based on the empire's name
    const empName = empires[idx].name;
    const favoriteColor = stringToHash(empName) % MAX_COLORS;

    // Loop through all colors, but START at the favorite color
    for (let i = 0; i < MAX_COLORS; i++) {
      const c = (favoriteColor + i) % MAX_COLORS; 
      
      if (!canUse(idx, c)) continue; // Neighbor check
      
      color[idx] = c;
      if (dfs(pos + 1)) return true;
      color[idx] = -1; // Backtrack
    }
    
    // Fallback: allow an extra color if mathematically unavoidable
    if (options.allowFifthColor) {
      const cExtra = MAX_COLORS;
      color[idx] = cExtra;
      if (dfs(pos + 1)) return true;
      color[idx] = -1;
    }
    return false;
  }

  dfs(0);

  // 5. Apply colors back to features
  return features.map((f, i) => {
    const outF = { ...f, properties: { ...(f.properties || {}) } };
    const t = f?.geometry?.type;
    
    if (t === "Polygon" || t === "MultiPolygon") {
      const rawName = f?.properties?.name;
      const name = (rawName && typeof rawName === 'string' && rawName.trim() !== "") 
          ? rawName.trim().toLowerCase() 
          : `unnamed_${i}`;
      
      const empId = nameToId.get(name);
      if (empId !== undefined) {
        outF.properties.colorIndex = Math.max(0, color[empId] ?? 0);
      }
    }
    return outF;
  });
}
export function colorIndexToHex(idx) {
    // A mix of your modern Tailwind colors and distinct map colors
    const palette = [
        "#EF4444", // 0: Tailwind Red (from your original)
        "#4F46E5", // 1: Tailwind Indigo / Deep Blue (from your original)
        "#10B981", // 2: Tailwind Emerald / Green (from your original)
        "#F97316", // 3: Tailwind Orange (Better contrast than Amber)
        "#A855F7", // 4: Tailwind Purple (from your original)
        "#06B6D4", // 5: Tailwind Cyan / Light Blue (from your original)
        "#6D4C41", // 6: Solid Brown (Earthy, distinct from reds/oranges)
        "#EAB308"  // 7: Tailwind Yellow/Gold (Highly visible at low opacity)
    ];
    return palette[idx % palette.length];
}

export function colorIndexToHexDark(idx) {
    // Darker companions matching the fill palette above
    const paletteDark = [
        "#991B1B", // 0: Dark Red (from your original)
        "#3730A3", // 1: Dark Indigo (from your original)
        "#047857", // 2: Dark Emerald (from your original)
        "#C2410C", // 3: Dark Orange
        "#7E22CE", // 4: Dark Purple (from your original)
        "#0E7490", // 5: Dark Cyan (from your original)
        "#3E2723", // 6: Dark Brown
        "#A16207"  // 7: Dark Yellow/Gold
    ];
    return paletteDark[idx % paletteDark.length];
} 