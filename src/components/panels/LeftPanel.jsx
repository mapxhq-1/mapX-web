import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Components
import Layers from "./Layers";
import Tools from "./Tools";

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

// --- Design Tokens ---
const STYLES = {
  glassPanel: "bg-[#18181b]/95 backdrop-blur-2xl border-r border-white/5", 
  etchedLine: "border-b border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]",
  inputGlass: "bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-white/10 transition-colors w-full",
  actionBtn: "h-11 flex items-center justify-center rounded-xl cursor-pointer transition-all border border-transparent active:scale-95 z-20 relative",
  // Updated Active style to match the popup background exactly
  actionBtnActive: "bg-zinc-800 text-white border-white/10 shadow-lg", 
  actionBtnInactive: "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white",
};

const ToolIcons = {
  SelectSvg: () => <img src={selectIcon} alt="Select" width="24" height="24" className="object-contain" />,
  HandSvg: () => <img src={handIcon} alt="Hand" width="24" height="24" className="object-contain" />,
  PencilSvg: () => <img src={pencilIcon} alt="Pencil" width="30" height="30" className="object-contain" />,
  HighlighterSvg: () => <img src={highlighterIcon} alt="Highlighter" width="22" height="22" className="object-contain rotate-180" />,
  EraserSvg: () => <img src={eraserIcon} alt="Eraser" width="30" height="30" className="object-contain" />,
  NoteSvg: () => <img src={noteIcon} alt="Notes" width="24" height="24" className="object-contain" />,
  TextSvg: () => <img src={textIcon} alt="Text" width="22" height="22" className="object-contain" />,
  HyperlinkSvg: () => <img src={hyperlinkIcon} alt="Hyperlink" width="24" height="24" className="object-contain" />,
  ImageSvg: () => <img src={imageIcon} alt="Image" width="24" height="24" className="object-contain" />,
};

// --- Main Components ---

