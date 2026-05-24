import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom"; // <-- Added import for navigation
import { logger } from "../map/utils/activityLogger";

// Redux Actions
import { 
    addLayerMetadata, 
    updateLayerData, 
    toggleLayerVisibility,
    resetAllVisibility,
    setLayerPlaying,
    triggerLayerRestart
} from "../../store/layerSlice"; 

// API Functions - Removed fetchLayerFiles
import { getAllLayers, searchGeoLayers } from "../api/geoJson"; 
import { getLayerLikes, toggleLayerLike } from "../api/layers"; 

const LAYER_IMAGES = {
    // Layer Types
    "World Rivers": "/Layer images/world riviers/main world river.jpg",
    "Trade Routes": "/Layer images/Trade Route/main trade route image.jpg",
    "Indian Rivers": "/Layer images/Indian rivers/main indian river.jpg",
    "Explorer Route": "/Layer images/Explorer Route/main explorere route photo.jpg",

    "Columbus Voyage - 1": "/Layer images/Explorer Route/Christopher_Columbus.jpg",
    "Columbus Voyage-2": "/Layer images/Explorer Route/Christopher_Columbus.jpg",
    "Columbus Voyage-3": "/Layer images/Explorer Route/Christopher_Columbus.jpg",
    "Columbus Voyage-4": "/Layer images/Explorer Route/Christopher_Columbus.jpg",

    "Fa Hein Route": "/Layer images/Explorer Route/Fa-hsien.jpg",
    "Hiuen Tsang Route": "/Layer images/Explorer Route/Hiuen Tsang.jpg",
    "Marco Polo Route": "/Layer images/Explorer Route/Marco-Polo.jpg",
    "Shackleton Route": "/Layer images/Explorer Route/ernest-shackleton.jpg",

    "Vasco Da Gama Voyage -1": "/Layer images/Explorer Route/vasco da gama 1,2,3.png",
    "Vasco Da Gama Voyage-2": "/Layer images/Explorer Route/vasco da gama 1,2,3.png",
    "Vasco Da Gama Voyage -3": "/Layer images/Explorer Route/vasco da gama 1,2,3.png",

    "Ibn Battuta Voyage -1": "/Layer images/Explorer Route/Ibn Battuta.jpg",
    "Ibn Battuta Voyage -2": "/Layer images/Explorer Route/Ibn Battuta.jpg",
    "Ibn Battuta Voyage -3": "/Layer images/Explorer Route/Ibn Battuta.jpg",
    "Ibn Battuta Voyage -4": "/Layer images/Explorer Route/Ibn Battuta.jpg",

    // World Rivers
    "Amezon River": "/Layer images/world riviers/Amazon_River.jpg",
    "congo river": "/Layer images/world riviers/congo river.jpg",
    "Mississippi River": "/Layer images/world riviers/mississippi rivier.jpg",
    "Nile River": "/Layer images/world riviers/Nile-River-Egypt.jpg",
    "OB River": "/Layer images/world riviers/ob river.jpg",
    "Paraná River": "/Layer images/world riviers/parana river.jpg",
    "Yangtze River": "/Layer images/world riviers/yantze-river.jpg",
    "Yellow River": "/Layer images/world riviers/yellow river.jpg",

    // Trade Routes
    "Grand_Trunk_Road": "/Layer images/Trade Route/Grand Trunk Road.jpg",
    "Harappa_Trade_Route": "/Layer images/Trade Route/harrapa civilization trade route.jpg",
    "Silk_Route": "/Layer images/Trade Route/silk route.jpg",
    "Spice_Route": "/Layer images/Trade Route/spice route.jpg",
    "Trans_Sahara_Trade_Route": "/Layer images/Trade Route/trance sahara trade route.jpg",

    // Indian Rivers
    "Bramhaputara_River": "/Layer images/Indian rivers/Brahmaputra river.jpg",
    "Gandak_River": "/Layer images/Indian rivers/gandak river.jpg",
    "Hooghaly_River": "/Layer images/Indian rivers/hooghly river.jpg",
    "Ganga_River": "/Layer images/Indian rivers/ganga river.jpg",
    "Betwa_River": "/Layer images/Indian rivers/betwa river.jpg",
    "Banas_River": "/Layer images/Indian rivers/banas river.jpg",
    "Chambal_River": "/Layer images/Indian rivers/Chambal-river.jpg",
    "Yamuna_River": "/Layer images/Indian rivers/yamuna river.jpg",
    "Indravati_River": "/Layer images/Indian rivers/indravati rievr.jpg",
    "Godavari_River": "/Layer images/Indian rivers/godavari river.jpg",
    "Wainganga_River": "/Layer images/Indian rivers/Wainganga-river.png",
    "Indus_River": "/Layer images/Indian rivers/Indus River.jpg",
    "Sutlej_River": "/Layer images/Indian rivers/sutlej river.jpg",
    "Kollidam_River": "/Layer images/Indian rivers/kollidam river.jpg",
    "Kaveri_River": "/Layer images/Indian rivers/kaveri river.jpg",
    "Bhima_River": "/Layer images/Indian rivers/bhima river.jpg",
    "Krishna_River": "/Layer images/Indian rivers/krishna river.jpg",
    "Tungabhadara_River": "/Layer images/Indian rivers/tungabhadra river.jpg",
    "Luni_River": "/Layer images/Indian rivers/luni-river.jpg",
    "Mahanadi_River": "/Layer images/Indian rivers/Mahanadi river.jpg",
    "Tel_River": "/Layer images/Indian rivers/tel river.jpg",
    "Mahi_River": "/Layer images/Indian rivers/mahi river.jpg",
    "Narmada_River": "/Layer images/Indian rivers/Narmada river.jpg",
    "Sabarmati_River": "/Layer images/Indian rivers/sabarmati river.jpg",
    "Tapi_River": "/Layer images/Indian rivers/tapi river.jpg"
};

