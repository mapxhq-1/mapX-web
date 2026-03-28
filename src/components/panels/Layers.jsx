import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";

// Redux Actions
import { 
    addLayerMetadata, 
    updateLayerData, 
    toggleLayerVisibility,
    resetAllVisibility,
    setLayerPlaying,
    triggerLayerRestart
} from "../../store/layerSlice"; 

// API Functions
import { getAllLayers, searchGeoLayers } from "../api/geoJson"; 

// --- Icons ---
const PlayIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const RepeatIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const SelectAllIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const DeselectAllIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>;
const BackIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;

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

const Layers = ({ searchQuery = "", setSelectedType, selectedType }) => {
    const dispatch = useDispatch();
    const layers = useSelector((state) => state.layers.layers);
    
    const [typesList, setTypesList] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [showCategorySelector, setShowCategorySelector] = useState(true);

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

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        const initLayers = async () => {
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
    }, [dispatch, layers.length]); 

    // --- 2. NAVIGATION HANDLERS ---
    const handleCategoryClick = (type) => {
        dispatch(resetAllVisibility());
        setSelectedType(type);
        setShowCategorySelector(false);
    };

    const handleBackClick = () => {
        setShowCategorySelector(true);
        setSelectedType(""); 
    };

    // --- 3. DATA FETCH ---
    useEffect(() => {
        if (!selectedType || showCategorySelector) return;

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
    }, [selectedType, layers, dispatch, showCategorySelector]);

    // --- 4. TOGGLE HANDLER ---
    const handleToggle = async (layer) => {
        if (!layer.data) {
            setLoading(true);
            try {
                const results = await searchGeoLayers(layer.metadata.type);
                const found = results.find(r => r.id === layer.id);
                if (found && found.geoFileContent) {
                    const cleanData = { ...found.geoFileContent };
                    delete cleanData.crs;
                    dispatch(updateLayerData({ id: layer.id, data: cleanData }));
                    dispatch(toggleLayerVisibility(layer.id));
                    if (window.mapxFlyToLayer) window.mapxFlyToLayer(cleanData);
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
    const handlePlay = (layer, e) => {
        e.stopPropagation();
        if (!layer.visible) handleToggle(layer); 
        dispatch(setLayerPlaying({ id: layer.id, isPlaying: true }));
    };

    const handlePause = (layer, e) => {
        e.stopPropagation();
        dispatch(setLayerPlaying({ id: layer.id, isPlaying: false }));
    };

    const handleRepeat = (layer, e) => {
        e.stopPropagation();
        if (!layer.visible) handleToggle(layer);
        dispatch(triggerLayerRestart(layer.id));
    };

    // --- 6. SORT & FILTER ---
    const displayedLayers = useMemo(() => {
        const typeFiltered = layers.filter(layer => layer.metadata?.type === selectedType);

        if (!searchQuery) return typeFiltered;

        const lowerQuery = searchQuery.toLowerCase();
        return [...typeFiltered].sort((a, b) => {
            const matchA = a.name.toLowerCase().includes(lowerQuery);
            const matchB = b.name.toLowerCase().includes(lowerQuery);
            if (matchA && !matchB) return -1;
            if (!matchA && matchB) return 1;
            return 0;
        });
    }, [layers, selectedType, searchQuery]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery) return typesList;
        return typesList.filter(type => type.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [typesList, searchQuery]);

    const allSelected = displayedLayers.length > 0 && displayedLayers.every(l => l.visible);
    
    const handleSelectAll = () => {
        const shouldSelect = !allSelected;
        displayedLayers.forEach(layer => {
            if (layer.visible !== shouldSelect) {
                if (shouldSelect && !layer.data) return; 
                dispatch(toggleLayerVisibility(layer.id));
            }
        });
    };

    // --- DYNAMIC STYLES ---
    const btnSize = isCompact ? 14 : 18; 
    const checkboxSize = isCompact ? "w-4 h-4" : "w-5 h-5";
    const textSize = isCompact ? "text-[10px]" : "text-xs";
    const headerBtnSize = isCompact ? "w-8 h-8" : "w-10 h-10";
    const headerIconSize = isCompact ? 12 : 16;

    return (
        <div className="w-full h-full flex flex-col">
            
            <AnimatePresence mode="wait">
                {/* ========================================= */}
                {/* VIEW 1: CATEGORY SELECTOR                 */}
                {/* ========================================= */}
                {showCategorySelector ? (
                    <motion.div 
                        key="category-grid"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-y-auto cool-scrollbar pr-2 flex-1"
                    >
                        {filteredCategories.length === 0 ? (
                            <div className="text-center text-zinc-400 mt-10 text-sm">
                                {typesList.length === 0 ? "Loading Categories..." : "No categories match your search."}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {filteredCategories.map((type) => (
                                    <motion.div
                                        key={type}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleCategoryClick(type)}
                                        className="group flex flex-col rounded-xl overflow-hidden cursor-pointer shadow-lg border border-white/10 bg-zinc-800 transition-all hover:border-white/30"
                                    >
                                        {/* Image Area - 5:3 Aspect Ratio */}
                                        <div className="relative w-full aspect-[5/3] bg-zinc-900">
                                            <img 
                                                src={`https://picsum.photos/seed/${encodeURIComponent(type)}/500/300`} 
                                                alt={type}
                                                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                                        </div>

                                        {/* Extremely Minimal Text Bar Outside Image */}
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
                /* VIEW 2: LAYER LIST (CARD GRID)            */
                /* ========================================= */
                    <motion.div 
                        key="layer-list"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className={`px-1 shrink-0 flex items-center justify-between gap-2 ${isCompact ? "mb-2" : "mb-4"}`}>
                            <button
                                onClick={handleBackClick}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-zinc-300 transition-all ${isCompact ? "text-[10px]" : "text-sm"}`}
                            >
                                <BackIcon size={headerIconSize} />
                                <span className="font-medium truncate max-w-[150px]">{selectedType}</span>
                            </button>

                            <button
                                onClick={handleSelectAll}
                                disabled={displayedLayers.length === 0 || loading}
                                title={allSelected ? "Deselect All" : "Select All"}
                                className={`
                                    ${headerBtnSize} flex items-center justify-center rounded-xl border border-white/10 transition-all
                                    ${allSelected 
                                        ? "bg-green-500 border-green-400 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]" 
                                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {allSelected ? <SelectAllIcon size={headerIconSize} /> : <DeselectAllIcon size={headerIconSize} />}
                            </button>
                        </div>

                        {/* Layer Grid */}
                        <div className="overflow-y-auto cool-scrollbar pr-2 flex-1 pb-4">
                            {loading && (
                                <div className="text-center text-zinc-400 mt-2 mb-4 text-xs animate-pulse">
                                    Loading layer data...
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <AnimatePresence mode="popLayout">
                                    {displayedLayers.map((layer) => {
                                        const isDataReady = !!layer.data; 
                                        const matchesSearch = searchQuery && layer.name.toLowerCase().includes(searchQuery.toLowerCase());
                                        const isVisibleAndPlaying = layer.visible && layer.isPlaying;
                                        
                                        return (
                                            <motion.div 
                                                layout 
                                                key={layer.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                                className={`group flex flex-col rounded-xl overflow-hidden border bg-zinc-800 shadow-sm cursor-pointer select-none transition-all
                                                    ${layer.visible ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-white/10 hover:border-white/30'}
                                                `}
                                                onClick={() => handleToggle(layer)} 
                                            >
                                                {/* TOP: Image Area - 5:3 Aspect Ratio */}
                                                <div className="relative w-full aspect-[5/3] bg-zinc-900">
                                                    <img 
                                                        src={`https://picsum.photos/seed/${layer.id}/500/300`} 
                                                        alt={layer.name}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        loading="lazy"
                                                    />
                                                    
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                                                    {/* CHECKBOX */}
                                                    <div className="absolute top-2 right-2 shrink-0">
                                                        {loading && !isDataReady ? (
                                                            <div className={`${checkboxSize} border-2 border-white/20 border-t-blue-500 rounded-full animate-spin`}></div>
                                                        ) : (
                                                            <div className={`${checkboxSize} rounded border flex items-center justify-center transition-colors shadow-lg
                                                                ${layer.visible ? "bg-green-500 border-green-500" : "border-white/60 bg-black/40"}
                                                            `}>
                                                                {layer.visible && <svg width={isCompact ? 10 : 12} height={isCompact ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* PLAY CONTROLS */}
                                                    <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-200 pointer-events-none
                                                        ${isVisibleAndPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                                    `}>
                                                        <div className="pointer-events-auto flex gap-1.5 bg-black/70 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-xl">
                                                            <button 
                                                                onClick={(e) => handlePlay(layer, e)} 
                                                                className={`rounded-lg p-2 transition-all ${isVisibleAndPlaying ? "text-green-400 bg-white/10" : "text-white hover:bg-white/20 hover:text-green-300"}`} 
                                                                title="Play"
                                                            >
                                                                <PlayIcon size={btnSize} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handlePause(layer, e)} 
                                                                className={`rounded-lg p-2 transition-all ${layer.visible && !layer.isPlaying ? "text-yellow-400 bg-white/10" : "text-white hover:bg-white/20 hover:text-yellow-300"}`} 
                                                                title="Pause"
                                                            >
                                                                <PauseIcon size={btnSize} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleRepeat(layer, e)} 
                                                                className="rounded-lg p-2 text-white hover:bg-white/20 hover:text-blue-300 transition-all" 
                                                                title="Repeat"
                                                            >
                                                                <RepeatIcon size={btnSize} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* BOTTOM: Extremely Minimal Title Outside Image */}
                                                <div className={`flex items-center justify-center bg-zinc-900 border-t border-white/5 transition-colors py-1.5 px-2 text-center
                                                    ${layer.visible ? 'bg-green-950/30' : 'group-hover:bg-zinc-800'}
                                                `}>
                                                    <span className={`font-semibold truncate w-full tracking-wide leading-tight ${textSize}
                                                        ${matchesSearch 
                                                            ? "text-green-400" 
                                                            : layer.visible 
                                                                ? "text-white" 
                                                                : "text-zinc-400 group-hover:text-zinc-200"
                                                        }`
                                                    } title={layer.name}>
                                                        {layer.name}
                                                    </span>
                                                </div>

                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                            
                            {!loading && displayedLayers.length === 0 && (
                                <div className="text-center text-zinc-500 mt-10 text-sm">
                                    No layers found for {selectedType}.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
            .cool-scrollbar::-webkit-scrollbar { width: 6px; }
            .cool-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .cool-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default Layers;