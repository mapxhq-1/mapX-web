import axios from "axios";
export async function fetchAllHyperlinks(projectId,year,era) {
    const res = await axios.get('/project-management-service/get-all-hyperlink-by-project-id-and-year/'+projectId,{
        headers:{client_name:"mapx"},
        params:{year,era}
    })
    console.log(res);
    return res.data.hyperlinks;
}

export async function updateHyperlink(hyperlinkId, email, hyperlink, year, era) {
    const res = await axios.patch(
        `/project-management-service/update-hyperlink/${hyperlinkId}`,
        {yearInTimeline:{year,era},hyperlink},
        {
            headers: { client_name: "mapx" },
            params: { email }
        }
    );
    console.log(res);
    return res.data;
}

export async function createHyperlink(projectId,email,hyperlinkTitle,year,era,latitude,longitude,hyperlink) {
    const res = await axios.post(`/project-management-service/create-new-hyperlink`,{projectId,email,hyperlinkTitle,yearInTimeline:{year,era},latitude,longitude,hyperlink},{headers:{client_name:"mapx"}})
    console.log(res);
}