// --- ICONS ---
const PlayIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 52 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M45.3965 20.2543C50.7012 23.1391 50.7012 30.6066 45.3965 33.4913L13.3666 50.9091C8.21088 53.7128 1.875 50.0636 1.875 44.2906V9.45505C1.875 3.682 8.21088 0.0328519 13.3665 2.8365L45.3965 20.2543Z" stroke="#1C274C" strokeWidth="3.75"/>
</svg>;
const PauseIcon = ({ size = 18 }) =><svg width={size} height={size} viewBox="0 0 25 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.5 2.5V37.5M22.5 2.5V37.5" stroke="black" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>;
const RepeatIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const BackIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;

const CheckSquareOutline = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 10.4167L11.625 14.0417L23.7083 1.95833M16.4583 0.75H6.55C4.52 0.75 3.505 0.75 2.72925 1.14512C2.04719 1.49266 1.49266 2.04719 1.14512 2.72925C0.75 3.505 0.75 4.52 0.75 6.55V16.7C0.75 18.73 0.75 19.745 1.14512 20.5208C1.49266 21.2028 2.04719 21.7573 2.72925 22.1049C3.505 22.5 4.52 22.5 6.55 22.5H16.7C18.73 22.5 19.745 22.5 20.5207 22.1049C21.2028 21.7573 21.7573 21.2028 22.1049 20.5208C22.5 19.745 22.5 18.73 22.5 16.7V11.625" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>;
const CheckSquareFilled = ({ size = 20 }) =><svg width={size} height={size} viewBox="0 0 30 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.5 12.4167L13.875 16.7917L28.4583 2.20833M19.7083 0.75H7.75C5.3 0.75 4.075 0.75 3.13875 1.22687C2.31558 1.64631 1.64631 2.31558 1.22687 3.13875C0.75 4.075 0.75 5.3 0.75 7.75V20C0.75 22.45 0.75 23.675 1.22687 24.6112C1.64631 25.4344 2.31558 26.1037 3.13875 26.5231C4.075 27 5.3 27 7.75 27H20C22.45 27 23.675 27 24.6112 26.5231C25.4344 26.1037 26.1037 25.4344 26.5231 24.6112C27 23.675 27 22.45 27 20V13.875" stroke="#17FD31" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>;
const InfoBoxIcon = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.75 22.7083C0.75 25.8083 3.33333 26.5833 4.625 26.5833H21.4167C22.1018 26.5833 22.7589 26.3112 23.2434 25.8267C23.7278 25.3422 24 24.6851 24 24V16.25M0.75 22.7083V7.20833C0.75 5.91667 1.525 3.33333 4.625 3.33333H7.20833V5.91667M0.75 22.7083C0.75 21.4167 1.525 18.8333 4.625 18.8333H7.20833V5.91667M7.20833 5.91667H9.79167M20.125 0.75C20.125 2.90321 18.8333 7.20833 13.6667 7.20833C15.8199 7.20833 20.125 8.5 20.125 13.6667C20.125 8.5 24.4301 7.20833 26.5833 7.20833C21.4167 7.20833 20.125 2.90321 20.125 0.75Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>;
const HeartOutline = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const HeartFilled = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;

