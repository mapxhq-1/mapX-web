import axios from 'axios';
export async function fetchAllNotes(projectId,year,era){
    const res = await axios.get('/project-management-service/get-all-note-by-project-id-and-year/'+projectId,{headers:{client_name : "mapx"},params:{
        year : year,era:era
    }});
    return res.data.note;
}