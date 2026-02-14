import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom"; // <-- Added for the login button

// --- NOTE IMAGES ---
import noteYellow from '../../assets/Notes/yellow.png';
import noteBlue from '../../assets/Notes/blue.png';
import noteWhite from '../../assets/Notes/white.png';
import notePink from '../../assets/Notes/pink.png';
import noteGreen from '../../assets/Notes/green.png';
import notePurple from '../../assets/Notes/purple.png';

// --- HIGHLIGHTER IMAGES ---
import hlYellow from '../../assets/Highlighter/yellow.png';
import hlGreen from '../../assets/Highlighter/green.png';
import hlBlue from '../../assets/Highlighter/blue.png';
import hlPink from '../../assets/Highlighter/pink.png';

// --- SHAPES ICON ---
import shapes from '../../assets/icons/shapes.png';

// --- Configuration ---
const NOTE_OPTIONS = [
  { id: "#FFE299", src: noteYellow },
  { id: "#A8DAFF", src: noteBlue },
  { id: "#ffffff", src: noteWhite },
  { id: "#FFAFA3", src: notePink },
  { id: "#B3EFBD", src: noteGreen },
  { id: "#D3BDFF", src: notePurple },
];

const HIGHLIGHTER_OPTIONS = [
  { color: "#FFFF00", src: hlYellow },
  { color: "#00FF00", src: hlGreen },
  { color: "#00FFFF", src: hlBlue },
  { color: "#FF00FF", src: hlPink },
];

// --- COMPONENTS ---

const ToolRow = ({ label, isActive, children, onClick, isCompact }) => (
  <div 
    className={`flex items-center justify-between w-full group cursor-pointer ${isCompact ? 'py-0 h-5' : 'py-1'}`}
    onClick={onClick}
  >
    <span 
      className={`
        font-medium transition-colors duration-200 select-none flex-1 text-left
        ${isCompact ? "text-[8px] leading-none" : "text-sm"}
        ${isActive ? "text-white" : "text-white/40 group-hover:text-white/90"}
      `}
    >
      {label}
    </span>
    
    <div className={`relative shrink-0 ${isCompact ? 'ml-0.5' : 'ml-4'}`}>
      {children}
    </div>
  </div>
);

