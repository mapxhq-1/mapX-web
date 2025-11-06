import { MA_BINS_FROM_DATA } from "../data/maLayers";

const MA_BOUNDARY_YEAR = -4500;
const MA_MIN_BIN = 1;
const MA_MAX_BIN = 750;

export const MA_BINS = MA_BINS_FROM_DATA.length
  ? MA_BINS_FROM_DATA.slice().sort((a, b) => a - b)
  : (() => {
      const binsFallback = [MA_MIN_BIN];
      for (let bin = 10; bin <= MA_MAX_BIN; bin += 10) binsFallback.push(bin);
      return binsFallback;
    })();

const clampMaBin = (value) => {
  if (!Number.isFinite(value)) return MA_MIN_BIN;
  const sortedBins = MA_BINS;
  const minBin = sortedBins[0] ?? MA_MIN_BIN;
  const maxBin = sortedBins[sortedBins.length - 1] ?? MA_MAX_BIN;
  if (value <= minBin) return minBin;
  if (value >= maxBin) return maxBin;
  return value;
};

export const MA_MIN_YEAR = maBinToYear(MA_BINS[MA_BINS.length - 1] ?? MA_MAX_BIN);
export const MA_MAX_YEAR = maBinToYear(MA_BINS[0] ?? MA_MIN_BIN);

export function isMaRange(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return false;
  return y <= MA_MAX_YEAR && y >= MA_MIN_YEAR;
}

export function maBinToYear(maBin) {
  const bin = clampMaBin(Number(maBin));
  return MA_BOUNDARY_YEAR - bin;
}

export function yearToMaBin(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  if (!isMaRange(y)) return null;
  return MA_BOUNDARY_YEAR - y;
}

export function getEraForYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return 'CE';
  if (isMaRange(y)) return 'MA';
  return y < 0 ? 'BCE' : 'CE';
}

export function getAbsoluteYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return 0;
  if (isMaRange(y)) {
    const maBin = yearToMaBin(y);
    return maBin !== null ? maBin : 0;
  }
  return Math.abs(y);
}

export function yearFromDbFormat(dbYear, dbEra) {
  const y = Number(dbYear);
  const era = String(dbEra || '').trim().toUpperCase();

  if (!Number.isFinite(y)) return null;

  if (era === 'MA') {
    return maBinToYear(y);
  }

  if (era === 'BCE') {
    return -Math.abs(y);
  }

  return Math.abs(y);
}
