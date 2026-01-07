export const mapViewState = {
  lng: 0,
  lat: 0,

  deltaLng: 0,
  deltaLat: 0,

  movementStrength: 0
};

let prevLng = 0;
let prevLat = 0;

export function attachMapViewCollector(map) {
  map.on("render", () => {
    const center = map.getCenter();

    mapViewState.lng = center.lng;
    mapViewState.lat = center.lat;

    mapViewState.deltaLng = center.lng - prevLng;
    mapViewState.deltaLat = center.lat - prevLat;

    mapViewState.movementStrength = Math.min(
      Math.abs(mapViewState.deltaLng) * 2 +
      Math.abs(mapViewState.deltaLat) * 2,
      1
    );

    prevLng = center.lng;
    prevLat = center.lat;
  });
}