const ToolButton = ({ icon: Icon, label, isActive, onClick, isCompact }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className={`
      group relative flex items-center justify-center rounded-full transition-all duration-200 shrink-0
      ${isCompact ? "w-5 h-5" : "w-12 h-12"}
      ${isActive ? "bg-white/10 shadow-sm ring-1 ring-white/10" : "hover:bg-white/5"}
    `}
    title={label}
  >
    <div className={`flex items-center justify-center transition-opacity ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
      <div className={`flex items-center justify-center ${isCompact ? "[&_img]:!w-3 [&_img]:!h-3 [&_svg]:!w-3 [&_svg]:!h-3" : "[&_img]:w-6 [&_img]:h-6 [&_svg]:w-6 [&_svg]:h-6"}`}>
         <Icon />
      </div>
    </div>
  </button>
);

const PopupContainer = ({ children, anchorRect, align = "top", onClose, isCompact }) => {
  if (!anchorRect) return null;

  const offset = isCompact ? 4 : 14;
  const left = anchorRect.right + offset; 
  let top = anchorRect.top;
  
  if (align === "top") {
    const shift = isCompact ? 6 : 28;
    top = anchorRect.top - shift; 
  }

  if (align === "bottom") top = anchorRect.top - 100; 

  return createPortal(
    <>
        <div className="fixed inset-0 z-[9998] bg-transparent" onClick={onClose} />
        <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -5 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -5 }}
            style={{ 
                position: 'fixed',
                left: left,
                top: align === "bottom" ? undefined : top, 
                bottom: align === "bottom" ? (window.innerHeight - anchorRect.bottom) : undefined,
            }}
            className={`
                bg-zinc-900 border border-white/10 rounded-xl shadow-xl flex flex-col z-[9999] backdrop-blur-xl origin-left
                ${isCompact ? "p-0.5 gap-0.5 min-w-[20px]" : "p-3 gap-3 min-w-[50px]"}
            `}
            onClick={(e) => e.stopPropagation()} 
        >
        {children}
        </motion.div>
    </>,
    document.body
  );
};

// --- MAIN TOOLS COMPONENT ---
const Tools = ({ 
  selectedMode, 
  handleToolClick, 
  handleShapeClick, 
  Icons,
  isDemo // <-- ADDED isDemo prop here
}) => {
  const navigate = useNavigate(); // <-- Initialize navigation
  const [activePopup, setActivePopup] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState(null);
  
  // --- JS DETECTION STATE ---
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

  const onMainToolClick = (tool, e) => {
    // Completely disable clicking if in demo mode
    if (isDemo) return; 

    const target = e ? e.currentTarget : null;
    if (['pencil', 'highlight', 'note', 'shapes'].includes(tool)) {
      if (activePopup === tool) {
        setActivePopup(null);
        setPopupAnchor(null);
      } else {
        if (target) {
            const rect = target.getBoundingClientRect();
            setPopupAnchor(rect);
        }
        setActivePopup(tool);
      }
    } else {
      handleToolClick(tool);
      setActivePopup(null);
    }
  };

  const closePopup = () => setActivePopup(null);

  const popupItemClass = `flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer transition-colors ${isCompact ? "w-5 h-5" : "w-10 h-10"}`;
  
  const IconWrapper = ({ children }) => (
    <div className={`w-full h-full flex items-center justify-center ${isCompact ? "[&_img]:!w-3 [&_img]:!h-3 [&_svg]:!w-3 [&_svg]:!h-3" : ""}`}>
      {children}
    </div>
  );

  return (
    <div className="relative flex flex-col items-center w-full">
      
      {/* --- DEMO BLUR OVERLAY & BUTTON --- */}
      {isDemo && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-b-xl overflow-hidden">
           {/* Glass backdrop that blurs the tools beneath it */}
           <div className="absolute inset-0 backdrop-blur-[3px] bg-zinc-900/40"></div>
           
           {/* Floating Login Button */}
           <button 
             onClick={() => navigate('/myProjects')}
             className={`relative z-10 flex items-center justify-center gap-2 bg-[#9EFAA5] text-black font-bold rounded-full shadow-[0_4px_15px_rgba(158,250,165,0.25)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all duration-300 ${isCompact ? "px-3 py-1.5 text-[9px]" : "px-4 py-2.5 text-xs"}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" width={isCompact ? "12" : "14"} height={isCompact ? "12" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
               <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
             </svg>
             <span>Login to Unlock</span>
           </button>
        </div>
      )}

      {/* --- TOOLS LIST (Dimmed and unclickable if in demo mode) --- */}
      <div className={`flex flex-col relative z-40 w-full ${isCompact ? "gap-0 px-0.5 pl-1.5" : "gap-4 px-2 pl-8"} ${isDemo ? "opacity-50 pointer-events-none select-none" : ""}`}>
        
        {/* 1. Pencil */}
        <ToolRow label="Pencil" isActive={selectedMode === 'pencil' || (selectedMode === 'eraser' && activePopup === 'pencil')} onClick={(e) => onMainToolClick('pencil', e)} isCompact={isCompact}>
          <ToolButton icon={Icons.PencilSvg} label="Pencil" isActive={selectedMode === 'pencil' || (selectedMode === 'eraser' && activePopup === 'pencil')} onClick={(e) => onMainToolClick('pencil', e)} isCompact={isCompact} />
          <AnimatePresence>
            {activePopup === 'pencil' && !isDemo && (
              <PopupContainer align="top" anchorRect={popupAnchor} onClose={closePopup} isCompact={isCompact}>
                <div className={`${popupItemClass} ${selectedMode === 'pencil' ? 'bg-white/10' : ''}`} onClick={() => { handleToolClick('pencil'); closePopup(); }} title="Pencil">
                     <IconWrapper><Icons.PencilSvg /></IconWrapper>
                </div>
                <div className={`${popupItemClass} ${selectedMode === 'eraser' ? 'bg-white/10' : ''}`} onClick={() => { handleToolClick('eraser'); closePopup(); }} title="Eraser">
                     <IconWrapper><Icons.EraserSvg /></IconWrapper>
                </div>
              </PopupContainer>
            )}
          </AnimatePresence>
        </ToolRow>

        {/* 2. Highlighter */}
        <ToolRow label="Highlight" isActive={selectedMode === 'highlight'} onClick={(e) => onMainToolClick('highlight', e)} isCompact={isCompact}>
          <ToolButton 
            icon={() => <div className="-rotate-45 transform origin-center flex items-center justify-center"><Icons.HighlighterSvg /></div>}
            label="Highlight" isActive={selectedMode === 'highlight'} onClick={(e) => onMainToolClick('highlight', e)} isCompact={isCompact} 
          />
          <AnimatePresence>
            {activePopup === 'highlight' && !isDemo && (
              <PopupContainer align="top" anchorRect={popupAnchor} onClose={closePopup} isCompact={isCompact}>
                <div className={`flex flex-col ${isCompact ? "gap-0.5" : "gap-3"}`}>
                    {HIGHLIGHTER_OPTIONS.map((opt) => (
                    <div key={opt.color} className={`${isCompact ? "w-5 h-5" : "w-10 h-10"} rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center`} onClick={() => { handleToolClick('highlight', opt.color); closePopup(); }}>
                        <img src={opt.src} alt="Highlighter" className={`${isCompact ? "!w-3 !h-3" : "w-6 h-6"} object-contain drop-shadow-sm rotate-135`} />
                    </div>
                    ))}
                </div>
                <div className={`w-full h-px bg-white/10 ${isCompact ? "my-0.5" : "my-1"}`} />
                <div className={`${popupItemClass} ${selectedMode === 'eraser' ? 'bg-white/10' : ''}`} onClick={() => { handleToolClick('eraser'); closePopup(); }}>
                    <IconWrapper><Icons.EraserSvg /></IconWrapper>
                </div>
              </PopupContainer>
            )}
          </AnimatePresence>
        </ToolRow>

        {/* 3. Text */}
        <ToolRow label="Text" isActive={selectedMode === 'text'} onClick={() => onMainToolClick('text')} isCompact={isCompact}>
            <ToolButton icon={Icons.TextSvg} label="Text" isActive={selectedMode === 'text'} onClick={() => onMainToolClick('text')} isCompact={isCompact} />
        </ToolRow>

        {/* 4. Notes */}
        <ToolRow label="Notes" isActive={selectedMode === 'note'} onClick={(e) => onMainToolClick('note', e)} isCompact={isCompact}>
          <ToolButton icon={Icons.NoteSvg} label="Notes" isActive={selectedMode === 'note'} onClick={(e) => onMainToolClick('note', e)} isCompact={isCompact} />
          <AnimatePresence>
            {activePopup === 'note' && !isDemo && (
              <PopupContainer align="top" anchorRect={popupAnchor} onClose={closePopup} isCompact={isCompact}>
                  <div className={`flex flex-col ${isCompact ? "gap-0.5" : "gap-3"}`}>
                      {NOTE_OPTIONS.map((opt) => (
                        <div key={opt.id} className={`${isCompact ? "w-5 h-5" : "w-8 h-8"} rounded-full cursor-pointer hover:scale-110 transition-transform shadow-sm`} onClick={() => { handleToolClick('note', opt.id); closePopup(); }}>
                             <img src={opt.src} alt="Note" className={`w-full h-full object-contain drop-shadow-md`} />
                        </div>
                      ))}
                  </div>
              </PopupContainer>
            )}
          </AnimatePresence>
        </ToolRow>

        {/* 5. Hyperlink */}
        <ToolRow label="Link" isActive={selectedMode === 'hyperlink'} onClick={() => onMainToolClick('hyperlink')} isCompact={isCompact}>
            <ToolButton icon={Icons.HyperlinkSvg} label="Link" isActive={selectedMode === 'hyperlink'} onClick={() => onMainToolClick('hyperlink')} isCompact={isCompact} />
        </ToolRow>

        {/* 6. Image */}
        <ToolRow label="Image" isActive={selectedMode === 'image'} onClick={() => onMainToolClick('image')} isCompact={isCompact}>
            <ToolButton icon={Icons.ImageSvg} label="Image" isActive={selectedMode === 'image'} onClick={() => onMainToolClick('image')} isCompact={isCompact} />
        </ToolRow>

        {/* 7. Shapes */}
        <ToolRow label="Shapes" isActive={['line', 'arrow', 'circle', 'polygon'].includes(selectedMode)} onClick={(e) => onMainToolClick('shapes', e)} isCompact={isCompact}>
            <ToolButton icon={() => <img src={shapes} alt="Shapes" className={`object-contain ${isCompact ? "!w-3 !h-3" : "w-full h-full"}`} />} label="Shapes" isActive={['line', 'arrow', 'circle', 'polygon'].includes(selectedMode)} onClick={(e) => onMainToolClick('shapes', e)} isCompact={isCompact} />
            <AnimatePresence>
                {activePopup === 'shapes' && !isDemo && (
                <PopupContainer align="bottom" anchorRect={popupAnchor} onClose={closePopup} isCompact={isCompact}>
                    <div className={`flex flex-col ${isCompact ? "gap-0.5" : "gap-3"}`}>
                        {['line', 'arrow', 'circle', 'polygon'].map((shape) => (
                             <div key={shape} onClick={() => { handleShapeClick(shape); closePopup(); }} className={`${popupItemClass} ${selectedMode === shape ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`} title={shape}>
                                <div className={`${isCompact ? "w-3 h-3" : "w-6 h-6"}`}>
                                    {shape === 'line' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="22" x2="22" y2="2" /></svg>}
                                    {shape === 'arrow' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                                    {shape === 'circle' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
                                    {shape === 'polygon' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 6-4 14H6L2 8z"/></svg>}
                                </div>
                            </div>
                        ))}
                    </div>
                </PopupContainer>
                )}
            </AnimatePresence>
        </ToolRow>

      </div>
    </div>
  );
};

export default Tools;