import axios from "axios";

export async function fetchAllHyperlinks(projectId,year,era) {
    const token = localStorage.getItem('bearerToken');
    const res = await axios.get('/project-management-service/get-all-hyperlink-by-project-id-and-year/'+projectId,{
        headers:{client_name:"mapx","Authorization": `Bearer ${token}`},
        params:{year,era}
    })
    return res.data.hyperlinks;
}

export async function updateHyperlink(hyperlinkId, email, hyperlink, year, era, hyperlinkTitle, latitude, longitude) {
    const token = localStorage.getItem('bearerToken');
    const payload = {};
    if (typeof hyperlink !== 'undefined') payload.hyperlink = hyperlink;
    if (typeof year !== 'undefined' && typeof era !== 'undefined') payload.yearInTimeline = { year, era };
    if (typeof hyperlinkTitle !== 'undefined' && hyperlinkTitle !== null) payload.hyperlinkTitle = hyperlinkTitle;
    if (typeof latitude !== 'undefined' && typeof longitude !== 'undefined') {
        payload.latitude = latitude;
        payload.longitude = longitude;
    }

    const res = await axios.patch(
        `/project-management-service/update-hyperlink/${hyperlinkId}`,
        payload,
        {
            headers: { client_name: "mapx","Authorization": `Bearer ${token}` },
            params: { email }
        }
    );
    console.log(res);
    return res.data;
}

export async function createHyperlink(projectId,email,hyperlinkTitle,year,era,latitude,longitude,hyperlink) {
    const token = localStorage.getItem('bearerToken');
    const res = await axios.post(`/project-management-service/create-new-hyperlink`,{projectId,email,hyperlinkTitle,yearInTimeline:{year,era},latitude,longitude,hyperlink},{headers:{client_name:"mapx","Authorization": `Bearer ${token}`}})
    return res;
}

export async function deleteHyperlink(hyperlinkId,email){
    const token = localStorage.getItem('bearerToken');
    const res = await axios.delete('/project-management-service/delete-hyperlink/'+hyperlinkId,{params:{email},headers:{client_name:"mapx","Authorization": `Bearer ${token}`}})
    return res;
}

export async function fetchAllHyperlinksByProject(projectId) {
    const token = localStorage.getItem('bearerToken');
    const res = await axios.get('/project-management-service/get-all-hyperlink-by-project-id/' + projectId, {
        headers: { client_name: "mapx","Authorization": `Bearer ${token}` }
    });
    return res.data.hyperlinks || [];
}