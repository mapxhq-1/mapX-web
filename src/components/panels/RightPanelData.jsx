import note_icon from '../../assets/icons/note_icon.png'
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotes } from '../api/note';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import image_icon from '../../assets/icons/image_icon.png'
import hyperlink_icon from '../../assets/icons/hyperlink_icon.png'
import { fetchAllImagesByProject, fetchImageById } from '../api/image';
import { fetchAllHyperlinks } from '../api/hyperlink';
import { openHyperlink, openImages, openNotes } from '../../store/mapSlice';
import { prefetchEmbed } from '../api/embed';
import { getEraForYear, getAbsoluteYear } from '../../utils/era';
function RightPanelData() {
    const { id: projectId } = useParams();
    const year = useSelector(state=>state.map.year);
    const dispatch = useDispatch();
    const {data:notes,isLoading,error} = useQuery({
        queryKey:["notes",projectId,year],
        queryFn: async ()=>{
            const currentYear = year;
            const closeYears = [];
            for(let o=0;o<=10;o++){
                const y1 = currentYear - o; const y2 = currentYear + o;
                if(y1!==0 && !closeYears.includes(y1)) closeYears.push(y1);
                if(y2!==0 && !closeYears.includes(y2)) closeYears.push(y2);
            }
            // Dynamic BCE sampling to cover full timeline efficiently (every 100 years)
            const bceSample = [];
            for(let y=-4500; y<0; y+=100){ bceSample.push(y); }
            const yearsToFetch = Array.from(new Set([...closeYears, ...bceSample]));

            const results = await Promise.allSettled(
                yearsToFetch.map(y => {
                    const era = getEraForYear(y);
                    const absYear = getAbsoluteYear(y);
                    return fetchAllNotes(projectId, absYear, era);
                })
            );
            const all = [];
            for(const r of results){
                if(r.status==='fulfilled' && Array.isArray(r.value)) all.push(...r.value);
            }
            const dedup = all.filter((n,idx,arr)=>idx===arr.findIndex(x=>x.noteId===n.noteId));
            return dedup;
        },
    })
    const {data:imagesD,isLoadingI,errorI} = useQuery({
        queryKey:["imagesByProject",projectId],
        queryFn: async ()=>{
            const all = await fetchAllImagesByProject(projectId);
            return Array.isArray(all) ? all : [];
        },
    })
    const {data:hyperlink,isLoadingL,errorL} = useQuery({
        queryKey:["hyperlink",projectId,year],
        queryFn: async ()=>{
            const currentYear = year;
            const closeYears = [];
            for(let o=0;o<=10;o++){
                const y1 = currentYear - o; const y2 = currentYear + o;
                if(y1!==0 && !closeYears.includes(y1)) closeYears.push(y1);
                if(y2!==0 && !closeYears.includes(y2)) closeYears.push(y2);
            }
            // Dynamic BCE sampling to cover full timeline efficiently (every 100 years)
            const bceSample = [];
            for(let y=-4500; y<0; y+=100){ bceSample.push(y); }
            const yearsToFetch = Array.from(new Set([...closeYears, ...bceSample]));

            const results = await Promise.allSettled(
                yearsToFetch.map(y => {
                    const era = getEraForYear(y);
                    const absYear = getAbsoluteYear(y);
                    return fetchAllHyperlinks(projectId, absYear, era);
                })
            );
            const all = [];
            for(const r of results){
                if(r.status==='fulfilled' && Array.isArray(r.value)) all.push(...r.value);
            }
            const dedup = all.filter((h,idx,arr)=>idx===arr.findIndex(x=>x.hyperlinkId===h.hyperlinkId));
            return dedup;
        },
    })
    const anyLoading = isLoading || isLoadingI || isLoadingL;
    if (anyLoading) return <p>Loading...</p>;

    // Build a single list across notes, images, hyperlinks and sort by proximity to current year
    const toSignedYear = (yVal, eraVal) => {
        const y = Number(yVal);
        if (!Number.isFinite(y)) return null;
        const era = (eraVal || 'CE').toUpperCase();
        return era === 'BCE' ? -Math.abs(y) : Math.abs(y);
    };

    const combinedItems = [];
    if (Array.isArray(notes)) {
        for (const n of notes) combinedItems.push({ type: 'note', item: n, key: `note-${n.noteId}` });
    }
    if (Array.isArray(imagesD)) {
        for (const img of imagesD) combinedItems.push({ type: 'image', item: img, key: `img-${img.id}` });
    }
    if (Array.isArray(hyperlink)) {
        for (const h of hyperlink) combinedItems.push({ type: 'hyperlink', item: h, key: `link-${h.hyperlinkId}` });
    }

    const sortedByProximity = combinedItems.slice().sort((a, b) => {
        const ay = toSignedYear(a.item?.yearInTimeline?.year, a.item?.yearInTimeline?.era);
        const by = toSignedYear(b.item?.yearInTimeline?.year, b.item?.yearInTimeline?.era);
        const ad = ay === null ? Number.POSITIVE_INFINITY : Math.abs(ay - year);
        const bd = by === null ? Number.POSITIVE_INFINITY : Math.abs(by - year);
        if (ad !== bd) return ad - bd;
        return 0; // stable sort keeps original relative order on ties
    });
    
    function handleOpenHyperlink(hyperlink){
      console.log(hyperlink)
      dispatch(openHyperlink({id:hyperlink.hyperlinkId,hyperlinkUrl:hyperlink.hyperlink,title:hyperlink.hyperlinkTitle,coordinates:{lng:hyperlink.longitude,lat:hyperlink.latitude},mode:'view'}))
    }
    
    async function handleOpenImage(img){
      const res = await fetchImageById(img.imageFileId+"."+img.format);
      const imageUrl = res;
      dispatch(openImages({id:img.id,caption:img.caption,imageUrl,coordinates:{lat:img.latitude,lng:img.longitude},mode:'view'}))
    }

    function handleOpenNote(note){
      console.log(note);
      dispatch(openNotes({id:note.noteId,title:note.noteTitle,backgroundColor:note.backgroundColor,coordinates:{lat:note.latitude,lng:note.longitude},content:note.noteContent}))
    }
    return (
    
        <div className="max-h-[68dvh] overflow-y-auto overflow-x-visible">
            {sortedByProximity.map(({ type, item, key }) => {
                const yi = item?.yearInTimeline || {};
                const yearLabel = `${yi.year} ${yi.era || 'CE'}`;
                if (type === 'note') {
                    return (
                        <div key={key} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2" onClick={() => handleOpenNote(item)}>
                            <img src={note_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
                            <div className="flex-1 break-words whitespace-normal">
                                <p>{item.noteTitle}</p>
                                <p>{yearLabel}</p>
                            </div>
                        </div>
                    );
                }
                if (type === 'image') {
                    return (
                        <div key={key} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2" onClick={() => handleOpenImage(item)}>
                            <img src={image_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
                            <div className="flex-1 break-words whitespace-normal">
                                <p>{item.caption}</p>
                                <p>{yearLabel}</p>
                            </div>
                        </div>
                    );
                }
                // hyperlink
                return (
                    <div key={key} className="flex flex-wrap items-start gap-2 w-full text-sm hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)] rounded-lg p-2"
                         onMouseEnter={() => { try { prefetchEmbed(item.hyperlink); } catch(_) {} }}
                         onFocus={() => { try { prefetchEmbed(item.hyperlink); } catch(_) {} }}
                         onClick={() => handleOpenHyperlink(item)}>
                        <img src={hyperlink_icon} className="w-[50px] h-[50px] flex-shrink-0" alt="" />
                        <div className="flex-1 break-words whitespace-normal">
                            <a href={item.hyperlink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-400 underline break-all">{item.hyperlink}</a>
                            <p>{yearLabel}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    
    )
}

export default RightPanelData;