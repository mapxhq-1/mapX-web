import axios from 'axios';
const BASE_URL = import.meta.env.VITE_URL_PROJECT +  "/project-management-service";

export async function fetchAllNotes(projectId, year, era) {
    const token = localStorage.getItem('bearerToken');
    try{
        const res = await axios.get(BASE_URL+'/get-all-note-by-project-id-and-year/' + projectId, {
            headers: { client_name: "mapx","Authorization": `Bearer ${token}` }, params: {
                year: year, era: era
            }
        });
        return res.data.notes;
    }catch(err){
        
    }
}

export async function updateNote(noteId, year, era, email, htmlText, currentColor) {
    const token = localStorage.getItem('bearerToken');
    const res = await axios.patch(BASE_URL+'/update-note/' + noteId, {
        yearInTimeline: {
            year, era
        }, htmlText, backgroundColor:currentColor
    }, {
        headers: { client_name: "mapx","Authorization": `Bearer ${token}` },
        params: {
            email,
        },
    })
    return res.data.status;
}

export async function createNote(projectId, year, era, latitude, longitude, email, htmlText, Title, backgroundColor) {
    const token = localStorage.getItem('bearerToken');
    const res = await axios.post(BASE_URL+'/create-new-note',
        { projectId, yearInTimeline: { year, era }, latitude, longitude, email, htmlText, noteTitle:Title, backgroundColor }, {
        headers: {
            client_name: "mapx","Authorization": `Bearer ${token}`
        }
    })
    return res;
}

export async function deleteTheNote(noteId,email){
    const token = localStorage.getItem('bearerToken');
    const res = await axios.delete(BASE_URL+'/delete-note/'+noteId,{params:{email},headers:{client_name:"mapx","Authorization": `Bearer ${token}`}})
    return res;
}

export async function fetchAllNotesByProject(projectId) {
    const token = localStorage.getItem('bearerToken');
    const res = await axios.get(BASE_URL+'/get-all-note-by-project-id/' + projectId, {
        headers: { client_name: "mapx","Authorization": `Bearer ${token}` }
    });
    return res.data.notes || [];
}