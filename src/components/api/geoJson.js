import axios from "axios";
const token = localStorage.getItem('bearerToken');
export async function getAllEmpires() {
  try {
    const res = await axios.get("/geo-json-service/get-all-empires", {
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
  try {
    const res = await axios.get(
      `/geo-json-service/get-empire-details-by-id/${id}`,
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