import * as turf from "@turf/turf";

// --- HELPERS ---
function sharesBorderEnough(a, b, minSharedMeters = 50) {
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

function stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}
  
// --- OPTIMIZED ALGORITHM ---
export function colorPolygonsFourColor(features, options = {}) {
    if (!Array.isArray(features) || features.length === 0) return [];
    const minSharedMeters = options.minSharedMeters ?? 50;
    const MAX_COLORS = Math.max(2, Math.min(12, options.maxColors || 8));

    // 1. Group Polygons into Empires by Name
    const empires = []; 
    const nameToId = new Map();

    features.forEach((f, i) => {
        const t = f?.geometry?.type;
        if (t !== "Polygon" && t !== "MultiPolygon") return;

        const rawName = f?.properties?.name;
        const name = (rawName && typeof rawName === 'string' && rawName.trim() !== "") 
            ? rawName.trim().toLowerCase() 
            : `unnamed_${i}`;

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

    // 2. Flatten and pre-calculate BBoxes
    const flatPolys = [];
    empires.forEach(emp => {
        emp.polys.forEach(f => {
            flatPolys.push({ empId: emp.id, f, bbox: turf.bbox(f) });
        });
    });

    // 3. SWEEP-LINE OPTIMIZATION: Sort by minimum X coordinate
    // This is the magic bullet that stops the crash.
    flatPolys.sort((a, b) => a.bbox[0] - b.bbox[0]);

    // Build Adjacency Graph
    for (let i = 0; i < flatPolys.length; i++) {
        const p1 = flatPolys[i];
        
        for (let j = i + 1; j < flatPolys.length; j++) {
            const p2 = flatPolys[j];

            // THE SWEEP-LINE BREAK: 
            // Because the array is sorted left-to-right, if p2's left edge is further right 
            // than p1's right edge, NO OTHER polygons after 'j' can possibly touch 'p1'. 
            // We can completely abort the inner loop, saving millions of calculations.
            if (p2.bbox[0] > p1.bbox[2]) break;

            if (p1.empId === p2.empId) continue;
            if (adj[p1.empId].has(p2.empId)) continue;

            // Fast Y-axis BBox reject
            if (p1.bbox[3] < p2.bbox[1] || p2.bbox[3] < p1.bbox[1]) continue;

            // Heavy Turf check (only runs if bounding boxes actually overlap)
            if (areAdjacent(p1.f, p2.f, { adjacencyMode: options.adjacencyMode || "touch", minSharedMeters })) {
                adj[p1.empId].add(p2.empId);
                adj[p2.empId].add(p1.empId);
            }
        }
    }

    // 4. ITERATIVE GREEDY COLORING (No more stack overflow crashes)
    const order = Array.from({ length: n }, (_, i) => i).sort(
        (a, b) => adj[b].size - adj[a].size
    );

    const color = new Array(n).fill(-1);

    function canUse(idx, c) {
        for (const nb of adj[idx]) if (color[nb] === c) return false;
        return true;
    }

    // Iterate instead of recurse.
    for (const idx of order) {
        const empName = empires[idx].name;
        const favoriteColor = stringToHash(empName) % MAX_COLORS;
        
        let chosenColor = -1;

        // Try to find an available color, starting with the favorite
        for (let i = 0; i < MAX_COLORS; i++) {
            const c = (favoriteColor + i) % MAX_COLORS;
            if (canUse(idx, c)) {
                chosenColor = c;
                break;
            }
        }

        // Apply chosen color, or use the fallback if completely trapped
        if (chosenColor !== -1) {
            color[idx] = chosenColor;
        } else {
            color[idx] = MAX_COLORS; // The options.allowFifthColor fallback
        }
    }

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