export const isMaEra = (era) =>
  typeof era === "string" && era.trim().toUpperCase() === "MA";

export const maybeHandleMaMapShapes = ({ era, mapRef, finalFeaturesRef }) => {
  if (!isMaEra(era)) return false;
  if (finalFeaturesRef && "current" in finalFeaturesRef) {
    finalFeaturesRef.current = [];
  }
  const map = mapRef?.current;
  if (map) {
    try {
      map.getSource("draw-final-src")?.setData({
        type: "FeatureCollection",
        features: [],
      });
    } catch (_) {}
  }
  return true;
};

export const handleInitialMaContext = ({ context, onLoad, onClear }) => {
  if (!context) return;
  if (isMaEra(context.era)) {
    onClear?.();
  } else {
    onLoad?.(context);
  }
};

export const createMaSafeLoader = ({ onLoad, onClear }) => {
  return (opts = {}) => {
    if (isMaEra((opts?.era ?? "").toString())) {
      onClear?.();
      return;
    }
    onLoad?.(opts);
  };
};

