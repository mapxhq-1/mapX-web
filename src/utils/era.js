export function getEraForYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return 'CE';
  return y < 0 ? 'BCE' : 'CE';
}

export function getAbsoluteYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return 0;
  return Math.abs(y);
}


