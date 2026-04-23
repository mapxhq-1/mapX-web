import maplibregl from "maplibre-gl";
import { fetchAllNotes } from "../api/note";
import { getEraForYear, getAbsoluteYear } from "../../utils/era";
import { isMaEra } from "./maEraGuards";

import noteIconYellow from "../../assets/Notes/yellow.png"; 
import noteIconBlue from "../../assets/Notes/blue.png";
import noteIconWhite from "../../assets/Notes/white.png";
import noteIconRed from "../../assets/Notes/pink.png";
import noteIconGreen from "../../assets/Notes/green.png";
import noteIconPurple from "../../assets/Notes/purple.png";

const noteIcons = {
    "#FFE299": noteIconYellow,
    "#A8DAFF": noteIconBlue,
    "#ffffff": noteIconWhite,
    "#FFAFA3": noteIconRed,
    "#B3EFBD": noteIconGreen,
    "#D3BDFF": noteIconPurple,
};

export const createNoteManager = ({ map, dispatch, openNotesAction, yearRef, projectIdParam, reduxStore }) => {
    let active = false;
    let cursorEl = null;
    let onMove = null;
    let onClick = null;
    
    // --- CHANGE 1: Add a variable to store the selected color ---
    let activeColor = "#FFE299"; 

    const textMarkers = [];
    
    const NOTE_ICON_ZOOM = 5;     
    const NOTE_EXPAND_ZOOM = 6;   
    
    const colorGradients = {
        "#FFE299": "linear-gradient(135deg, #FFE571 0%, #FFCD2B 100%)",
        "#A8DAFF": "linear-gradient(135deg, #A8DAFF 0%, #D4EDFF 100%)",
        "#ffffff": "linear-gradient(135deg, #FFFFFF 0%, #D9D9D9 100%)",
        "#FFAFA3": "linear-gradient(135deg, #FFAFA3 0%, #FFD6CF 100%)",
        "#B3EFBD": "linear-gradient(135deg, #B3EFBD 0%, #D9F8E0 100%)",
        "#D3BDFF": "linear-gradient(135deg, #D3BDFF 0%, #E8DEFF 100%)",
    };
    
    const noteSvgInner = '<svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 512 512"><path fill="#ffd469" d="M450.812 462.658H74.759a8.8 8.8 0 0 1-8.802-8.802V77.802A8.8 8.8 0 0 1 74.759 69H290.76l168.854 168.854v216.001a8.8 8.8 0 0 1-8.802 8.803"/><path fill="#597b91" d="M242.863 168.403H126.007c-6.613 0-11.974-5.361-11.974-11.974s5.361-11.974 11.974-11.974h116.856c6.613 0 11.974 5.361 11.974 11.974s-5.361 11.974-11.974 11.974m11.974 66.401c0-6.613-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.361 11.974-11.974m0 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.362 11.974-11.974m101.165 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h218.021c6.613-.001 11.974-5.362 11.974-11.974m40.334-78.374c0-6.612-5.361-11.974-11.974-11.974h-80.668c-6.612 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h80.668c6.613-.001 11.974-5.362 11.974-11.974"/><path fill="#ffb636" d="m290.76 69l168.854 168.854H326.651c-19.822 0-35.891-16.069-35.891-35.891z"/></svg>';
    
    const stopEvt = (ev) => ev.stopPropagation();
    
    // ... [Rendering functions styleBaseBox, addFoldedCorner, renderMini, renderNote stay the same] ...
    const styleBaseBox = (box, foldSize, state) => {
        box.style.background = colorGradients[state.backgroundColor] || colorGradients["#FFE299"];
        box.style.boxShadow = "0 8px 20px rgba(0,0,0,0.18)";
        box.style.color = "#111827";
        box.style.fontSize = "13px";
        box.style.lineHeight = "1.35";
        box.style.borderRadius = "0";
        box.style.padding = "0px";
        box.style.backdropFilter = "blur(3px)";
        box.style.position = "relative";
        box.style.cursor = "pointer";
        box.style.userSelect = "text";
        box.style.overflow = "visible";
        const clip = `polygon(0 0, 100% 0, 100% calc(100% - ${foldSize}px), calc(100% - ${foldSize}px) 100%, 0 100%)`;
        box.style.clipPath = clip;
        box.style.webkitClipPath = clip;
    };
    const addFoldedCorner = (box, size, state) => {
        let fold = box.querySelector('.mx-note-fold');
        if (!fold) {
            fold = document.createElement('div');
            fold.className = 'mx-note-fold';
            fold.style.position = 'absolute';
            fold.style.right = '0';
            fold.style.bottom = '0';
            fold.style.width = '0';
            fold.style.height = '0';
            fold.style.borderLeft = `${size}px solid transparent`;
            fold.style.borderTop = `${size}px solid ${state.backgroundColor}`;
            fold.style.boxShadow = '-2px -2px 6px rgba(0,0,0,0.18)';
            fold.style.zIndex = '5';
            fold.style.pointerEvents = 'none';
            box.appendChild(fold);
        }
    };
    const renderMini = (rootEl, backgroundColor) => {
        rootEl.style.background = 'transparent';
        rootEl.style.border = 'none';
        rootEl.style.boxShadow = 'none';
        rootEl.style.padding = '0';
        rootEl.style.borderRadius = '0';
        rootEl.style.minWidth = '24px';
        rootEl.style.minHeight = '24px';
        rootEl.style.width = 'auto';
        rootEl.style.height = 'auto';
        rootEl.style.maxWidth = 'none';
        rootEl.style.maxHeight = 'none';
        
        const row = document.createElement('div');
        row.style.display = 'inline-flex';
        row.style.alignItems = 'center';
        row.style.gap = '4px';
        row.style.width = 'fit-content';
        row.style.height = 'fit-content';
        
        const img = document.createElement('img');
        img.src = noteIcons[backgroundColor] || noteIconDefault;
        
        img.alt = 'Note Icon';
        img.style.width = '24px';
        img.style.height = '24px';
        row.appendChild(img);
        rootEl.appendChild(row);
    };
    const renderNote = (state, expanded) => {
        const { rootEl } = state;
        rootEl.innerHTML = '';
        rootEl.style.background = 'transparent';
        rootEl.style.border = 'none';
        rootEl.style.boxShadow = 'none';
        rootEl.style.padding = '0';
        rootEl.style.borderRadius = '0';
        rootEl.style.minWidth = '0';
        rootEl.style.minHeight = '0';
        rootEl.style.maxWidth = 'none';
        rootEl.style.maxHeight = 'none';
        rootEl.style.width = 'auto';
        rootEl.style.height = 'auto';
        rootEl.style.clipPath = 'none';
        rootEl.style.webkitClipPath = 'none';
        rootEl.style.display = 'inline-block';
        rootEl.style.whiteSpace = 'nowrap';
        rootEl.style.pointerEvents = 'auto';
        rootEl.style.boxSizing = 'border-box';
        rootEl.style.margin = '0';
        rootEl.addEventListener('mousedown', (ev) => { ev.stopPropagation(); ev.preventDefault(); });
        rootEl.addEventListener('dblclick', stopEvt);
        rootEl.addEventListener('click', stopEvt);
        rootEl.addEventListener('wheel', stopEvt, { passive: true });
        const z = map.current.getZoom();
        if (z < NOTE_ICON_ZOOM) {
            renderMini(rootEl, state.backgroundColor);
            state.expanded = false;
            state.titleEl = null;
            state.bodyEl = null;
            return;
        }
        if (z >= NOTE_ICON_ZOOM && z < NOTE_EXPAND_ZOOM) {
            styleBaseBox(rootEl, 10, state);
            addFoldedCorner(rootEl, 10, state);
            rootEl.style.minWidth = '222px';
            rootEl.style.maxWidth = '222px';
            rootEl.style.minHeight = '37px';
            rootEl.style.maxHeight = '37px';
            rootEl.style.display = 'flex';
            rootEl.style.flexDirection = "column";
            rootEl.style.alignItems = 'center';
            const topBar = document.createElement('div');
            topBar.style.height = "5px";
            topBar.style.width = "100%";
            topBar.style.background = "#D9D9D9";
            topBar.style.opacity = "54%";
            topBar.style.marginBottom = "5px";
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.gap = '4px';
            header.style.marginBottom = '0';
            const titleSpan = document.createElement('span');
            titleSpan.textContent = (state.title && state.title.trim().length > 0) ? state.title : 'Note';
            titleSpan.style.marginLeft = '4px';
            titleSpan.style.fontSize = '12px';
            titleSpan.style.fontWeight = '600';
            titleSpan.style.whiteSpace = 'nowrap';
            titleSpan.style.overflow = 'hidden';
            titleSpan.style.textOverflow = 'ellipsis';
            header.appendChild(titleSpan);
            rootEl.appendChild(topBar);
            rootEl.appendChild(header);
            state.expanded = false;
            state.titleEl = null;
            state.bodyEl = null;
            return;
        }
        styleBaseBox(rootEl, 20, state);
        addFoldedCorner(rootEl, 25, state);
        rootEl.style.minWidth = '250px';
        rootEl.style.maxWidth = '250px';
        rootEl.style.minHeight = '250px';
        rootEl.style.maxHeight = '250px';
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '6px';
        const title = document.createElement('div');
        title.style.width = '100%';
        title.style.fontWeight = '700';
        title.style.fontSize = '14px';
        title.style.marginBottom = '6px';
        title.style.outline = 'none';
        title.style.whiteSpace = 'nowrap';
        title.style.overflow = 'hidden';
        title.style.textOverflow = 'ellipsis';
        title.style.background = "rgba(217, 217, 217, 0.60)";
        title.style.padding = "5px 10px";
        title.textContent = (state.title && state.title.trim().length > 0) ? state.title : 'Title';
        const body = document.createElement('div');
        body.style.outline = 'none';
        body.style.minHeight = '80px';
        body.style.whiteSpace = 'pre-wrap';
        body.style.wordBreak = 'break-word';
        body.style.padding = '5px';
        body.innerHTML = (state.body && state.body.trim().length > 0) ? state.body : '';
        header.appendChild(title);
        rootEl.appendChild(header);
        rootEl.appendChild(body);
        state.expanded = true;
        state.titleEl = title;
        state.bodyEl = body;
    };
    
const ensureCursorEl = () => {
        if (cursorEl) return cursorEl;
        
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.pointerEvents = "none";
        el.style.zIndex = "24";
        el.style.transform = "translate(-50%, -50%)";
        
        // Create an image element instead of setting innerHTML
        const img = document.createElement("img");
        img.className = "cursor-note-icon"; // Useful for targeting later
        img.style.width = "32px";
        img.style.height = "32px";
        
        // Initial source based on activeColor
        img.src = noteIcons[activeColor] || noteIcons["#FFE299"];
        
        el.appendChild(img);
        map.current.getContainer().appendChild(el);
        cursorEl = el;
        return el;
    };
    
    const createTextboxMarker = (lngLat, initialTitle = '', initialBody = '', noteId = null, backgroundColor = "#FFE299") => {
        const anchorContainer = document.createElement("div");
        anchorContainer.style.position = 'relative';
        anchorContainer.style.width = '1px';
        anchorContainer.style.height = '1px';
        anchorContainer.style.background = 'transparent';
        anchorContainer.style.pointerEvents = 'none';

        const root = document.createElement("div");
        root.className = 'mx-note-root';
        root.spellcheck = true;
        root.style.position = 'absolute';
        root.style.pointerEvents = 'auto';

        const positionContent = () => {
            setTimeout(() => {
                const rect = root.getBoundingClientRect();
                const width = rect.width || root.offsetWidth || 24;
                root.style.left = `${-width / 2}px`;
                root.style.bottom = '0px';
            }, 0);
        };

        anchorContainer.appendChild(root);

        const state = { 
            rootEl: root, 
            anchorEl: anchorContainer,
            title: initialTitle, 
            body: initialBody, 
            expanded: false, 
            titleEl: null, 
            bodyEl: null, 
            noteId,
            backgroundColor,
            positionContent
        };

        const expanded = (map.current.getZoom() >= NOTE_EXPAND_ZOOM);
        renderNote(state, expanded);
        positionContent();

        // --- FIX: Detect touch capabilities ---
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        const marker = new maplibregl.Marker({
            element: anchorContainer,
            // --- FIX: Only enable dragging if it is NOT a touch device ---
            draggable: !isTouch, 
            anchor: 'center',
            offset: [0, 0]
        })
        .setLngLat(lngLat)
        .addTo(map.current);

        state.marker = marker;
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try { 
                    marker.setLngLat(lngLat);
                    positionContent();
                } catch (_) {}
            });
        });

        root.addEventListener('click', (e) => {
            e.stopPropagation();
            dispatch(openNotesAction({
                id: noteId,
                title: initialTitle,
                content: initialBody,
                coordinates: lngLat,
                backgroundColor
            }));
        });

        marker.on('dragstart', () => {
            root.style.opacity = '0.7';
        });

        marker.on('drag', () => {
            // Optional: update UI during drag
        });

        marker.on('dragend', () => {
            root.style.opacity = '1';
            const newPos = marker.getLngLat();
            state.coordinates = {
                lng: newPos.lng,
                lat: newPos.lat
            };
        });

        const entry = { marker, state };
        textMarkers.push(entry);
        return entry;
    };
    
    const clearAllNotes = () => {
        while (textMarkers.length) {
            const entry = textMarkers.pop();
            try { entry.marker.remove(); } catch (_) {}
        }
    };
    
    const removeDraftNotes = () => {
        for (let i = textMarkers.length - 1; i >= 0; i--) {
            const entry = textMarkers[i];
            if (!entry || !entry.state || !entry.state.noteId) {
                try { entry.marker.remove(); } catch (_) {}
                textMarkers.splice(i, 1);
            }
        }
    };
    
    const syncNotesWithZoom = () => {
        textMarkers.forEach((entry) => {
            const { state } = entry;
            const prevWidth = state.rootEl.offsetWidth;
            const prevHeight = state.rootEl.offsetHeight;
            renderNote(state, false);
            const newWidth = state.rootEl.offsetWidth;
            const newHeight = state.rootEl.offsetHeight;
            if (state.positionContent && (prevWidth !== newWidth || prevHeight !== newHeight)) {
                state.rootEl.getBoundingClientRect();
                state.positionContent();
            }
            requestAnimationFrame(() => {
                const pos = entry.marker.getLngLat();
                entry.marker.setLngLat(pos);
            });
        });
    };
    
    // ========================================
    // Activation & Deactivation
    // ========================================
    
    /**
     * Activate note placement mode
     */
    // --- CHANGE 2: Accept color argument and update activeColor ---
    const activate = (color) => {
        if (color) {
            activeColor = color;
        }

        if (cursorEl) {
            const img = cursorEl.querySelector('img');
            if (img) {
                img.src = noteIcons[activeColor] || noteIcons["#FFE299"];
            }
        }
        if (active) return;
        active = true;
        const el = ensureCursorEl();
        el.style.display = "block";
        
        onMove = (e) => {
            if (!cursorEl) return;
            cursorEl.style.left = `${e.point.x}px`;
            cursorEl.style.top = `${e.point.y}px`;
        };
        
        onClick = (e) => {
            // Open modal for creating new note
            // console.log({activeColor})
            dispatch(openNotesAction({
                id: `new`,
                title: '',
                content: '',
                coordinates: {
                    lng: e.lngLat.lng,
                    lat: e.lngLat.lat
                },
                // --- CHANGE 3: Pass activeColor to the new note ---
                backgroundColor: activeColor
            }));
            
            // Switch back to select mode after initiating creation
            deactivate();
            try { 
                window.mapxDrawSetMode && window.mapxDrawSetMode('select'); 
            } catch (_) {}
        };
        
        map.current.getCanvas().style.cursor = "none";
        map.current.on("mousemove", onMove);
        map.current.on("click", onClick);
    };
    
    /**
     * Deactivate note placement mode
     */
    const deactivate = () => {
        if (!active) return;
        active = false;
        map.current.getCanvas().style.cursor = "";
        try { map.current.off("mousemove", onMove); } catch (_) {}
        try { map.current.off("click", onClick); } catch (_) {}
        onMove = null; 
        onClick = null;
        if (cursorEl) { cursorEl.style.display = "none"; }
    };
    
    // ... [Rest of the file: Data Loading, Initialization, Return statement stay exactly the same] ...
    
    let lastLoaded = { projectId: null, year: null, era: null };
    let loading = false;
    const loadByContext = async (opts) => {
        try {
            const projectId = projectIdParam || null;
            const latestYearFromStore = (reduxStore && reduxStore.getState && reduxStore.getState().map?.year);
            const yearValRaw = (opts && typeof opts.year !== 'undefined') ? opts.year : (latestYearFromStore ?? yearRef.current);
            const yearVal = Number(yearValRaw);
            const eraVal = (opts && opts.era) || getEraForYear(yearVal);
            const absYear = getAbsoluteYear(yearVal);
            if (isMaEra(eraVal)) {
                clearAllNotes();
                lastLoaded = { projectId, year: null, era: 'MA' };
                return;
            }
            if (projectId && (yearVal !== undefined)) {
                if (loading) return;
                loading = true;
                try {
                    clearAllNotes();
                    const response = await fetchAllNotes(projectId, absYear, eraVal);
                    const notes = response?.note || response || [];
                    if (Array.isArray(notes)) {
                        notes.forEach((n) => {
                            if (!n) return;
                            const lng = Number(n.longitude);
                            const lat = Number(n.latitude);
                            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
                            const title = n.noteTitle;
                            const body = n.noteContent;
                            createTextboxMarker({ lng, lat }, title, body, n.noteId, n.backgroundColor);
                        });
                        lastLoaded = { projectId, year: absYear, era: eraVal };
                    }
                } catch (err) {
                    
                } finally {
                    loading = false;
                }
            }
        } catch (_) { /* ignore */ }
    };
    try { 
        map.current.on('zoom', syncNotesWithZoom); 
    } catch (_) {}
    try { 
        window.mapxNotesLoadByContext = loadByContext;
        window.mapxNotesRemoveDraftMarkers = removeDraftNotes;
    } catch (_) {}
    loadByContext({ year: yearRef.current });
    return { 
        activate, 
        deactivate,
        clearAllNotes,
        removeDraftNotes,
        loadByContext,
        createTextboxMarker
    };
};