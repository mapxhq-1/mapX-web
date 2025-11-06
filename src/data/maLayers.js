import maNameListRaw from "./name.md?raw";

const imageModules = import.meta.glob("./images/*.jpg", {
  eager: true,
  import: "default",
});

const DEFAULT_COORDINATES = [
  [-179.999, 85.0511287798066],
  [179.999, 85.0511287798066],
  [179.999, -85.0511287798066],
  [-179.999, -85.0511287798066],
];

const toNumberArray = (matches) => {
  if (!Array.isArray(matches)) return [];
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const raw = matches[i];
    const value = Number(raw);
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
};

const parseMaEntries = () => {
  const rawLines = String(maNameListRaw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];
  for (let i = 0; i < rawLines.length; i++) {
    const fileName = rawLines[i];
    const imageKey = `./images/${fileName}`;
    const imageUrl = imageModules[imageKey];
    if (!imageUrl) {
      continue;
    }

    const numberMatches = [...fileName.matchAll(/(\d+(?:\.\d+)?)Ma/gi)].map((m) => m[1]);
    const numbers = toNumberArray(numberMatches);

    let primaryMa = null;
    if (/^Present_0Ma/i.test(fileName)) {
      primaryMa = 1;
    } else if (numbers.length > 0) {
      primaryMa = Math.round(Math.max(...numbers));
      if (primaryMa <= 0) primaryMa = 1;
    }

    if (!Number.isFinite(primaryMa) || primaryMa < 1) {
      continue;
    }

    entries.push({
      ma: primaryMa,
      fileName,
      imageUrl,
      coordinates: DEFAULT_COORDINATES,
    });
  }

  entries.sort((a, b) => a.ma - b.ma);
  return entries;
};

const MA_IMAGE_SEQUENCE = parseMaEntries();

const buildBins = () => {
  const set = new Set();
  const bins = [];
  for (let i = 0; i < MA_IMAGE_SEQUENCE.length; i++) {
    const value = MA_IMAGE_SEQUENCE[i].ma;
    if (!set.has(value)) {
      set.add(value);
      bins.push(value);
    }
  }
  bins.sort((a, b) => a - b);
  return bins;
};

const MA_BINS_FROM_DATA = buildBins();

const MA_IMAGE_MAP = (() => {
  const map = new Map();
  for (let i = 0; i < MA_IMAGE_SEQUENCE.length; i++) {
    const entry = MA_IMAGE_SEQUENCE[i];
    if (!map.has(entry.ma)) {
      map.set(entry.ma, entry);
    }
  }
  return map;
})();

export { MA_IMAGE_SEQUENCE, MA_BINS_FROM_DATA };

export function findOverlayForMa(ma) {
  const numeric = Number(ma);
  if (!Number.isFinite(numeric) || numeric < 1) return null;

  if (MA_IMAGE_MAP.has(numeric)) {
    return MA_IMAGE_MAP.get(numeric);
  }

  let candidate = null;
  for (let i = 0; i < MA_IMAGE_SEQUENCE.length; i++) {
    const entry = MA_IMAGE_SEQUENCE[i];
    if (entry.ma <= numeric) {
      candidate = entry;
    } else {
      break;
    }
  }
  return candidate;
}

export const MA_OVERLAY_COORDINATES = DEFAULT_COORDINATES;

