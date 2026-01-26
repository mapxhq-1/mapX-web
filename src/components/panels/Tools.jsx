import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

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

// --- Styled Components ---

const ToolRow = ({ label, isActive, children, onClick }) => (
  // CHANGED: justify-end -> justify-center to align Label and Icon in the middle
  <div 
    className="flex items-center justify-center gap-4 w-full group cursor-pointer" 
    onClick={onClick}
  >
    <span 
      className={`
        text-sm font-medium transition-colors duration-200 select-none
        ${isActive ? "text-white" : "text-white/40 group-hover:text-white/90"}
      `}
    >
      {label}
    </span>
    {/* Wrapper for the button */}
    <div className="relative">
      {children}
    </div>
  </div>
);

const ToolButton = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation(); // Prevents bubbling to Row (avoids double trigger)
      onClick(e);          // Fires the specific handler
    }}
    className={`
      group relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 shrink-0
      ${isActive ? "bg-white/10 shadow-sm ring-1 ring-white/10" : "hover:bg-white/5"}
    `}
    title={label}
  >
    <div className={`flex items-center justify-center transition-opacity ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
      <Icon />
    </div>
  </button>
);

// Uses Portals to render outside the hidden overflow container
const PopupContainer = ({ children, anchorRect, align = "top", onClose }) => {
  if (!anchorRect) return null;

  const left = anchorRect.right + 14; 
  let top = anchorRect.top;
  
  if (align === "top") {
    top = anchorRect.top - 28; 
  }

  // Fallback top adjustment if needed
  if (align === "bottom") top = anchorRect.top - 100; 

  return createPortal(
    <>
        <div 
            className="fixed inset-0 z-[9998] bg-transparent" 
            onClick={onClose} 
        />
        <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -10 }}
            style={{ 
                position: 'fixed',
                left: left,
                top: align === "bottom" ? undefined : top, 
                bottom: align === "bottom" ? (window.innerHeight - anchorRect.bottom) : undefined,
            }}
            className={`
                bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl flex flex-col gap-3 min-w-[50px] z-[9999] backdrop-blur-xl
                origin-left
            `}
            onClick={(e) => e.stopPropagation()} 
        >
        {children}
        </motion.div>
    </>,
    document.body
  );
};

const Tools = ({ 
  selectedMode, 
  handleToolClick, 
  handleShapeClick, 
  Icons 
}) => {
  const [activePopup, setActivePopup] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState(null);

  const onMainToolClick = (tool, e) => {
    
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

  return (
    <div className="relative flex flex-col items-center w-full">
      
      <div className="flex flex-col gap-4 relative z-40 w-full px-2 pl-8">
        
        {/* 1. Pencil */}
        <ToolRow 
          label="Pencil" 
          isActive={selectedMode === 'pencil' || (selectedMode === 'eraser' && activePopup === 'pencil')}
          onClick={(e) => onMainToolClick('pencil', e)}
        >
          <ToolButton 
            icon={Icons.PencilSvg} 
            label="Pencil" 
            isActive={selectedMode === 'pencil' || (selectedMode === 'eraser' && activePopup === 'pencil')} 
            // ADDED: Explicit handler for icon click
            onClick={(e) => onMainToolClick('pencil', e)} 
          />
          <AnimatePresence>
            {activePopup === 'pencil' && (
              <PopupContainer 
                align="top" 
                anchorRect={popupAnchor} 
                onClose={closePopup}
              >
                <div 
                  className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer ${selectedMode === 'pencil' ? 'bg-white/10' : ''}`}
                  onClick={() => { handleToolClick('pencil'); closePopup(); }}
                  title="Pencil"
                >
                   <Icons.PencilSvg />
                </div>
                <div 
                  className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer ${selectedMode === 'eraser' ? 'bg-white/10' : ''}`}
                  onClick={() => { handleToolClick('eraser'); closePopup(); }}
                  title="Eraser"
                >
                   <Icons.EraserSvg />
                </div>
              </PopupContainer>
            )}
          </AnimatePresence>
        </ToolRow>

        {/* 2. Highlighter */}
        <ToolRow
          label="Highlight"
          isActive={selectedMode === 'highlight'}
          onClick={(e) => onMainToolClick('highlight', e)}
        >
          <ToolButton 
            icon={() => (
                <div className="-rotate-45 transform origin-center flex items-center justify-center">
                    <Icons.HighlighterSvg />
                </div>
            )}
            label="Highlight" 
            isActive={selectedMode === 'highlight'} 
            // ADDED: Explicit handler for icon click
            onClick={(e) => onMainToolClick('highlight', e)} 
          />
          <AnimatePresence>
            {activePopup === 'highlight' && (
              <PopupContainer align="top" anchorRect={popupAnchor} onClose={closePopup}>
                <div className="flex flex-col gap-3">
                    {HIGHLIGHTER_OPTIONS.map((opt) => (
                    <div 
                        key={opt.color}
                        className="w-10 h-10 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                        onClick={() => { 
                            handleToolClick('highlight', opt.color); 
                            closePopup(); 
                        }}
                    >
                        <img 
                            src={opt.src} 
                            alt="Highlighter" 
                            className="w-6 h-6 object-contain drop-shadow-sm rotate-135" 
                        />
                    </div>
                    ))}
                </div>
                <div className="w-full h-px bg-white/10 my-1" />
                <div 
                  className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer ${selectedMode === 'eraser' ? 'bg-white/10' : ''}`}
                  onClick={() => { handleToolClick('eraser'); closePopup(); }}
                >
                   <Icons.EraserSvg />
                </div>
              </PopupContainer>
            )}
          </AnimatePresence>
        </ToolRow>

        {/* 3. Text */}
        <ToolRow
          label="Text"
          isActive={selectedMode === 'text'}
          onClick={() => onMainToolClick('text')}
        >
            <ToolButton 
              icon={Icons.TextSvg} 
              label="Text" 
              isActive={selectedMode === 'text'} 
              // ADDED: Explicit handler for icon click
              onClick={() => onMainToolClick('text')} 
            />
        </ToolRow>

        {/* 4. Notes */}
        <ToolRow
          label="Notes"
          isActive={selectedMode === 'note'}
          onClick={(e) => onMainToolClick('note', e)}
        >
          <ToolButton 
            icon={Icons.NoteSvg} 
            label="Notes" 
            isActive={selectedMode === 'note'} 
            // ADDED: Explicit handler for icon click
            onClick={(e) => onMainToolClick('note', e)} 
          />
          <AnimatePresence>
            {activePopup === 'note' && (
              <PopupContainer align="top" anchorRect={popupAnchor} onClose={closePopup}>
                  <div className="flex flex-col gap-3">
                     {NOTE_OPTIONS.map((opt) => (
                        <div 
                            key={opt.id}
                            className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-sm"
                            onClick={() => { 
                                handleToolClick('note', opt.id); 
                                closePopup(); 
                            }}
                        >
                             <img 
                                 src={opt.src} 
                                 alt="Note" 
                                 className="w-full h-full object-contain drop-shadow-md" 
                             />
                        </div>
                     ))}
                  </div>
              </PopupContainer>
            )}
          </AnimatePresence>
        </ToolRow>

        {/* 5. Hyperlink */}
        <ToolRow
          label="Link"
          isActive={selectedMode === 'hyperlink'}
          onClick={() => onMainToolClick('hyperlink')}
        >
            <ToolButton 
              icon={Icons.HyperlinkSvg} 
              label="Link" 
              isActive={selectedMode === 'hyperlink'} 
              // ADDED: Explicit handler for icon click
              onClick={() => onMainToolClick('hyperlink')} 
            />
        </ToolRow>

        {/* 6. Image */}
        <ToolRow
          label="Image"
          isActive={selectedMode === 'image'}
          onClick={() => onMainToolClick('image')}
        >
            <ToolButton 
              icon={Icons.ImageSvg} 
              label="Image" 
              isActive={selectedMode === 'image'} 
              // ADDED: Explicit handler for icon click
              onClick={() => onMainToolClick('image')} 
            />
        </ToolRow>

        {/* 7. Shapes */}
        <ToolRow
          label="Shapes"
          isActive={['line', 'arrow', 'circle', 'polygon'].includes(selectedMode)}
          onClick={(e) => onMainToolClick('shapes', e)}
        >
            <ToolButton 
                icon={() => <img src={shapes} alt="Shapes" width="24" height="24" className="object-contain" />}
                label="Shapes" 
                isActive={['line', 'arrow', 'circle', 'polygon'].includes(selectedMode)} 
                // ADDED: Explicit handler for icon click
                onClick={(e) => onMainToolClick('shapes', e)} 
            />
            <AnimatePresence>
                {activePopup === 'shapes' && (
                <PopupContainer align="bottom" anchorRect={popupAnchor} onClose={closePopup}>
                    <div className="flex flex-col gap-3">
                        {['line', 'arrow', 'circle', 'polygon'].map((shape) => (
                             <div 
                                key={shape}
                                onClick={() => { handleShapeClick(shape); closePopup(); }}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer
                                    ${selectedMode === shape ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}
                                `}
                                title={shape}
                            >
                                <div className="w-6 h-6">
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