// --- COLOR LOGIC ---
const getColorByType = (type) => {
    if (!type) return "#3b82f6"; 
    const t = type.toLowerCase();
    
    if (t.includes("river")) {
        const blues = ["#38bdf8", "#60a5fa", "#3b82f6", "#2563eb", "#0ea5e9", "#0284c7", "#1d4ed8", "#93c5fd"];
        return blues[Math.floor(Math.random() * blues.length)];
    }
    
    if (t.includes("route") || t.includes("trade")) {
        const routeColors = ["#f59e0b", "#ea580c", "#dc2626", "#16a34a", "#9333ea", "#db2777", "#d97706", "#ca8a04", "#059669"];
        return routeColors[Math.floor(Math.random() * routeColors.length)];
    }
    
    const colors = ['#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const Layers = ({ searchQuery = "", setSelectedType, selectedType, isDemo = false, handleLoginClick }) => { 
    const dispatch = useDispatch();
    const navigate = useNavigate(); 
    const layers = useSelector((state) => state.layers.layers);
    
    // GET REAL USER ID/EMAIL FROM REDUX
    const userEmail = useSelector((state) => state.project?.ownerEmail) || "guest_user"; 
    const [prevSearch, setPrevSearch] = useState("");
    
    const [typesList, setTypesList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCategorySelector, setShowCategorySelector] = useState(true);

    // --- DATABOX STATE ---
    const [activeDataLayer, setActiveDataLayer] = useState(null);
    const liveActiveLayer = activeDataLayer 
    ? layers.find(l => l.id === activeDataLayer.id) || activeDataLayer 
    : null;
    const [dataCache, setDataCache] = useState({});
    
    // Create a ref for the Databox to handle outside clicks
    const dataBoxRef = useRef(null);

    // --- COMPACT MODE DETECTION ---
    const [isCompact, setIsCompact] = useState(false);
    useEffect(() => {
        const checkSize = () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            const isShort = window.innerHeight < 600;
            setIsCompact(isLandscape && isShort);
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

    // --- GLOBAL CLICK OUTSIDE LISTENER ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataBoxRef.current && !dataBoxRef.current.contains(event.target)) {
                setActiveDataLayer(null);
            }
        };

        if (activeDataLayer) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeDataLayer]);
    
    useEffect(() => {
        const isNowSearching = searchQuery && searchQuery.trim().length > 0;
        
        // If the search query changed and it's not empty
        if (isNowSearching && searchQuery !== prevSearch) {
            
            // 1. Wipe the category selection so the UI knows we are in "Global Search" mode
            if (selectedType) {
                setSelectedType("");
            }

            // 2. Turn off ALL globally visible layers so the map starts fresh for the new search
            layers.forEach(layer => {
                if (layer.visible) {
                    dispatch(toggleLayerVisibility(layer.id));
                }
            });
        }

        setPrevSearch(searchQuery || "");
    }, [searchQuery, prevSearch, layers, selectedType, setSelectedType, dispatch]);

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        const initLayers = async () => {
            // Short circuit if demo to save unnecessary API calls
            if (isDemo) return; 

            if (layers.length > 0) {
                 const uniqueTypes = [...new Set(layers.map(l => l.metadata?.type).filter(Boolean))];
                 setTypesList(uniqueTypes);
                 return;
            }

            try {
                const allMetadata = await getAllLayers();
                if (allMetadata && Array.isArray(allMetadata)) {
                    const uniqueTypes = [...new Set(allMetadata.map(l => l.layerType).filter(Boolean))];
                    setTypesList(uniqueTypes);

                    allMetadata.forEach(meta => {
                        dispatch(addLayerMetadata({
                            id: meta.id,
                            name: meta.layerName,
                            color: getColorByType(meta.layerType),
                            metadata: {
                                type: meta.layerType,
                                storageId: meta.storageFileId
                            }
                        }));
                    });
                }
            } catch (error) {
                console.error("Failed to load metadata:", error);
            }
        };
        initLayers();
    }, [dispatch, layers.length, isDemo]); 

    // --- 2. NAVIGATION HANDLERS ---
    const handleCategoryClick = (type) => {
        logger.logAction("MAIN_CATEGORY_CLICK", window.location.pathname, {
            categoryName: type,
            action: "opened_category"
        });
        dispatch(resetAllVisibility());
        setSelectedType(type);
        setShowCategorySelector(false);
    };

    const handleBackClick = () => {
        setShowCategorySelector(true);
        setSelectedType(""); 
        setActiveDataLayer(null); 
    };

    // --- 3. DATA FETCH ---
    useEffect(() => {
        if (!selectedType || showCategorySelector || isDemo) return;

        const layersOfType = layers.filter(l => l.metadata?.type === selectedType);
        const allLoaded = layersOfType.length > 0 && layersOfType.every(l => l.data);

        if (allLoaded) return;

        const fetchGeoData = async () => {
            setLoading(true);
            try {
                const results = await searchGeoLayers(selectedType);
                if (Array.isArray(results)) {
                    results.forEach(apiLayer => {
                        if (apiLayer.geoFileContent) {
                            const cleanData = { ...apiLayer.geoFileContent };
                            delete cleanData.crs;
                            
                            if (apiLayer.metaDataContent) {
                                cleanData._metaDataContent = apiLayer.metaDataContent;
                            }

                            dispatch(updateLayerData({
                                id: apiLayer.id,
                                data: cleanData
                            }));
                        }
                    });
                }
            } catch (error) {
                console.error(`Failed to load data for ${selectedType}:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchGeoData();
    }, [selectedType, layers, dispatch, showCategorySelector, isDemo]);

    // --- 4. TOGGLE HANDLER ---
    const handleToggle = async (layer) => {
        logger.logAction("SUB_LAYER_TOGGLE", window.location.pathname, {
            layerId: layer.id,
            layerName: layer.name,
            category: layer.metadata?.type || "Unknown",
        });
        if (!layer.data) {
            setLoading(true);
            try {
                const results = await searchGeoLayers(layer.metadata.type);
                const found = results.find(r => r.id === layer.id);
                if (found && found.geoFileContent) {
                    const cleanData = { ...found.geoFileContent };
                    delete cleanData.crs;
                    
                    if (found.metaDataContent) {
                        cleanData._metaDataContent = found.metaDataContent;
                    }

                    dispatch(updateLayerData({ id: layer.id, data: cleanData }));
                    dispatch(toggleLayerVisibility(layer.id));
                }
            } catch(e) { console.error(e); }
            setLoading(false);
            return;
        }

        dispatch(toggleLayerVisibility(layer.id));
        if (!layer.visible && window.mapxFlyToLayer) {
            window.mapxFlyToLayer(layer.data);
        }
    };

    // --- 5. ANIMATION HANDLERS ---
    const handlePlay = (layer) => {
        if (!layer.visible) handleToggle(layer); 
        dispatch(setLayerPlaying({ id: layer.id, isPlaying: true }));
    };

    const handlePause = (layer) => {
        dispatch(setLayerPlaying({ id: layer.id, isPlaying: false }));
    };

    const handleRepeat = (layer) => {
        if (!layer.visible) handleToggle(layer);
        dispatch(triggerLayerRestart(layer.id));
    };

    // --- 6. REAL API DATABOX LOGIC ---
    const openDataBox = async (layer, e) => {
        e.stopPropagation(); 
        setActiveDataLayer(layer);

        // If data is already cached, don't refetch
        if (!dataCache[layer.id]) {
            setDataCache(prev => ({
                ...prev,
                [layer.id]: { loading: true, points: [], likes: "0", isLiked: false }
            }));

            try {
                let metaPoints = [];
                let metaData = layer.data?._metaDataContent;

                if (!metaData) {
                    const results = await searchGeoLayers(layer.metadata.type);
                    const found = results.find(r => r.id === layer.id);
                    if (found) metaData = found.metadataContent;
                    // console.log(found.metadataContent);
                }

                if (metaData) {
                // Default to empty array
                let parsedPoints = [];

                if (typeof metaData === 'string') {
                        // console.log("Here")
                        parsedPoints = metaData
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0);
                } else if (typeof metaData === 'object' && metaData !== null) {
                    // 3. Handle the case where it was already an object
                    if (Array.isArray(metaData.points)) {
                        parsedPoints = metaData.points;
                    } else if (Array.isArray(metaData.infoPoints)) {
                        parsedPoints = metaData.infoPoints;
                    } else {
                        parsedPoints = Object.entries(metaData)
                            .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
                    }
                }

                // Filter out any super short junk strings and assign to our main array
                metaPoints = parsedPoints.filter(str => str.length > 3);
            }

                if (metaPoints.length === 0) {
                    metaPoints = ["No specific metadata available for this layer."];
                }

                const likesRes = await getLayerLikes(layer.id, userEmail);

                setDataCache(prev => ({
                    ...prev,
                    [layer.id]: {
                        loading: false,
                        points: metaPoints,
                        likes: likesRes.formattedLikes || likesRes.totalLikes || "0", 
                        isLiked: likesRes.likedByCurrentUser || false
                    }
                }));
            } catch (error) {
                console.error("Failed to load layer details", error);
                setDataCache(prev => ({
                    ...prev,
                    [layer.id]: { ...prev[layer.id], loading: false }
                }));
            }
        }
    };

    const handleLikeToggle = async (layerId) => {
        const currentData = dataCache[layerId];
        if (!currentData || currentData.loading) return;

        const wasLiked = currentData.isLiked;
        
        setDataCache(prev => ({
            ...prev,
            [layerId]: {
                ...currentData,
                isLiked: !wasLiked
            }
        }));

        try {
            const res = await toggleLayerLike(layerId, userEmail);
            if (!res) throw new Error("Like API failed to respond");
            
            setDataCache(prev => ({
                ...prev,
                [layerId]: {
                    ...prev[layerId],
                    isLiked: res.likedByCurrentUser,
                    likes: res.formattedLikes || res.totalLikes || "0"
                }
            }));
        } catch (error) {
            setDataCache(prev => ({
                ...prev,
                [layerId]: currentData
            }));
        }
    };

    const handleAskDynoClick = () => {
        if (!activeDataLayer) return;

        const name = activeDataLayer.name ? activeDataLayer.name.replace(/_/g, ' ') : "this layer";
        const type = activeDataLayer.metadata?.type || "feature";

        const points = dataCache[activeDataLayer.id]?.points || [];
        const contextString = points.length > 0 
            ? points.join(' ') 
            : "No specific details available.";

        const queryText = `Tell me more about the ${type} named ${name}.//////${contextString}`;

        localStorage.setItem("pendingDynoQuery", queryText);

        const event = new CustomEvent('trigger-know-more', { 
            detail: { query: queryText } 
        });
        window.dispatchEvent(event);
    };

    const isSearching = searchQuery && searchQuery.trim().length > 0;

    const displayedLayers = useMemo(() => {
        if (isSearching) {
            const lowerQuery = searchQuery.toLowerCase();
            return layers.filter(layer => 
                layer.name.toLowerCase().includes(lowerQuery)
            );
        }

        if (!selectedType) return [];
        return layers.filter(layer => layer.metadata?.type === selectedType);
    }, [layers, selectedType, searchQuery, isSearching]);

    const handleTurnOffAll = () => {
        const isSearching = searchQuery && searchQuery.trim().length > 0;
        const lowerQuery = isSearching ? searchQuery.toLowerCase() : "";

        layers.forEach(layer => {
            let matchesCurrentView = false;

            if (isSearching) {
                matchesCurrentView = layer.name.toLowerCase().includes(lowerQuery);
            } 
            else {
                matchesCurrentView = layer.metadata?.type === selectedType;
            }

            if (matchesCurrentView && layer.visible) {
                dispatch(toggleLayerVisibility(layer.id));
            }
        });
    };
    
    const activeLayersCount = displayedLayers.filter(l => l.visible).length;
    const textSize = isCompact ? "text-[10px]" : "text-xs";

    if (isDemo) {
        return (
            <div className="w-full h-full flex flex-col relative overflow-hidden rounded-3xl">
                {/* Glassmorphism Blur Overlay */}
                <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/30">
                    {/* Skeuomorphic Pill */}
                    <div className="px-8 py-4 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-[inset_0_2px_2px_rgba(255,255,255,0.1),_0_10px_30px_rgba(0,0,0,0.8)] border border-black/80 flex items-center gap-2">
                        <span 
                            onClick={()=>handleLoginClick("LeftPanel")} 
                            className="text-green-400 font-extrabold cursor-pointer text-lg drop-shadow-[0_0_8px_rgba(74,222,128,0.4)] hover:drop-shadow-[0_0_12px_rgba(74,222,128,0.8)] transition-all"
                        >
                            Login
                        </span>
                        <span className="text-zinc-300 font-medium text-sm text-shadow-sm">to access the layers</span>
                    </div>
                </div>

                {/* Skeleton Background Grid */}
                <div className="flex flex-col gap-3 p-2 opacity-30 pointer-events-none h-full">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="w-full h-20 bg-zinc-800 rounded-full animate-pulse border border-white/5 shadow-md"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col relative">
            
            <AnimatePresence mode="wait">
                {/* ========================================= */}
                {/* VIEW 1: CATEGORY SELECTOR                 */}
                {/* ========================================= */}
                {(!isSearching && showCategorySelector) ? (
                    <motion.div 
                        key="category-grid"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-y-auto cool-scrollbar pr-2 flex-1"
                    >
                        {typesList.length === 0 ? (
                            <div className="text-center text-zinc-400 mt-10 text-sm">
                                Loading Categories...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {typesList.map((type) => (
                                    <motion.div
                                        key={type}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleCategoryClick(type)}
                                        className="group flex flex-col rounded-xl overflow-hidden cursor-pointer shadow-lg border border-white/10 bg-zinc-800 transition-all hover:border-white/30"
                                    >
                                        <div className="relative w-full aspect-[5/3] bg-zinc-900">
                                            {/* --- UPDATED CATEGORY IMAGE SRC LOGIC HERE --- */}
                                            <img 
                                                src={LAYER_IMAGES[type] || `https://picsum.photos/seed/${encodeURIComponent(type)}/500/300`} 
                                                alt={type}
                                                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                                        </div>

                                        <div className="flex items-center justify-center bg-zinc-900 border-t border-white/5 py-1.5 px-2 text-center group-hover:bg-zinc-800 transition-colors">
                                            <span className={`text-white font-bold block truncate leading-tight drop-shadow-md ${textSize}`}>
                                                {type}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                ) : (
                    
                /* ========================================= */
                /* VIEW 2: LAYER LIST (GLOBAL OR CATEGORY)   */
                /* ========================================= */
                    <motion.div 
                        key="layer-list"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full relative"
                    >
                        {/* Compact Sub-header and Separation Line */}
                        <div className="px-1 shrink-0 mb-3 flex flex-col items-center">
                            
                            <div className="flex items-center justify-between w-full bg-zinc-900/60 backdrop-blur-sm border border-black/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.6),0_1px_2px_rgba(255,255,255,0.05)] rounded-full px-3 py-1.5 text-[10px] text-zinc-400 relative overflow-hidden mb-2">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
                                
                                <div className="flex items-center gap-2 relative z-10">
                                    {/* Hide back button if we are doing a global search */}
                                    {!isSearching && (
                                        <>
                                            <button 
                                                onClick={handleBackClick} 
                                                className="hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors group"
                                                title="Go Back"
                                            >
                                                <BackIcon size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                                            </button>
                                            <div className="w-px h-3 bg-zinc-700/80"></div>
                                        </>
                                    )}
                                    
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${activeLayersCount > 0 ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-zinc-600'}`}></div>
                                        <span className={activeLayersCount > 0 ? "text-green-400 font-semibold" : "text-zinc-500"}>
                                            {isSearching ? `Found ${displayedLayers.length}` : `${activeLayersCount} layers on`}
                                        </span>
                                    </div>
                                </div>
                                
                                <AnimatePresence>
                                    {activeLayersCount > 0 && (
                                        <motion.button 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            onClick={handleTurnOffAll} 
                                            className="relative z-10 hover:text-red-400 hover:bg-red-500/10 px-2 py-0.5 rounded-full transition-all flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider"
                                        >
                                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                            <span>Turn off all</span>
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className={`px-6 flex items-center justify-between border-b-2 border-black shadow-[0_1px_0_rgba(255,255,255,0.05)] w-[112%]`}></div>
                        </div>

                        {/* Layer Grid with Shifting Animation */}
                        <div className="overflow-y-auto cool-scrollbar pr-2 flex-1 pb-4">
                            {loading && !isSearching && (
                                <div className="text-center text-zinc-400 mt-2 mb-4 text-xs animate-pulse">
                                    Loading layer data...
                                </div>
                            )}

                            <motion.div layout className="grid grid-cols-2 gap-4">
                                <AnimatePresence mode="popLayout">
                                    {displayedLayers.map((layer) => {
                                        const isDataReady = !!layer.data; 
                                        const layerNameCleaned = layer.name.replace(/_/g, ' ');
                                        
                                        return (
                                            <motion.div 
                                                layout="position"
                                                key={layer.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ 
                                                    layout: { type: "spring", stiffness: 350, damping: 25 },
                                                    opacity: { duration: 0.15 }
                                                }}
                                                className={`group relative flex flex-col rounded-xl overflow-hidden bg-zinc-800 border-[1.5px] cursor-pointer transition-colors duration-300
                                                    ${layer.visible 
                                                        ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] z-10' 
                                                        : 'border-white/10 shadow-md hover:border-green-400/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] z-0'
                                                    }
                                                `}
                                                onClick={() => handleToggle(layer)} 
                                            >
                                                {/* Image Background */}
                                                <div className="relative w-full aspect-[4/3] bg-zinc-900">
                                                    {/* --- UPDATED INDIVIDUAL LAYER IMAGE SRC LOGIC HERE --- */}
                                                    <img 
                                                        src={LAYER_IMAGES[layerNameCleaned] || LAYER_IMAGES[layer.name] || `https://picsum.photos/seed/${layer.id}/500/300`} 
                                                        alt={layerNameCleaned}
                                                        className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />
                                                </div>

                                                {/* Floating Right Icons */}
                                                <div className={`absolute top-2 right-2 flex flex-col gap-1.5 z-10 transition-opacity duration-200 ${layer.visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    {/* Checkbox Icon */}
                                                    <div className="w-6 h-6 rounded-full bg-black/10 backdrop-blur-md border-b border-white/20 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform hover:scale-110">
                                                        {loading && !isDataReady ? (
                                                            <div className="w-3 h-3 border-2 border-white/20 border-t-green-500 rounded-full animate-spin"></div>
                                                        ) : (
                                                            layer.visible ? <CheckSquareFilled size={12} /> : <CheckSquareOutline size={12} className="text-white/80" />
                                                        )}
                                                    </div>

                                                    {/* Info / Databox Icon */}
                                                    <button 
                                                        onClick={(e) => openDataBox(layer, e)}
                                                        className="w-6 h-6 rounded-full bg-black/10 backdrop-blur-md border-b border-white/20 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-white/90 hover:text-white transition-all hover:scale-110 hover:bg-white/20"
                                                    >
                                                        <InfoBoxIcon size={12} />
                                                    </button>
                                                </div>

                                                {/* Layer Title Block */}
                                                <div className="absolute bottom-0 left-0 w-full p-3 pt-6 pointer-events-none">
                                                    <h3 className="text-white font-semibold text-sm drop-shadow-md truncate">
                                                        {layerNameCleaned}
                                                    </h3>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                            
                            {!loading && displayedLayers.length === 0 && (
                                <div className="text-center text-zinc-500 mt-10 text-sm">
                                    {isSearching ? "No layers match your search." : `No layers found for ${selectedType}.`}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========================================= */}
            {/* VIEW 3: THE DATABOX (SIDE PANEL - RIGHT)  */}
            {/* ========================================= */}
            <AnimatePresence>
                {activeDataLayer && (
                    <motion.div
                        ref={dataBoxRef}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute top-10 left-[calc(100%+12px)] max-h-[calc(100%-5rem)] w-[320px] bg-[#f1ebe3] shadow-[10px_0_40px_rgba(0,0,0,0.5)] z-[99999] flex flex-col rounded-2xl border border-white/40 overflow-hidden"
                    >
                        {/* Inner padding container */}
                        <div className="flex flex-col flex-1 min-h-0 p-5">
                            
                            {/* Header Section */}
                            <div className="flex justify-between items-start border-b border-zinc-300 pb-3 mb-3 relative shrink-0">
                                
                                <div className="mt-1 flex-1 pr-2">
                                    <h3 className="text-lg font-bold text-zinc-900 leading-tight truncate">
                                        {activeDataLayer.name.replace(/_/g, ' ')}
                                    </h3>
                                </div>
                                
                                <div className="flex flex-col items-center shrink-0">
                                    <span className="text-[7px] text-zinc-500 font-bold mb-0.5 uppercase tracking-wider">To know more</span>
                                    <button 
                                        onClick={handleAskDynoClick}
                                        className="bg-[#075e54] text-white text-[9px] px-2.5 py-1 rounded-full font-bold shadow-md hover:bg-[#054a42] active:scale-95 transition-all tracking-wide"
                                    >
                                        ASK DINO
                                    </button>
                                </div>
                            </div>

                            {/* Body Section - Info Points */}
                            <div className="flex-1 overflow-y-auto cool-scrollbar-dark pr-1 min-h-0">
                                
                                {dataCache[activeDataLayer.id]?.loading ? (
                                    <div className="space-y-4 mt-2">
                                        <div className="h-3 bg-zinc-300/60 rounded w-full animate-pulse"></div>
                                        <div className="h-3 bg-zinc-300/60 rounded w-5/6 animate-pulse"></div>
                                        <div className="h-3 bg-zinc-300/60 rounded w-full animate-pulse"></div>
                                        <div className="h-3 bg-zinc-300/60 rounded w-4/6 animate-pulse"></div>
                                    </div>
                                ) : (
                                    <ul className="space-y-3 text-[13px] text-zinc-700">
                                        {dataCache[activeDataLayer.id]?.points?.map((point, i) => (
                                            <motion.li 
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                key={i} 
                                                className="flex items-start gap-2"
                                            >
                                                <span className="text-[#075e54] mt-1 text-[8px] opacity-70">●</span>
                                                <span className="leading-snug">{point}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Footer Section - Controls */}
                            <div className="mt-3 pt-3 border-t border-zinc-300 flex justify-between items-end pb-1 shrink-0">
                                <button 
                                    onClick={() => handleLikeToggle(activeDataLayer.id)}
                                    className="flex items-center gap-1.5 group active:scale-90 transition-transform"
                                >
                                    {dataCache[activeDataLayer.id]?.isLiked ? (
                                        <HeartFilled size={26} />
                                    ) : (
                                        <HeartOutline size={26} className="text-zinc-600 group-hover:text-red-500 transition-colors" />
                                    )}
                                    <span className="font-bold text-sm text-zinc-800">
                                        {dataCache[activeDataLayer.id]?.likes || 0}
                                    </span>
                                </button>

                                {/* MERGED PLAY/PAUSE BUTTON */}
                                <div className="flex items-center gap-3 text-zinc-700">
                                    <button 
                                        onClick={() => liveActiveLayer.isPlaying ? handlePause(liveActiveLayer) : handlePlay(liveActiveLayer)}
                                        className={`transition-colors p-1 ${
                                            liveActiveLayer.isPlaying 
                                                ? 'text-[#075e54] hover:text-[#054a42]' 
                                                : 'text-zinc-700 hover:text-[#075e54]'
                                        }`}
                                        title={liveActiveLayer.isPlaying ? "Pause" : "Play"}
                                    >
                                        {liveActiveLayer.isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
            .cool-scrollbar::-webkit-scrollbar { width: 6px; }
            .cool-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .cool-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 20px; }
            
            .cool-scrollbar-dark::-webkit-scrollbar { width: 4px; }
            .cool-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
            .cool-scrollbar-dark::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.15); border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default Layers;