import note_icon from '../../assets/icons/note_icon.png'
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotes } from '../api/note';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
function RightPanelData() {
    const { id: projectId } = useParams();
    const year = useSelector(state=>state.map.year);
    const {data:notes,isLoading,error} = useQuery({
        queryKey:["notes",projectId,year,"CE"],
        queryFn: ()=>fetchAllNotes(projectId,year,"CE"), 
    })
    if (isLoading) return <p>Loading notes...</p>;
    if (error){ return <p>No notes for current year</p>;}
  return (
    
    <div className='max-h-[68dvh] overflow-auto'>
        {notes.map((note)=>{
        return <div key={note.noteId}>
            <div className='flex items-start gap-2 h-[130px] w-full text-sm'>
                <img src={note_icon} alt="" />
                {note.noteTitle}
                <p>{note.yearInTimeline.year}</p>
            </div>
        </div>
        })}
        
    </div>
  )
}

export default RightPanelData;