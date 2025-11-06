import note_icon from '../../assets/icons/note_icon.png';
import image_icon from '../../assets/icons/image_icon.png';
import hyperlink_icon from '../../assets/icons/hyperlink_icon.png';
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotesByProject } from '../api/note';
import { fetchAllImagesByProject,fetchImageById } from '../api/image';
import { fetchAllHyperlinksByProject } from '../api/hyperlink';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { openHyperlink, openImages, openNotes, setYear } from '../../store/mapSlice';
import { prefetchEmbed } from '../api/embed';
import { yearFromDbFormat } from '../../utils/era';

function RightPanelData() {
    const { id: projectId } = useParams();
    const year = useSelector(state => state.map.year);
    const dispatch = useDispatch();

    const { data: notes,error } = useQuery({
        queryKey: ["notesByProject", projectId],
        queryFn: () => fetchAllNotesByProject(projectId),
    });
    console.log(error);
    const { data: imagesD } = useQuery({
        queryKey: ["imagesByProject", projectId],
        queryFn: () => fetchAllImagesByProject(projectId),
    });

    const { data: hyperlinks } = useQuery({
        queryKey: ["hyperlinksByProject", projectId],
        queryFn: () => fetchAllHyperlinksByProject(projectId),
    });

    const combinedItems = [];
    if (Array.isArray(notes)) {
        for (const n of notes) combinedItems.push({ type: 'note', item: n, key: `note-${n.noteId}` });
    }

    if (Array.isArray(imagesD)) {
        for (const img of imagesD) combinedItems.push({ type: 'image', item: img, key: `img-${img.id}` });
    }

    if (Array.isArray(hyperlinks)) {
        for (const h of hyperlinks) combinedItems.push({ type: 'hyperlink', item: h, key: `link-${h.hyperlinkId}` });
    }

    // Sort items by proximity to selected year
    const toSignedYear = (yVal, eraVal) => {
        const converted = yearFromDbFormat(yVal, eraVal);
        return Number.isFinite(converted) ? converted : null;
    };

    const toDisplayLabel = (yVal, eraVal) => {
        if (yVal === null || typeof yVal === 'undefined') return 'Unknown';
        const era = (eraVal || 'CE').toUpperCase();
        if (era === 'MA') return `${yVal} Ma`;
        return `${yVal} ${era}`;
    };

    /// Commented out: Original proximity-based sorting
    /// const sortedByProximity = combinedItems.slice().sort((a, b) => {
    ///     const ay = toSignedYear(a.item?.yearInTimeline?.year, a.item?.yearInTimeline?.era);
    ///     const by = toSignedYear(b.item?.yearInTimeline?.year, b.item?.yearInTimeline?.era);
    ///     const ad = ay === null ? Number.POSITIVE_INFINITY : Math.abs(ay - year);
    ///     const bd = by === null ? Number.POSITIVE_INFINITY : Math.abs(by - year);
    ///     return ad - bd;
    /// });

    // NEW: Simple one-time sort by createdAt (assuming each item has 'createdAt' ISO timestamp, newest first)
    // If field name differs, replace 'createdAt' accordingly
    const sortedByCreation = combinedItems.slice().sort((a, b) => {
        const aDate = new Date(a.item.createdAt || 0); // Fallback to 0 if no timestamp
        const bDate = new Date(b.item.createdAt || 0);
        return bDate - aDate; // Descending (newer dates first)
    });

    const flyToIfPossible = (lat, lng) => {
        try {
            if (window.mapxFlyTo && Number.isFinite(lat) && Number.isFinite(lng)) {
                window.mapxFlyTo({ lng, lat });
            }
        } catch (_) {}
    };

    const setTimelineIfAvailable = (item) => {
        try {
            const y = toSignedYear(item?.yearInTimeline?.year, item?.yearInTimeline?.era);
            if (y !== null && Number.isFinite(y)) dispatch(setYear(y));
        } catch (_) {}
    };

    const handleOpenHyperlink = (h) => {
        // Fly and set year in background
        flyToIfPossible(h?.latitude, h?.longitude);
        setTimelineIfAvailable(h);
        dispatch(openHyperlink({
            id: h.hyperlinkId,
            hyperlinkUrl: h.hyperlink,
            hyperlink: h.hyperlinkTitle,
            coordinates: { lng: h.longitude, lat: h.latitude },
            mode: 'view'
        }));
    };

    const handleOpenImage = async (img) => {
        // Fly and set year in background (no need to wait for image fetch)
        flyToIfPossible(img?.latitude, img?.longitude);
        setTimelineIfAvailable(img);
        const imageUrl = await fetchImageById(img.imageFileId + "." + img.format);
        dispatch(openImages({
            id: img.id,
            caption: img.caption,
            imageUrl,
            coordinates: { lat: img.latitude, lng: img.longitude },
            mode: 'view'
        }));
    };

    const handleOpenNote = (note) => {
        // Fly and set year in background
        flyToIfPossible(note?.latitude, note?.longitude);
        setTimelineIfAvailable(note);
        dispatch(openNotes({
            id: note.noteId,
            title: note.noteTitle,
            backgroundColor: note.backgroundColor,
            coordinates: { lat: note.latitude, lng: note.longitude },
            content: note.noteContent
        }));
    };

    return (
        <div className="max-h-[68dvh] overflow-y-auto overflow-x-visible">
            {sortedByCreation.map(({ type, item, key }) => { // Changed to sortedByCreation
                const yi = item?.yearInTimeline || {};
                const yearLabel = toDisplayLabel(yi.year, yi.era);

                if (type === 'note') {
                    return (
                        <div key={key} className="flex gap-2 p-2 hover:bg-white/10 rounded-lg" onClick={() => handleOpenNote(item)}>
                            <img src={note_icon} className="w-[50px] h-[50px]" alt="" />
                            <div className="flex-1">
                                <p>{item.noteTitle}</p>
                                <p>{yearLabel}</p>
                            </div>
                        </div>
                    );
                }

                if (type === 'image') {
                    return (
                        <div key={key} className="flex gap-2 p-2 hover:bg-white/10 rounded-lg" onClick={() => handleOpenImage(item)}>
                            <img src={image_icon} className="w-[50px] h-[50px]" alt="" />
                            <div className="flex-1">
                                <p>{item.caption}</p>
                                <p>{yearLabel}</p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={key} className="flex gap-2 p-2 hover:bg-white/10 rounded-lg"
                        onMouseEnter={() => { try { prefetchEmbed(item.hyperlink); } catch (_) {} }}
                        onFocus={() => { try { prefetchEmbed(item.hyperlink); } catch (_) {} }}
                        onClick={() => handleOpenHyperlink(item)}>
                        <img src={hyperlink_icon} className="w-[50px] h-[50px]" alt="" />
                        <div className="flex-1">
                            <a href={item.hyperlink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-400 underline break-all">{item.hyperlink}</a>
                            <p>{yearLabel}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default RightPanelData;
