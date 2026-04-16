import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Components
import Layers from "./Layers";

// Icons
import satelliteIcon from "../../assets/icons/satellite_icon.png";
import basicIcon from "../../assets/icons/basic_icon.png";
import lightIcon from "../../assets/icons/light_icon.png";
import darkIcon from "../../assets/icons/dark_icon.png";
import handIcon from "../../assets/icons/hand_icon.png";
import selectIcon from "../../assets/icons/select_icon.png";
import pencilIcon from "../../assets/icons/pencil_icon.png";
import highlighterIcon from "../../assets/icons/highlighter_icon.png";
import eraserIcon from "../../assets/icons/eraser_icon.png";
import noteIcon from "../../assets/icons/note_icon.png";
import textIcon from "../../assets/icons/text_icon.png";
import hyperlinkIcon from "../../assets/icons/hyperlink_icon.png";
import imageIcon from "../../assets/icons/image_icon.png";

// --- Main Components ---

const Open = ({ setIsOpen, selectedMode, setSelectedMode, setEraserMode, styleIcons, isDemo }) => {
  const navigate = useNavigate();
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const panelRef = useRef(null);
  const [selectedType, setSelectedType] = useState(""); 
  
  // --- ROBUST DETECTION ---
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

  // --- DYNAMIC STYLES BASED ON STATE ---
  const styles = {
    panelWidth: isCompact ? 210 : 320,
    headerPadding: isCompact ? "px-4 py-1.5" : "px-6 py-6",
    searchPadding: isCompact ? "px-2 py-1.5" : "px-4 py-6",
    sectionPadding: isCompact ? "p-1.5" : "p-3",
    gap: isCompact ? "gap-1" : "gap-2",
    dividerMargin: isCompact ? "mb-1.5" : "mb-3",
    titleSize: isCompact ? "text-[10px]" : "text-xl",
    textSize: isCompact ? "text-[9px]" : "text-sm",
    iconBtnSize: isCompact ? "w-6 h-6" : "w-10 h-10",
    iconSize: isCompact ? "w-3 h-3" : "w-5 h-5",
    actionBtnHeight: isCompact ? "h-7" : "h-11",
    actionBtnWidth: isCompact ? "w-8" : "w-11",
    toolIconSize: isCompact ? "w-3.5 h-3.5" : "w-6 h-6",
    labelSize: isCompact ? "text-[8px]" : "text-xs",
    inputClass: isCompact 
      ? "bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-[9px] text-white placeholder-zinc-500 focus:outline-none focus:bg-white/10 transition-colors w-full pl-6" 
      : "bg-white/5 border border-white/10 rounded-full px-4 py-1 text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-white/10 transition-colors w-full pl-10",
  };

  const ToolIcons = {
    SelectSvg: () => <img src={selectIcon} alt="Select" className={`object-contain ${styles.toolIconSize}`} />,
    HandSvg: () => <img src={handIcon} alt="Hand" className={`object-contain ${styles.toolIconSize}`} />,
    PencilSvg: () => <img src={pencilIcon} alt="Pencil" className="w-full h-full object-contain" />,
    HighlighterSvg: () => <img src={highlighterIcon} alt="Highlighter" className={`object-contain ${styles.toolIconSize} rotate-180`} />,
    EraserSvg: () => <img src={eraserIcon} alt="Eraser" className={`object-contain ${isCompact ? "w-[16px] h-[16px]" : "w-[30px] h-[30px]"}`} />,
    NoteSvg: () => <img src={noteIcon} alt="Notes" className={`object-contain ${styles.toolIconSize}`} />,
    TextSvg: () => <img src={textIcon} alt="Text" className={`object-contain ${styles.toolIconSize}`} />,
    HyperlinkSvg: () => <img src={hyperlinkIcon} alt="Hyperlink" className={`object-contain ${styles.toolIconSize}`} />,
    ImageSvg: () => <img src={imageIcon} alt="Image" className={`object-contain ${styles.toolIconSize}`} />,
  };

  const handleToolClick = (mode, color=null) => {
    setSelectedMode(mode);
    setEraserMode(mode === 'eraser');
    try { window.mapxDrawSetMode && window.mapxDrawSetMode(mode,color); } catch (e) { console.error("Error:", e) }
  };

  const handleShapeClick = (shapeType) => {
    setEraserMode(false);
    setSelectedMode(shapeType);
    try { window.mapxDrawSetMode && window.mapxDrawSetMode(shapeType); } catch(e){console.error("Error:", e)}
  };

  const commonBtnClass = `${styles.actionBtnHeight} flex items-center justify-center rounded-xl cursor-pointer transition-all border border-transparent active:scale-95 z-20 relative`;
  const activeClass = "bg-zinc-800 text-white border-white/10 shadow-lg";
  const inactiveClass = "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white";

  return (
    <motion.div 
      ref={panelRef}
      className="relative z-50 h-[calc(100vh-0.5rem)] m-1 flex"
      initial={{ width: 60, opacity: 0 }}
      animate={{ width: styles.panelWidth, opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* FIX 1: Changed 'overflow-hidden' to 'overflow-visible' here so the databox can escape the panel */}
      <div className={`w-full h-full flex flex-col justify-between overflow-visible ${isCompact?"rounded-2xl":"rounded-4xl"} shadow-2xl bg-[#18181b]/95 backdrop-blur-2xl border-r border-white/5`}>
        
        {/* --- 1. HEADER & MAP LAYERS TITLE --- */}
        <div className="flex flex-col shrink-0">
          
          <div className={`${styles.headerPadding} flex items-center justify-between border-b border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]`}>
          <span
            className="text-white tracking-[-0.05em] text-2xl font-semibold"
            style={{ fontFamily: 'General Sans, sans-serif' }}
          >
            Magic Maps
          </span>
            
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/myProjects")} className={`${styles.iconBtnSize} flex items-center justify-center rounded-full bg-zinc-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border-t border-white/10 hover:bg-zinc-700 transition-all duration-200 active:scale-95`}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className={styles.iconSize}><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              </button>
              <button onClick={() => setIsOpen(false)} className={`${styles.iconBtnSize} rounded-full flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={`rotate-180 ${styles.iconSize}`}><g fill="none" stroke="currentColor" strokeWidth="0.5"><rect width="20" height="18" x={2} y={3} rx={3} strokeLinecap="round" strokeLinejoin="round"></rect><path d="M15 3v18"></path></g></svg>
              </button>
            </div>
          </div>
        </div>

        <div className={`px-6 flex items-center justify-between border-b border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]`}></div>
        
        {/* Added flex-col to keep the search bar above the layers list */}
        <div className={`flex-1 no-scrollbar px-3 pb-3 pt-2 min-h-0 relative flex flex-col`}>
    {/* Search moved above the layers (filter) */}
    <div className="relative shrink-0">
        <svg className={`absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        
        <input 
            type="text" 
            placeholder="Search layers" 
            // Note: You may need to add 'pr-8' or similar to your styles.inputClass 
            // so the text doesn't type underneath the 'x' button!
            className={styles.inputClass} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
        />

        {/* Clear Button - Only visible when text exists */}
        {searchQuery && (
            <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 flex items-center justify-center"
                aria-label="Clear search"
            >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        )}
    </div>

    <div className={`h-[90%] ${isCompact ? 'pt-1' : 'pt-3'}`}>
        <Layers selectedType={selectedType} setSelectedType={setSelectedType} searchQuery={searchQuery} isDemo={isDemo} />
    </div>
</div>

        <div className={`px-3 pb-3 bg-[#18181b] shrink-0 relative z-30 ${isCompact ? "rounded-b-2xl" : "rounded-b-4xl"}`}>
           <div className={`w-full h-px bg-white/5 ${styles.dividerMargin}`} />
           <div
            className={`flex ${styles.sectionPadding} items-center justify-center gap-2 cursor-pointer relative overflow-hidden group bg-zinc-800 text-white border-t-2 border-white/10 rounded-full`}
            onClick={() => setShowMapMenu((v) => !v)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className={isCompact ? "w-3.5 h-3.5" : "w-6 h-6"}><g fill="none"><path fill="#fff" d="M2.52 6.84L8.97 5l.53 11.5l-.53 11.49l-6.12 1.99a.684.684 0 0 1-.85-.66V7.5c0-.31.22-.58.52-.66M15.98 7l6.99-2l.53 11.5l-.51 11.5l-7.01 2L15 18.5z"/><path fill="#e6e6e6" d="M15.98 7L8.97 5v22.99L15.98 30zm13.42-.16L22.97 5v23l6.09 1.98c.43.11.85-.22.85-.66V7.5c0-.31-.21-.58-.51-.66"/><path fill="#00a6ed" d="M3.95 8.34L8.97 7L10 16.5L8.97 26l-4.66 1.42a.687.687 0 0 1-.87-.66V9c0-.31.21-.58.51-.66M15.94 9l7.03-1.98L24 16.5l-1.03 9.49l-7.03 2L15 18.5z"/><path fill="#0074ba" d="M15.94 9L8.97 7.02v18.97l6.97 2zm12-.66l-4.97-1.32v19l4.61 1.42c.44.12.87-.21.87-.66V9c0-.31-.21-.58-.51-.66"/></g></svg>
            <p className={`text-white font-medium ${styles.textSize}`}>Map Settings</p>
            <svg className={`text-zinc-400 transition-transform ${showMapMenu ? 'rotate-90' : '-rotate-90'} ${isCompact ? "w-2.5 h-2.5" : "w-3 h-3"}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {showMapMenu && (
        <div
          className="rounded-lg text-white p-1 bg-white/2.5 border border-white/50 backdrop-blur-sm 
            shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
            transition-all duration-300 
            before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
            after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased"
          style={{ position: "fixed", left: isCompact ? 220 : 330, bottom: 16, zIndex: 60, minWidth: isCompact ? 120 : 160 }}
        >
          {[{id: 'satellite', label: 'Satellite', icon: styleIcons.satellite}, {id: 'light', label: 'Light', icon: styleIcons.light}, {id: 'basic', label: 'Basic', icon: styleIcons.basic}].map((style) => (
             <button
             key={style.id}
             type="button"
             className={`w-full text-left flex items-center hover:bg-white/10 rounded-md transition-colors ${isCompact ? "px-2 py-1 gap-2" : "px-3 py-2 gap-3"}`}
             onClick={() => { 
               if(style.id === 'satellite') window.mapxSetSatellite && window.mapxSetSatellite(); 
               else window.mapxSetStyle && window.mapxSetStyle(style.id);
               setShowMapMenu(false); 
             }}
           >
             <img src={style.icon} alt={style.label} className={`rounded border border-white/30 object-cover ${isCompact ? "w-6 h-4" : "w-8 h-6"}`} />
             <span className={styles.textSize}>{style.label}</span>
           </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const Closed = ({ setIsOpen }) => {
    const glassStyle = "bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased";
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    if (window.innerHeight < 600 && window.innerWidth > window.innerHeight) setIsCompact(true);
  }, []);

  return (
    <motion.div 
          className={`h-[calc(100vh-0.5rem)] mr-1 rounded-r-3xl overflow-hidden flex flex-col items-center justify-start pt-[25px] ${glassStyle}`}
          initial={{ width: 60 }}
          animate={{ width: isCompact ? 50 : 60 }}
          exit={{ opacity: 0 }}
        >
      <div
        onClick={() => setIsOpen(true)}
        className="cursor-pointer z-10 p-2 hover:scale-110 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 20 20" className={isCompact ? "w-5 h-5" : "w-[30px] h-[30px]"}>
           <path fill="#fff" d="M12.5 3v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3h9.25zm4.25 0H14v14h2.75a2.25 2.25 0 0 0 2.25-2.25v-9.5a2.25 2.25 0 0 0-2.25-2.25z"/>
        </svg>
      </div>
    </motion.div>
  );
};

const LeftPanel = ({ isDemo }) => { 
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [eraserMode, setEraserMode] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const styleIconsRef = useRef({ satellite: satelliteIcon, basic: basicIcon, light: lightIcon, dark: darkIcon }).current;

  useEffect(() => {
    window.mapxOnModeChanged = (mode) => { try { setSelectedMode(mode); } catch (_) {} };
    return () => { try { delete window.mapxOnModeChanged; } catch (_) {} };
  }, []);

  return (
    <div className="fixed left-0 top-0 h-full z-50 flex items-center">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <Open 
            key="open" 
            setIsOpen={setIsOpen} 
            selectedMode={selectedMode} 
            setSelectedMode={setSelectedMode} 
            setSelectedFeature={setSelectedFeature} 
            eraserMode={eraserMode} 
            setEraserMode={setEraserMode}
            styleIcons={styleIconsRef}
            isDemo={isDemo} 
          />
        ) : (
          <Closed key="closed" setIsOpen={setIsOpen} isDemo={isDemo} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeftPanel;