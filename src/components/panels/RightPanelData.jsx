import note_icon from '../../assets/icons/note_icon.png'
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotes } from '../api/note';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import image_icon from '../../assets/icons/image_icon.png'
import hyperlink_icon from '../../assets/icons/hyperlink_icon.png'
import { fetchAllImages } from '../api/image';
import { fetchAllHyperlinks } from '../api/hyperlink';
function RightPanelData() {
    const { id: projectId } = useParams();
    const year = useSelector(state=>state.map.year);
    const {data:notes,isLoading,error} = useQuery({
        queryKey:["notes",projectId,year,"CE"],
        queryFn: ()=>fetchAllNotes(projectId,year,"CE"), 
    })
    const {data:imagesD,isLoadingI,errorI} = useQuery({
        queryKey:["images",projectId,year,"CE"],
        queryFn: ()=>fetchAllImages(projectId,year,"CE"),
    })
    const {data:hyperlink,isLoadingL,errorL} = useQuery({
        queryKey:["hyperlink",projectId,year,"CE"],
        queryFn: ()=>fetchAllHyperlinks(projectId,year,"CE"),
    })
    if (isLoading) return <p>Loading notes...</p>;
    if (error){ return <p>No notes for current year</p>;}
    if(isLoadingI)return <p>Loading images...</p>;
    if (errorI){ return <p>No images for current year</p>;}  
    if(isLoadingL)return <p>Loading Hyperlinks...</p>;
    if (errorI){ return <p>No hyperlinks for current year</p>;}  
    console.log(imagesD)
    return (
    
        <div className="max-h-[68dvh] overflow-y-auto overflow-x-visible">
  {notes.map((note) => (
    <div key={note.noteId} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2">
      <img src={note_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
      <div className="flex-1 break-words whitespace-normal">
        <p>{note.noteTitle}</p>
        <p>{note.yearInTimeline.year}</p>
      </div>
    </div>
  ))}

  {imagesD.map((img) => (
    <div key={img.id} className="flex flex-wrap items-start gap-2 w-full text-sm rounded-lg p-2">
      <img src={image_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
      <div className="flex-1 break-words whitespace-normal">
        <p>{img.caption}</p>
        <p>{img.yearInTimeline.year}</p>
      </div>
    </div>
  ))}

  {hyperlink.map((hyper) => (
    <div key={hyper.id} className="flex flex-wrap items-start gap-2 w-full text-sm rounded-lg p-2">
      <img src={hyperlink_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
      <div className="flex-1 break-words whitespace-normal">
        <a href={hyper.hyperlink} className="text-blue-400 underline break-all">{hyper.hyperlink}</a>
        <p>{hyper.yearInTimeline.year}</p>
      </div>
    </div>
  ))}
</div>

  )
}

export default RightPanelData;