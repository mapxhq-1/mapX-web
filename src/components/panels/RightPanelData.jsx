import note_icon from '../../assets/icons/note_icon.png'
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotes } from '../api/note';
import { useParams } from 'react-router-dom';
function RightPanelData() {
    const { id: projectId } = useParams();
    const {data:notes,isLoading,error} = useQuery({
        queryKey:["notes",projectId,2004,"CE"],
        queryFn: ()=>fetchAllNotes(projectId,2004,"CE"), 
    })
    if (isLoading) return <p>Loading notes...</p>;
    if (error){ console.log(error); return <p>Error loading notes </p>;}
  return (
    
    <div className='max-h-[68dvh] overflow-auto'>
        {notes.map((note)=>{
        return <div key={note.noteId}>
            <div className='flex items-start gap-2 h-[130px] w-full text-sm'>
                <img src={note_icon} alt="" />
                Notes title...
            </div>
        </div>
        })}
        
    </div>
  )
}

export default RightPanelData;