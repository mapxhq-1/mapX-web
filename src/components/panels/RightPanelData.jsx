import React from 'react';
import note_icon from '../../assets/icons/note_icon.png';
import image_icon from '../../assets/icons/image_icon.png';
import hyperlink_icon from '../../assets/icons/hyperlink_icon.png';
import { useQuery } from "@tanstack/react-query";
import { fetchAllNotesByProject } from '../api/note';
import { fetchAllImagesByProject, fetchImageById } from '../api/image';
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

    const { data: notes, error } = useQuery({
        queryKey: ["notesByProject", projectId],
        queryFn: () => fetchAllNotesByProject(projectId),
    });
    
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

    const sortedByCreation = combinedItems.slice().sort((a, b) => {
        const aDate = new Date(a.item.createdAt || 0); 
        const bDate = new Date(b.item.createdAt || 0);
        return bDate - aDate; 
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

    // --- Styles ---
    const rowStyles = "group flex rounded-xl items-center gap-4 p-5 mb-2 border border-white/5 bg-white/5 shadow-sm hover:bg-white/10 transition-all duration-200 cursor-pointer";
    const iconStyles = "w-8 h-8 object-contain shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"; 
    const titleStyles = "text-md font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-1 min-h-[1.75rem]";
    
    const renderTitle = (text, fallback) => {
        if (!text || text.trim() === '') {
            return <span className="text-zinc-600 italic font-normal">{fallback}</span>;
        }
        return text;
    };

    const metaStyles = "text-sm text-zinc-500 mt-0.5";

    return (
        <>
            {/* Custom CSS for the White Scrollbar */}
            <style>{`
                .cool-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .cool-scrollbar::-webkit-scrollbar-track {
                    background: transparent; 
                }
                .cool-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.3);
                    border-radius: 20px;
                }
                .cool-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255, 255, 255, 0.8);
                }
                /* Firefox fallback */
                .cool-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
                }
            `}</style>

            <div className="max-h-[68dvh] overflow-y-auto overflow-x-hidden pr-2 cool-scrollbar">
                {sortedByCreation.map(({ type, item, key }) => { 
                    const yi = item?.yearInTimeline || {};
                    const yearLabel = toDisplayLabel(yi.year, yi.era);

                    if (type === 'note') {
                        return (
                            <div key={key} className={rowStyles} onClick={() => handleOpenNote(item)}>
                                <img src={note_icon} className={iconStyles} alt="note" />
                                <div className="flex-1 min-w-0">
                                    <p className={titleStyles}>
                                        {renderTitle(item.noteTitle, "Untitled Note")}
                                    </p>
                                    <p className={metaStyles}>{yearLabel}</p>
                                </div>
                            </div>
                        );
                    }

                    if (type === 'image') {
                        return (
                            <div key={key} className={rowStyles} onClick={() => handleOpenImage(item)}>
                                <img src={image_icon} className={iconStyles} alt="image" />
                                <div className="flex-1 min-w-0">
                                    <p className={titleStyles}>
                                        {renderTitle(item.caption, "Untitled Image")}
                                    </p>
                                    <p className={metaStyles}>{yearLabel}</p>
                                </div>
                            </div>
                        );
                    }

                    if (type === 'hyperlink') {
                        return (
                            <div key={key} className={rowStyles}
                                onMouseEnter={() => { try { prefetchEmbed(item.hyperlink); } catch (_) {} }}
                                onFocus={() => { try { prefetchEmbed(item.hyperlink); } catch (_) {} }}
                                onClick={() => handleOpenHyperlink(item)}>
                                <img src={hyperlink_icon} className={iconStyles} alt="link" />
                                <div className="flex-1 min-w-0">
                                    <p className={`${titleStyles} text-blue-300`}>
                                        {item.hyperlinkTitle || item.hyperlink}
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className={metaStyles}>{yearLabel}</p>
                                        <a 
                                            href={item.hyperlink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            onClick={e => e.stopPropagation()} 
                                            className="text-xs text-zinc-600 hover:text-blue-400 truncate max-w-[150px]"
                                        >
                                            {item.hyperlink}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </>
    );
}

export default RightPanelData;