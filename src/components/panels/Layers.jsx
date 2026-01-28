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
const PlayIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const RepeatIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const SelectAllIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const DeselectAllIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>;

// --- COLOR LOGIC ---
const getColorByType = (type) => {
    if (!type) return "#3b82f6"; 
    const t = type.toLowerCase();
    
    // 1. Rivers: Random Shades of Blue
    if (t.includes("river")) {
        const blues = [
            "#38bdf8", "#60a5fa", "#3b82f6", "#2563eb", 
            "#0ea5e9", "#0284c7", "#1d4ed8", "#93c5fd"
        ];
        return blues[Math.floor(Math.random() * blues.length)];
    }
    
    // 2. Routes: Distinct Colors
    if (t.includes("route") || t.includes("trade")) {
        const routeColors = [
            "#f59e0b", "#ea580c", "#dc2626", "#16a34a", 
            "#9333ea", "#db2777", "#d97706", "#ca8a04", "#059669"
        ];
        return routeColors[Math.floor(Math.random() * routeColors.length)];
    }
    
    // Fallback
    const colors = ['#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const Layers = ({ searchQuery = "" }) => {
  const dispatch = useDispatch();
  const layers = useSelector((state) => state.layers.layers);
  
  const [typesList, setTypesList] = useState([]);
  const [selectedType, setSelectedType] = useState(""); 
  const [loading, setLoading] = useState(false);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const initLayers = async () => {
      if (layers.length > 0) {
         const uniqueTypes = [...new Set(layers.map(l => l.metadata?.type).filter(Boolean))];
         setTypesList(uniqueTypes);
         if (!selectedType && uniqueTypes.length > 0) {
             setSelectedType(uniqueTypes.includes("World Rivers") ? "World Rivers" : uniqueTypes[0]);
         }
         return;
      }

      try {
        const allMetadata = await getAllLayers();
        if (allMetadata && Array.isArray(allMetadata)) {
          const uniqueTypes = [...new Set(allMetadata.map(l => l.layerType).filter(Boolean))];
          setTypesList(uniqueTypes);

          let defaultType = "";
          if (uniqueTypes.includes("World Rivers")) defaultType = "World Rivers";
          else if (uniqueTypes.length > 0) defaultType = uniqueTypes[0];
          setSelectedType(defaultType);

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

  // --- 2. DROPDOWN HANDLER ---
  const handleTypeChange = (e) => {
      const newType = e.target.value;
      dispatch(resetAllVisibility());
      setSelectedType(newType);
  };

  // --- 3. DATA FETCH ---
  useEffect(() => {
    if (!selectedType) return;
    if (selectedType === "ALL") return;

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
  }, [selectedType, layers, dispatch]);

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
    const typeFiltered = layers.filter(layer => {
      return selectedType === "ALL" || layer.metadata?.type === selectedType;
    });

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

  const rowStyles = "group flex rounded-xl items-center justify-between p-5 mb-2 border border-white/5 bg-white/5 shadow-sm hover:bg-white/10 transition-colors duration-200 cursor-pointer select-none gap-4";

  return (
    <div className="w-full h-full flex flex-col">
        
        {/* Controls Header */}
        <div className="px-1 mb-4 shrink-0 flex gap-2">
            <select
                value={selectedType}
                onChange={handleTypeChange} 
                disabled={typesList.length === 0}
                className="flex-1 layer-select appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all cursor-pointer disabled:opacity-50 min-w-0"
            >
                {typesList.length === 0 ? (
                    <option>Loading...</option>
                ) : (
                    <>
                        <option value="ALL" className="bg-zinc-800 text-white font-bold">All Layers</option>
                        {typesList.map(type => (
                            <option key={type} value={type} className="bg-zinc-800 text-white">
                                {type}
                            </option>
                        ))}
                    </>
                )}
            </select>

            <button
                onClick={handleSelectAll}
                disabled={displayedLayers.length === 0 || loading}
                title={allSelected ? "Deselect All" : "Select All"}
                className={`
                    w-12 flex items-center justify-center rounded-xl border border-white/10 transition-all
                    ${allSelected 
                        ? "bg-green-500 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
            >
                {allSelected ? <SelectAllIcon /> : <DeselectAllIcon />}
            </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto cool-scrollbar pr-2 flex-1">
            {loading && selectedType !== "ALL" && (
                <div className="text-center text-zinc-400 mt-2 mb-2 text-xs animate-pulse">
                    Loading data...
                </div>
            )}

            <AnimatePresence mode="popLayout">
            {displayedLayers.map((layer) => {
                const isDataReady = !!layer.data; 
                const matchesSearch = searchQuery && layer.name.toLowerCase().includes(searchQuery.toLowerCase());
                
                return (
                    <motion.div 
                        layout 
                        key={layer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={rowStyles}
                        onClick={() => handleToggle(layer)} 
                        style={{ opacity: 1, cursor: 'pointer' }}
                    >
                        {/* LEFT: Name & Buttons */}
                        {/* Added min-w-0 to ensure text truncation works in flex child */}
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                            
                            {/* Name Span: Added 'truncate' class to prevent wrapping */}
                            <span className={`text-md font-medium transition-colors truncate
                                ${matchesSearch 
                                    ? "text-green-400 font-bold" 
                                    : layer.visible 
                                        ? "text-white" 
                                        : "text-zinc-300 group-hover:text-white"
                                }`
                            } title={layer.name}>
                                {layer.name}
                            </span>
                            
                            {/* Buttons */}
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={(e) => handlePlay(layer, e)} 
                                    className={`p-1.5 rounded transition-all ${layer.visible && layer.isPlaying ? "text-green-400 bg-white/10" : "text-zinc-500 hover:text-white"}`} 
                                    title="Play"
                                >
                                    <PlayIcon />
                                </button>
                                
                                <button 
                                    onClick={(e) => handlePause(layer, e)} 
                                    className={`p-1.5 rounded transition-all ${layer.visible && !layer.isPlaying ? "text-yellow-400 bg-white/10" : "text-zinc-500 hover:text-white"}`} 
                                    title="Pause"
                                >
                                    <PauseIcon />
                                </button>
                                
                                <button 
                                    onClick={(e) => handleRepeat(layer, e)} 
                                    className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-white/10 rounded transition-all" 
                                    title="Repeat"
                                >
                                    <RepeatIcon />
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: Checkbox */}
                        <div className="shrink-0 pl-2">
                             {loading && !isDataReady && selectedType === "ALL" ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
                             ) : (
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors 
                                    ${layer.visible 
                                        ? "bg-green-500 border-green-500" // CHANGED TO GREEN
                                        : "border-zinc-600 bg-transparent"
                                    }`
                                }>
                                    {layer.visible && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                                </div>
                             )}
                        </div>

                    </motion.div>
                );
            })}
            </AnimatePresence>
            
            {!loading && displayedLayers.length === 0 && (
                <div className="text-center text-zinc-500 mt-10 text-sm">
                    No layers found.
                </div>
            )}
        </div>
        <style>{`
        .cool-scrollbar::-webkit-scrollbar { width: 6px; }
        .cool-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .cool-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 20px; }
        .layer-select {
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            background-size: 1em;
        }
        `}</style>
    </div>
  );
};

export default Layers;