import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Icons ---
const PlayIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const RepeatIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;

const Layers = ({ searchQuery = "" }) => {
  const [layers, setLayers] = useState([
    { id: 1, name: "Satellite Imagery", active: true },
    { id: 2, name: "Traffic Data", active: false },
    { id: 3, name: "Weather Radar", active: true },
    { id: 4, name: "User Markers", active: true },
    { id: 5, name: "Terrain Mesh", active: false },
  ]);

  const toggleLayer = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  // --- Sorting Logic ---
  const sortedLayers = useMemo(() => {
    if (!searchQuery) return layers;

    return [...layers].sort((a, b) => {
      const aMatch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
      const bMatch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [layers, searchQuery]);

  // --- Styles ---
  const rowStyles = "group flex rounded-xl items-center justify-between p-5 mb-2 border border-white/5 bg-white/5 shadow-sm hover:bg-white/10 transition-colors duration-200 cursor-pointer select-none gap-4";
  
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

      {/* Replaced 'no-scrollbar' with 'cool-scrollbar' and adjusted padding */}
      <div className="w-full h-full overflow-y-auto cool-scrollbar pr-2">
        <AnimatePresence mode="popLayout">
          {sortedLayers.map((layer) => {
              const isMatch = searchQuery && layer.name.toLowerCase().includes(searchQuery.toLowerCase());
              
              return (
                  <motion.div 
                      layout 
                      key={layer.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={rowStyles}
                      onClick={() => toggleLayer(layer.id)}
                  >
                      {/* Left Side: Title stacked on top of Controls */}
                      <div className="flex flex-col gap-2">
                          
                          {/* Line 1: Title Only */}
                          <span className={`text-md font-medium transition-colors line-clamp-1 min-h-[1.75rem] ${isMatch ? "text-[#25d366]" : "text-zinc-200 group-hover:text-white"}`}>
                              {layer.name}
                          </span>

                          {/* Line 2: Controls (Play, Pause, Repeat) */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-all" title="Play">
                                  <PlayIcon />
                              </button>
                              <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-all" title="Pause">
                                  <PauseIcon />
                              </button>
                              <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-all" title="Repeat">
                                  <RepeatIcon />
                              </button>
                          </div>
                      </div>

                      {/* Right Side: Checkbox */}
                      <div className="shrink-0">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${layer.active ? "bg-blue-600 border-blue-600" : "border-zinc-600 bg-transparent"}`}>
                              {layer.active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                          </div>
                      </div>

                  </motion.div>
              );
          })}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Layers;