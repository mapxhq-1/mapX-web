import axios from 'axios';
export async function fetchAllNotes(projectId, year, era) {
    const res = await axios.get('/project-management-service/get-all-note-by-project-id-and-year/' + projectId, {
        headers: { client_name: "mapx" }, params: {
            year: year, era: era
        }
    });
    return res.data.notes;
}

export async function updateNote(noteId, year, era, email, htmlText) {
    const res = await axios.patch('/project-management-service/update-note/' + noteId, {
        yearInTimeline: {
            year, era
        }, htmlText
    }, {
        headers: { client_name: "mapx" },
        params: {
            email,
        },
    })
    return res.data.status;
}

export async function createNote(projectId, year, era, latitude, longitude, email, htmlText, Title, backgroundColor) {
    const res = await axios.post('/project-management-service/create-new-note',
        { projectId, yearInTimeline: { year, era }, latitude, longitude, email, htmlText, noteTitle:Title, backgroundColor }, {
        headers: {
            client_name: "mapx"
        }
    })
    return res;
}

export async function deleteTheNote(noteId,email){
    const res = await axios.delete('/project-management-service/delete-note/'+noteId,{params:{email},headers:{client_name:"mapx"}})
    return res;
}

export async function fetchAllNotesByProject(projectId) {
    const res = await axios.get('/project-management-service/get-all-notes-by-project/' + projectId, {
        headers: { client_name: "mapx" }
    });
    return res.data.notes || [];
}