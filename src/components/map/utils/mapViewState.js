export const mapViewState = {
  lng: 0,
  lat: 0,
  zoom: 1, // ✅ Added Zoom State

  deltaLng: 0,
  deltaLat: 0,
  deltaZoom: 0, // ✅ Added Zoom Change

  movementStrength: 0
};

let prevLng = 0;
let prevLat = 0;
let prevZoom = 1; // ✅ Track previous zoom

export function attachMapViewCollector(map) {
  map.on("render", () => {
    const center = map.getCenter();
    const zoom = map.getZoom(); // ✅ Get Map Zoom

    mapViewState.lng = center.lng;
    mapViewState.lat = center.lat;
    mapViewState.zoom = zoom;
    // console.log(zoom);
    mapViewState.deltaLng = center.lng - prevLng;
    mapViewState.deltaLat = center.lat - prevLat;
    mapViewState.deltaZoom = zoom - prevZoom; // ✅ Calculate Zoom Speed

    // Added zoom to movement strength (multiplied by 5 because zoom changes are usually small numbers)
    mapViewState.movementStrength = Math.min(
      Math.abs(mapViewState.deltaLng) * 2 +
      Math.abs(mapViewState.deltaLat) * 2 +
      Math.abs(mapViewState.deltaZoom) * 5,
      1
    );

    prevLng = center.lng;
    prevLat = center.lat;
    prevZoom = zoom;
  });
}