const Open = ({ setIsOpen, selectedMode, setSelectedMode, setEraserMode, styleIcons }) => {
  const navigate = useNavigate();
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const panelRef = useRef(null);
  const [menuLeftPx, setMenuLeftPx] = useState(312);

  useEffect(() => {
    const update = () => {
      try {
        if (!panelRef.current) return;
        const r = panelRef.current.getBoundingClientRect();
        setMenuLeftPx(r.right + 10); 
      } catch (_) {}
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

  return (
    <motion.div 
      ref={panelRef}
      className="relative z-50 h-[calc(100vh-0.5rem)] m-1 flex"
      initial={{ width: 60, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={`w-full h-full flex flex-col justify-between overflow-hidden rounded-4xl shadow-2xl ${STYLES.glassPanel}`}>
        
        {/* --- 1. HEADER & SEARCH --- */}
        <div className="flex flex-col shrink-0">
          <div className={`px-6 py-6 flex items-center justify-between ${STYLES.etchedLine}`}>
            <p className="font-bold potta-one text-white text-xl tracking-widest">Happy Dyno</p>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/")} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border-t border-white/10 hover:bg-zinc-700 transition-all duration-200 active:scale-95">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="rotate-180"><g fill="none" stroke="currentColor" strokeWidth="0.5"><rect width="20" height="18" x={2} y={3} rx={3} strokeLinecap="round" strokeLinejoin="round"></rect><path d="M15 3v18"></path></g></svg>
              </button>
            </div>
          </div>
          <div className="px-4 py-6">
            <div className="relative">
               <svg className="absolute left-3 top-2.5 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
               <input type="text" placeholder="Search for layers" className={`pl-10 ${STYLES.inputGlass}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={`px-6 flex items-center justify-between ${STYLES.etchedLine}`}></div>
        
        {/* --- 2. MIDDLE SECTION --- */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 min-h-0 relative">
             <div className="h-full pt-3">
               <Layers searchQuery={searchQuery} />
             </div>
        </div>

        {/* --- 3. BOTTOM CONTROLS & FOOTER --- */}
        <div className="p-3 bg-[#18181b] shrink-0 relative z-30">
           <div className={`w-full h-px bg-white/5 mb-3`} />
           
           <div className="flex gap-2 mb-3 relative">
              
              {/* --- "PULL UP" TOOLS SECTION --- */}
              {/* --- WRAPPER FOR TOOLS BUTTON + POPUP --- */}
              <div className="relative flex-1 group">
                  
                  {/* 1. THE "PEEKING" TAB (Visible when CLOSED) */}
                  {/* Now styled with bg-zinc-800 and borders to look like a physical tab card */}
                  <AnimatePresence>
                    {!showTools && (
                        <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            // -top-2 positions it just behind the button. z-0 keeps it behind.
                            className="absolute -top-2 left-0 right-0 h-13 bg-zinc-800 border border-white/10 border-b-0 rounded-xl flex items-start justify-center pt-1.5 z-0 cursor-pointer group-hover:-top-3 transition-all duration-300"
                        >
                            {/* The Grip Handle Line */}
                            <div className="w-8 h-1 bg-zinc-500 rounded-full opacity-50" />
                        </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 2. THE BANNER POPUP (Visible when OPEN) */}
                  <AnimatePresence>
                    {showTools && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            // Matches the tab style exactly
                            className="absolute bottom-full left-0 w-full bg-zinc-800 border border-white/10 border-b-0 rounded-t-xl rounded-b-none shadow-2xl overflow-hidden z-10"
                        >
                            {/* Grip handle inside (Matches the closed tab visually) */}
                            <div 
                                className="w-full h-6 flex items-start justify-center pt-1.5 cursor-pointer hover:bg-zinc-700 transition-colors"
                                onClick={() => setShowTools(false)}
                            >
                                <div className="w-8 h-1 bg-zinc-500 rounded-full opacity-50" />
                            </div>

                            <div className="p-2 pb-2">
                                <Tools 
                                    selectedMode={selectedMode} 
                                    handleToolClick={handleToolClick}
                                    handleShapeClick={handleShapeClick}
                                    Icons={ToolIcons}
                                />
                            </div>
                        </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 3. THE MAIN BUTTON (Base) */}
                  <div 
                    onClick={() => setShowTools(!showTools)}
                    className={`
                        w-full ${STYLES.actionBtn} px-4 font-medium text-sm relative z-20 
                        /* Always Dark Background to match the tab/popup */
                        bg-zinc-800 text-white border-white/10 shadow-lg
                        ${showTools 
                            ? 'rounded-t-none rounded-b-xl border-t-0' // Connects to popup
                            : 'rounded-xl border'                      // Standard button
                        }
                    `}
                  >
                    Tools
                  </div>
              </div>

              <div 
                onClick={() => handleToolClick('hand')}
                className={`w-11 ${STYLES.actionBtn} ${selectedMode === 'hand' ? STYLES.actionBtnActive : STYLES.actionBtnInactive}`}
              >
                <div className="w-5 h-5"><ToolIcons.HandSvg /></div>
              </div>
              <div 
                onClick={() => handleToolClick('select')}
                className={`w-11 ${STYLES.actionBtn} ${selectedMode === 'select' ? STYLES.actionBtnActive : STYLES.actionBtnInactive}`}
              >
                <div className="w-5 h-5"><ToolIcons.SelectSvg /></div>
              </div>
           </div>

           <div
            className="flex p-3 items-center justify-center gap-4 rounded-lg cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 relative overflow-hidden group"
            onClick={() => setShowMapMenu((v) => !v)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tl from-white/20 to-transparent opacity-50 pointer-events-none" />
            
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><g fill="none"><path fill="#fff" d="M2.52 6.84L8.97 5l.53 11.5l-.53 11.49l-6.12 1.99a.684.684 0 0 1-.85-.66V7.5c0-.31.22-.58.52-.66M15.98 7l6.99-2l.53 11.5l-.51 11.5l-7.01 2L15 18.5z"/><path fill="#e6e6e6" d="M15.98 7L8.97 5v22.99L15.98 30zm13.42-.16L22.97 5v23l6.09 1.98c.43.11.85-.22.85-.66V7.5c0-.31-.21-.58-.51-.66"/><path fill="#00a6ed" d="M3.95 8.34L8.97 7L10 16.5L8.97 26l-4.66 1.42a.687.687 0 0 1-.87-.66V9c0-.31.21-.58.51-.66M15.94 9l7.03-1.98L24 16.5l-1.03 9.49l-7.03 2L15 18.5z"/><path fill="#0074ba" d="M15.94 9L8.97 7.02v18.97l6.97 2zm12-.66l-4.97-1.32v19l4.61 1.42c.44.12.87-.21.87-.66V9c0-.31-.21-.58-.51-.66"/></g></svg>
            <p className="text-white font-medium text-base">Map Settings</p>
            <svg className={`text-zinc-400 transition-transform ${showMapMenu ? 'rotate-90' : '-rotate-90'}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
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
          style={{ position: "fixed", left: menuLeftPx, bottom: 16, zIndex: 60, minWidth: 160 }}
        >
          {[{id: 'satellite', label: 'Satellite', icon: styleIcons.satellite}, {id: 'light', label: 'Light', icon: styleIcons.light}, {id: 'basic', label: 'Basic', icon: styleIcons.basic}].map((style) => (
             <button
             key={style.id}
             type="button"
             className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 rounded-md transition-colors"
             onClick={() => { 
               if(style.id === 'satellite') window.mapxSetSatellite && window.mapxSetSatellite(); 
               else window.mapxSetStyle && window.mapxSetStyle(style.id);
               setShowMapMenu(false); 
             }}
           >
             <img src={style.icon} alt={style.label} className="w-8 h-6 rounded border border-white/30 object-cover" />
             <span className="text-sm">{style.label}</span>
           </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const crystalGlassStyle = "bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased";
const sidebarVariants = {
  open: {
    width: 300,
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  closed: {
    width: 60,
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};
const Closed = ({ setIsOpen }) => {
  return (
    <motion.div
      className={`relative h-[calc(100vh-0.5rem)] ml-1 rounded-r-3xl overflow-hidden flex flex-col items-center justify-start pt-[25px] ${crystalGlassStyle} w-[60px]`}
      variants={sidebarVariants}
      initial="open"
      animate="closed"
      exit="exit"
    >
      <div
        onClick={() => setIsOpen(true)}
        className="cursor-pointer z-10 p-2 hover:scale-110 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 20 20">
           <path fill="#fff" d="M12.5 3v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3h9.25zm4.25 0H14v14h2.75a2.25 2.25 0 0 0 2.25-2.25v-9.5a2.25 2.25 0 0 0-2.25-2.25z"/>
        </svg>
      </div>
    </motion.div>
  );
};

const LeftPanel = () => {
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
          />
        ) : (
          <Closed key="closed" setIsOpen={setIsOpen} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeftPanel;