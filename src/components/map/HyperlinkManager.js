import { fetchAllHyperlinks } from "../api/hyperlink";
import maplibregl from "maplibre-gl";
import { useDispatch } from "react-redux";
import { openHyperlink } from '../../store/mapSlice';
import hyperlink_icon from '../../assets/icons/hyperlink_icon.png'
import { resolveEmbedHtml, normalizeUrl, prefetchEmbed } from "../api/embed";
export const hyperlinkManager = (mapRef,dispatch) => {
    const map = mapRef;
    let active = false;
    let cursorEl = null;
    let onMove = null;
    let onClick = null;
    const hyperlinkMarkers = [];
    const HYPERLINK_EXPAND_ZOOM = 6; // full iframe display
    const HYPERLINK_ICON_ZOOM = 4;    // small icon
    const stopEvt = (ev) => ev.stopPropagation();

    // Edit icon SVG
    const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    // Visit/External link icon SVG
    const visitIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 3H21V9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 14L21 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const getModeForZoom = (z) => {
        if (z < HYPERLINK_ICON_ZOOM) return 'mini';
        if (z < HYPERLINK_EXPAND_ZOOM) return 'thumb';
        return 'full';
    };

    const applyModeStyles = (contentEl, mode) => {
        contentEl.style.background = 'transparent';
        contentEl.style.borderRadius = '4px';
        contentEl.style.overflow = 'hidden';
        contentEl.style.cursor = 'pointer';
        contentEl.style.display = 'block';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.boxSizing = 'border-box';
        contentEl.style.margin = '0';
        contentEl.style.position = 'absolute';
        contentEl.style.bottom = '8px'; // Position above the anchor point
        contentEl.style.left = '50%';
        contentEl.style.transform = 'translateX(-50%)';
        contentEl.style.transition = 'width 160ms ease, height 160ms ease, box-shadow 160ms ease, border-color 160ms ease';

        let size = 24, boxShadow = 'none', border = 'none';
        if (mode === 'thumb') {
            size = 100;
            boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            border = '1px solid #ddd';
        } else if (mode === 'full') {
            size = 300;
            boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
            border = '2px solid #4A90E2';
        }

        const s = `${size}px`;
        contentEl.style.width = (mode === 'full') ? '400px' : (mode === 'thumb') ? '200px' : s;
        contentEl.style.height = (mode === 'full') ? '350px' : s;
        contentEl.style.minWidth = (mode === 'full') ? '400px' : (mode === 'thumb') ? '200px' : s;
        contentEl.style.maxWidth = (mode === 'full') ? '400px' : (mode === 'thumb') ? '200px' : s;
        contentEl.style.minHeight = (mode === 'full') ? '350px' : s;
        contentEl.style.maxHeight = (mode === 'full') ? '350px' : s;
        contentEl.style.boxShadow = boxShadow;
        contentEl.style.border = border;
    };

    const renderHyperlink = (state, force = false) => {
        const { contentEl } = state;

        // Initialize once
        if (!state.initialized) {
            // Create container for content
            const contentContainer = document.createElement('div');
            contentContainer.style.cssText = `
                width: 100%;
                height: 100%;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Create icon element for mini mode
            const iconEl = document.createElement('img');
            iconEl.src = hyperlink_icon;
            iconEl.alt = 'Link';
            iconEl.style.cssText = `
                width: 24px;
                height: 24px;
                display: none;
            `;

            // Create iframe for larger modes (fallback)
            const iframeEl = document.createElement('iframe');
            iframeEl.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                display: none;
            `;
            // Keep scripts but avoid combining with same-origin to prevent escape warning
            iframeEl.setAttribute('sandbox', 'allow-scripts');
            iframeEl.setAttribute('loading', 'lazy');
            iframeEl.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');

            // Create embed wrapper (preferred when available via Iframely)
            const embedWrapperEl = document.createElement('div');
            embedWrapperEl.style.cssText = `
                width: 100%;
                height: 100%;
                display: none;
                border: none;
            `;

            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                position: absolute;
                top: 4px;
                right: 4px;
                display: none;
                gap: 4px;
                z-index: 10;
            `;

            // Create edit button
            const editBtn = document.createElement('button');
            editBtn.innerHTML = editIcon;
            editBtn.title = 'Edit Link';
            editBtn.style.cssText = `
                width: 28px;
                height: 28px;
                border-radius: 4px;
                background: rgba(74, 144, 226, 0.9);
                border: 1px solid white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;

            // Add hover effects
            editBtn.addEventListener('mouseenter', () => {
                editBtn.style.background = 'rgba(74, 144, 226, 1)';
                editBtn.style.transform = 'scale(1.1)';
            });
            editBtn.addEventListener('mouseleave', () => {
                editBtn.style.background = 'rgba(74, 144, 226, 0.9)';
                editBtn.style.transform = 'scale(1)';
            });

            // Create visit button
            const visitBtn = document.createElement('button');
            visitBtn.innerHTML = visitIcon;
            visitBtn.title = 'Open in New Tab';
            visitBtn.style.cssText = `
                width: 28px;
                height: 28px;
                border-radius: 4px;
                background: rgba(76, 175, 80, 0.9);
                border: 1px solid white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;

            // Add hover effects
            visitBtn.addEventListener('mouseenter', () => {
                if (state.hyperlinkUrl) {
                    visitBtn.style.background = 'rgba(76, 175, 80, 1)';
                    visitBtn.style.transform = 'scale(1.1)';
                }
            });
            visitBtn.addEventListener('mouseleave', () => {
                visitBtn.style.background = 'rgba(76, 175, 80, 0.9)';
                visitBtn.style.transform = 'scale(1)';
            });

            buttonContainer.appendChild(editBtn);
            buttonContainer.appendChild(visitBtn);

            // Create title display (shown when zoomed)
            const titleEl = document.createElement('div');
            titleEl.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                background: rgba(0,0,0,0.7);
                color: white;
                font-size: 12px;
                padding: 4px 6px;
                box-sizing: border-box;
                text-align: center;
                border-radius: 0 0 4px 4px;
                display: none;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;

            // Create link URL display
            const linkEl = document.createElement('div');
            linkEl.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                background: rgba(74, 144, 226, 0.9);
                color: white;
                font-size: 10px;
                padding: 2px 4px;
                box-sizing: border-box;
                text-align: center;
                border-radius: 4px 4px 0 0;
                display: none;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-family: monospace;
            `;

            // Create loading indicator
            const loadingEl = document.createElement('div');
            loadingEl.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #4A90E2;
                font-size: 12px;
                display: none;
            `;
            loadingEl.innerText = 'Loading...';

            contentContainer.appendChild(iconEl);
            contentContainer.appendChild(embedWrapperEl);
            contentContainer.appendChild(iframeEl);
            contentContainer.appendChild(loadingEl);
            contentEl.appendChild(contentContainer);
            contentEl.appendChild(buttonContainer);
            contentEl.appendChild(titleEl);
            contentEl.appendChild(linkEl);

            state.iconEl = iconEl;
            state.iframeEl = iframeEl;
            state.titleEl = titleEl;
            state.linkEl = linkEl;
            state.loadingEl = loadingEl;
            state.buttonContainer = buttonContainer;
            state.editBtn = editBtn;
            state.visitBtn = visitBtn;
            state.contentContainer = contentContainer;
            state.embedWrapperEl = embedWrapperEl;
            state.embedResolved = false;
            state.embedLoading = false;
            state.embedHtml = '';
            state.initialized = true;

            // Add click handlers for buttons
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lngLat = state.marker.getLngLat();
                const coord = { lng: lngLat.lng, lat: lngLat.lat };
                dispatch(openHyperlink({
                    id: state.hyperlinkId,
                    hyperlinkUrl: state.hyperlinkUrl,
                    title: state.title,
                    coordinates: coord,
                    mode: 'edit'
                }));
            });

            visitBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (state.hyperlinkUrl) {
                    let url = state.hyperlinkUrl;
                    if (!url.match(/^https?:\/\//i)) {
                        url = 'https://' + url;
                    }
                    console.log('Opening URL:', url);
                    window.open(url, '_blank');
                }
            });
        }

        // Update title text if it changed
        if (state.titleEl && state.title) {
            state.titleEl.innerText = state.title;
        }

        // Update link text if it changed
        if (state.linkEl && state.hyperlinkUrl) {
            state.linkEl.innerText = state.hyperlinkUrl;
        }

        const z = map.current.getZoom();
        const nextMode = getModeForZoom(z);

        if (!force && state.mode === nextMode) return;

        state.mode = nextMode;
        state.expanded = (nextMode === 'full');
        applyModeStyles(contentEl, nextMode);

        // Helper: attempt to resolve rich embed via Iframely once
        const tryResolveEmbed = async () => {
            if (!state.hyperlinkUrl || state.embedResolved || state.embedLoading) return;
            state.embedLoading = true;
            state.loadingEl.style.display = 'block';
            try {
                const html = await resolveEmbedHtml(state.hyperlinkUrl);
                if (html && typeof html === 'string') {
                    state.embedHtml = html;
                }
            } catch (_) {
                // ignore
            } finally {
                state.embedResolved = true;
                state.embedLoading = false;
            }
        };

        // Update content based on mode
        if (nextMode === 'mini') {
            // Show icon only
            state.iconEl.style.display = 'block';
            state.iframeEl.style.display = 'none';
            if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            state.titleEl.style.display = 'none';
            state.linkEl.style.display = 'none';
            state.loadingEl.style.display = 'none';
            state.buttonContainer.style.display = 'none';
        } else if (nextMode === 'thumb') {
            // Show iframe with title and buttons
            state.iconEl.style.display = 'none';
            state.buttonContainer.style.display = 'flex';

            // Resolve embed once, then display either rich embed or fallback iframe
            tryResolveEmbed();
            if (!state.hyperlinkUrl) {
                state.loadingEl.style.display = 'block';
                state.loadingEl.innerText = 'No URL';
                state.iframeEl.style.display = 'none';
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            } else if (state.embedResolved && state.embedHtml) {
                state.loadingEl.style.display = 'none';
                if (state.embedWrapperEl) {
                    state.embedWrapperEl.style.display = 'block';
                    if (!state.embedWrapperEl.firstChild) {
                        state.embedWrapperEl.innerHTML = state.embedHtml;
                    }
                }
                state.iframeEl.style.display = 'none';
            } else if (state.embedResolved && !state.embedHtml && !state.iframeLoaded) {
                state.loadingEl.style.display = 'block';
                state.iframeEl.src = normalizeUrl(state.hyperlinkUrl);
                state.iframeLoaded = true;
                state.iframeEl.onload = () => {
                    state.loadingEl.style.display = 'none';
                    state.iframeEl.style.display = 'block';
                };
                state.iframeEl.onerror = () => {
                    state.loadingEl.innerText = 'Failed to load';
                };
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            } else if (state.iframeLoaded) {
                state.loadingEl.style.display = 'none';
                state.iframeEl.style.display = 'block';
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            } else {
                // Still resolving embed
                state.loadingEl.style.display = 'block';
                state.iframeEl.style.display = 'none';
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            }

            // Show title if available
            state.titleEl.style.display = state.title ? 'block' : 'none';
            state.linkEl.style.display = 'none';

            // Disable visit button if no URL
            state.visitBtn.style.opacity = state.hyperlinkUrl ? '1' : '0.5';
            state.visitBtn.style.pointerEvents = state.hyperlinkUrl ? 'auto' : 'none';
            state.visitBtn.style.cursor = state.hyperlinkUrl ? 'pointer' : 'not-allowed';
        } else if (nextMode === 'full') {
            // Show full iframe with title, URL and buttons
            state.iconEl.style.display = 'none';
            state.buttonContainer.style.display = 'flex';

            // Resolve embed once, then display either rich embed or fallback iframe
            tryResolveEmbed();
            if (!state.hyperlinkUrl) {
                state.loadingEl.style.display = 'block';
                state.loadingEl.innerText = 'No URL';
                state.iframeEl.style.display = 'none';
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            } else if (state.embedResolved && state.embedHtml) {
                state.loadingEl.style.display = 'none';
                if (state.embedWrapperEl) {
                    state.embedWrapperEl.style.display = 'block';
                    if (!state.embedWrapperEl.firstChild) {
                        state.embedWrapperEl.innerHTML = state.embedHtml;
                    }
                }
                state.iframeEl.style.display = 'none';
            } else if (state.embedResolved && !state.embedHtml && !state.iframeLoaded) {
                state.loadingEl.style.display = 'block';
                state.iframeEl.src = normalizeUrl(state.hyperlinkUrl);
                state.iframeLoaded = true;
                state.iframeEl.onload = () => {
                    state.loadingEl.style.display = 'none';
                    state.iframeEl.style.display = 'block';
                };
                state.iframeEl.onerror = () => {
                    state.loadingEl.innerText = 'Failed to load';
                };
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            } else if (state.iframeLoaded) {
                state.loadingEl.style.display = 'none';
                state.iframeEl.style.display = 'block';
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            } else {
                // Still resolving embed
                state.loadingEl.style.display = 'block';
                state.iframeEl.style.display = 'none';
                if (state.embedWrapperEl) state.embedWrapperEl.style.display = 'none';
            }

            // Show both title and URL in full mode
            state.titleEl.style.display = state.title ? 'block' : 'none';
            state.linkEl.style.display = state.hyperlinkUrl ? 'block' : 'none';

            // Disable visit button if no URL
            state.visitBtn.style.opacity = state.hyperlinkUrl ? '1' : '0.5';
            state.visitBtn.style.pointerEvents = state.hyperlinkUrl ? 'auto' : 'none';
            state.visitBtn.style.cursor = state.hyperlinkUrl ? 'pointer' : 'not-allowed';
        }
    };

   const ensureCursorEl = () => {
    if (cursorEl) return cursorEl;

    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.zIndex = "24";
    el.style.transform = "translate(-50%, -50%)";
    el.style.fontSize = "18px";
    el.style.lineHeight = "1";
    
    const img = document.createElement("img");
    img.src = hyperlink_icon;
    img.style.width = "30px";     // adjust size
    img.style.height = "30px";    // adjust size
    img.style.objectFit = "contain";
    img.draggable = false;        // prevent drag behavior

    el.appendChild(img);

    map.current.getContainer().appendChild(el);
    cursorEl = el;
    return el;
    };


    const createHyperlinkMarker = (lngLat, hyperlinkUrl = '', hyperlinkId = null, title = '') => {
        // Create the stable anchor container (fixed size, never changes)
        const anchorContainer = document.createElement("div");
        anchorContainer.className = 'mx-hyperlink-root';
        anchorContainer.style.cssText = `
            width: 1px;
            height: 1px;
            position: relative;
            pointer-events: none;
        `;

        // Create the content element that will grow/shrink
        const contentEl = document.createElement("div");
        contentEl.style.pointerEvents = 'auto';

        // Create a small visual anchor point at the bottom
        const anchorDot = document.createElement("div");
        anchorDot.style.cssText = `
            width: 8px;
            height: 8px;
            background: #4A90E2;
            border: 2px solid white;
            border-radius: 50%;
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1;
        `;

        anchorContainer.appendChild(contentEl);
        anchorContainer.appendChild(anchorDot);

        const state = {
            rootEl: anchorContainer,
            contentEl: contentEl,
            hyperlinkUrl: hyperlinkUrl || '',
            title: title || '',
            expanded: false,
            hyperlinkId,
            initialized: false,
            mode: null,
            iframeLoaded: false
        };

        // Pre-render the content
        renderHyperlink(state, true);

        const marker = new maplibregl.Marker({
            element: anchorContainer,
            draggable: false,
            anchor: 'bottom',
            offset: [0, 0]
        })
            .setLngLat(lngLat)
            .addTo(map.current);

        state.marker = marker;

        // Content click handler
        contentEl.addEventListener('click', (e) => {
            // Check if click is on a button
            if (e.target.closest('button')) {
                return;
            }
            e.stopPropagation();

            // In mini mode, open the edit dialog
            if (state.mode === 'mini') {
                dispatch(openHyperlink({
                    id: hyperlinkId,
                    hyperlinkUrl,
                    title,
                    coordinates: lngLat
                }));
            }
        });

        // Prefetch embed (reduces first-view latency, esp. Wikipedia)
        try { prefetchEmbed(hyperlinkUrl); } catch(_) {}

        const entry = { marker, state };
        hyperlinkMarkers.push(entry);
        return entry;
    };

    const updateHyperlinkMarker = (hyperlinkId, newUrl, newTitle) => {
        const entry = hyperlinkMarkers.find(e => e.state.hyperlinkId === hyperlinkId);
        if (entry) {
            entry.state.hyperlinkUrl = newUrl;
            entry.state.title = newTitle;
            entry.state.iframeLoaded = false;
            renderHyperlink(entry.state, true);
        }
    };

    const clearAllHyperlinks = () => {
        const markerElements = document.querySelectorAll('.mx-hyperlink-root');

        markerElements.forEach((el) => {
            const markerContainer = el.closest('.maplibregl-marker');
            if (markerContainer && markerContainer.parentNode) {
                markerContainer.parentNode.removeChild(markerContainer);
            }
        });

        hyperlinkMarkers.length = 0;
    };

    // Remove any hyperlink markers that have not been saved (no hyperlinkId)
    const removeDraftHyperlinks = () => {
        for (let i = hyperlinkMarkers.length - 1; i >= 0; i--) {
            const entry = hyperlinkMarkers[i];
            if (!entry || !entry.state || !entry.state.hyperlinkId) {
                try { entry.marker.remove(); } catch (_) {}
                hyperlinkMarkers.splice(i, 1);
            }
        }
    };

    const syncHyperlinksWithZoom = () => {
        hyperlinkMarkers.forEach((entry) => {
            renderHyperlink(entry.state, false);
        });
    };

    const activate = () => {
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
            // Only open modal; do not place any marker until saved
            dispatch(openHyperlink({
                id: "new",
                coordinates: {
                    lng: e.lngLat.lng,
                    lat: e.lngLat.lat
                },
                mode: 'edit'
            }));

            deactivate();
            try { window.mapxDrawSetMode && window.mapxDrawSetMode('select'); } catch (_) { }
        };

        map.current.getCanvas().style.cursor = "none";
        map.current.on("mousemove", onMove);
        map.current.on("click", onClick);
    };

    const deactivate = () => {
        if (!active) return;
        active = false;
        map.current.getCanvas().style.cursor = "";
        try { map.current.off("mousemove", onMove); } catch (_) { }
        try { map.current.off("click", onClick); } catch (_) { }
        onMove = null; onClick = null;
        if (cursorEl) { cursorEl.style.display = "none"; }
    };

    const setupZoomListeners = () => {
        if (map && map.current) {
            map.current.on('zoom', syncHyperlinksWithZoom);
            map.current.on('zoomend', syncHyperlinksWithZoom);
            return true;
        }
        return false;
    };

    const listenersSetup = setupZoomListeners();

    if (!listenersSetup) {
        setTimeout(setupZoomListeners, 100);
    }

    const loadFromUrl = async (url) => {
        try {
            const r = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!r.ok) return false;
            const items = await r.json();
            if (!Array.isArray(items)) return false;
            items.forEach((it) => {
                if (!it) return;
                const lng = Number(it.lng);
                const lat = Number(it.lat);
                if (Number.isFinite(lng) && Number.isFinite(lat)) {
                    createHyperlinkMarker(
                        { lng, lat },
                        String(it.hyperlinkUrl || ''),
                        String(it.hyperlinkId || ''),
                        String(it.title || '')
                    );
                }
            });
            return true;
        } catch (_) {
            return false;
        }
    };

    try { window.mapxHyperlinksLoadFromUrl = loadFromUrl; } catch (_) { }

    let lastLoaded = { projectId: null, year: null, era: null };
    let loading = false;

    const loadHyperlinksByContext = async (opts) => {
        try {
            const projectId = opts.projectIdParam;
            const eraVal = opts.era;
            const yearVal = opts.year;

            if (projectId && (yearVal !== undefined)) {
                if (loading) return;
                loading = true;
                try {
                    clearAllHyperlinks();
                    const response = await fetchAllHyperlinks(projectId, yearVal, eraVal);
                    const hyperlinks = response || [];
                    if (Array.isArray(hyperlinks)) {
                        hyperlinks.forEach(async (link) => {
                            if (!link) return;
                            const lng = Number(link.longitude);
                            const lat = Number(link.latitude);
                            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
                            createHyperlinkMarker(
                                { lng, lat },
                                link.hyperlink,
                                link.hyperlinkId,
                                link.hyperlinkTitle
                            );
                        });
                        lastLoaded = { projectId, year: yearVal, era: eraVal };
                    }
                } finally {
                    loading = false;
                }
            }
        } catch (_) { /* ignore */ }
    };

    // Expose standardized loader name (capital L) used across app
    try { window.mapxHyperlinksLoadByContext = loadHyperlinksByContext; } catch (_) { }
    // Backward compatibility (lowercase l)
    try { window.mapxHyperlinksloadHyperlinksByContext = loadHyperlinksByContext; } catch (_) { }
    try { window.mapxHyperlinksRemoveDraftMarkers = removeDraftHyperlinks; } catch (_) { }

    return {
        activate,
        deactivate,
        createHyperlinkMarker,
        clearAllHyperlinks,
        loadHyperlinksByContext,
        updateHyperlinkMarker
    };
};