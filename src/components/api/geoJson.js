import axios from "axios";
const BASE_URL = import.meta.env.VITE_URL_GEO;

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
    // console.log(res.data);
    return res.data; // full empire details including content
  } catch (err) {
    console.error("Error fetching empire details:", err);
    throw err;
  }
}