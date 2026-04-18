import axios from "axios";
const BASE_URL = import.meta.env.VITE_URL_GEO + "/geo-json-service";

export async function getAllEmpires() {
  const token = localStorage.getItem('bearerToken');
  try {
    const res = await axios.get(BASE_URL+"/get-all-empires", {
      headers: { client_name: "mapx","Authorization": `Bearer ${token}` }, 
    });
    // console.log(res.data);
    return res.data; 
  } catch (err) {
    console.error("Error fetching empires:", err);
    throw err;
  }
}

export async function getEmpireDetailsById(id) {
  const token = localStorage.getItem('bearerToken');
  try {
    const res = await axios.get(
      BASE_URL+`/get-empire-details-by-id/${id}`,
      {
        headers: {
          Accept: "application/json",
          client_name: "mapx", // optional if backend expects it
          "Authorization": `Bearer ${token}`
        },
      }
    );
    res.data.content=JSON.parse(atob(res.data.content));
    console.log(res.data.content);
    return res.data; // full empire details including content
  } catch (err) {
    console.error("Error fetching empire details:", err);
    throw err;
  }
}
export async function getAllLayers(){
  const token = localStorage.getItem('bearerToken');
  try {
    const res = await axios.get(
      BASE_URL+`/get_all_geo_layers`,
      {
        headers: {
          client_name: "mapdesk",
          "Authorization": `Bearer ${token}`
        },
      }
    );
    // console.log(res.data.response);
    return res.data.response; 
  } catch (err) {
    console.error("Error fetching empire details:", err);
    throw err;
  }
}

export async function searchGeoLayers(layerType = null){
  const token = localStorage.getItem('bearerToken');
  try {
    const res = await axios.get(
      BASE_URL+`/search_geo_layers`,
      {
        headers: {
          client_name: "mapdesk",
          "Authorization": `Bearer ${token}`
        },params: {layerType}
      }
    );
    // console.log("search",res.data.response);
    return res.data.response; 
  } catch (err) {
    console.error("Error fetching empire details:", err);
    throw err;
  }
}

export async function fetchLayerFiles(geoJsonFileId){
  if (!geoJsonFileId) {
    throw new Error("geoJsonFileId is required to fetch layer files.");
  }
  const token = localStorage.getItem('bearerToken');
  const queryParams = { geoJsonFileId };
  try {
    const res = await axios.get(
      BASE_URL+`/fetch-layer-files`,
      {
        params: queryParams,
        headers: {
          client_name: "mapdesk",
          "Authorization": `Bearer ${token}`
        }
      }
    );
    // console.log(res.data.response);
    return res.data.response; 
  } catch (err) {
    console.error("Error fetching empire details:", err);
    throw err;
  }
}