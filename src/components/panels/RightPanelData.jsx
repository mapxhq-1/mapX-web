import note_icon from '../../assets/icons/note_icon.png'
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotes } from '../api/note';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import image_icon from '../../assets/icons/image_icon.png'
import hyperlink_icon from '../../assets/icons/hyperlink_icon.png'
import { fetchAllImages, fetchImageById } from '../api/image';
import { fetchAllHyperlinks } from '../api/hyperlink';
import { openHyperlink, openImages, openNotes } from '../../store/mapSlice';
function RightPanelData() {
    const { id: projectId } = useParams();
    const year = useSelector(state=>state.map.year);
    const dispatch = useDispatch();
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
    if (errorL){ return <p>No hyperlinks for current year</p>;}  
    
    function handleOpenHyperlink(hyperlink){
      console.log(hyperlink)
      dispatch(openHyperlink({id:hyperlink.hyperlinkId,hyperlinkUrl:hyperlink.hyperlink,title:hyperlink.hyperlinkTitle,coordinates:{lng:hyperlink.longitude,lat:hyperlink.latitude}}))
    }
    
    async function handleOpenImage(img){
      const res = await fetchImageById(img.imageFileId+"."+img.format);
      const imageUrl = res;
      dispatch(openImages({id:img.id,caption:img.caption,imageUrl,coordinates:{lat:img.latitude,lng:img.longitude}}))
    }

    function handleOpenNote(note){
      console.log(note);
      dispatch(openNotes({id:note.noteId,title:note.noteTitle,backgroundColor:note.backgroundColor,coordinates:{lat:note.latitude,lng:note.longitude},content:note.noteContent}))
    }
    return (
    
        <div className="max-h-[68dvh] overflow-y-auto overflow-x-visible">
  {notes.map((note) => (
    <div key={note.noteId} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2" onClick={()=>handleOpenNote(note)}>
      <img src={note_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
      <div className="flex-1 break-words whitespace-normal">
        <p>{note.noteTitle}</p>
        <p>{note.yearInTimeline.year}</p>
      </div>
    </div>
  ))}

  {imagesD.map((img) => (
    <div key={img.id} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2" onClick={()=>handleOpenImage(img)}>
      <img src={image_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
      <div className="flex-1 break-words whitespace-normal">
        <p>{img.caption}</p>
        <p>{img.yearInTimeline.year}</p>
      </div>
    </div>
  ))}

  {hyperlink.map((hyper) => (
    <div key={hyper.hyperlinkId} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2" onClick={()=>handleOpenHyperlink(hyper)}>
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