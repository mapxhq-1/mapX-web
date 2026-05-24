import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LiquidGlass from "../Chatbot/LiquidGlass";

import { logger } from "../map/utils/activityLogger";

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

// --- CENTER IMAGE ---
import centerImage from '../../assets/icons/feather1.png';

// --- Configuration Arrays ---
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

const SHAPE_OPTIONS = ['line', 'arrow', 'circle', 'polygon'];

const describeArc = (cx, cy, rInner, rOuter, startAngle, endAngle, roundStartOuter = false, roundEndOuter = false) => {
  const cornerRadius = 16;
  const maxDelta = (endAngle - startAngle) / 2.5;
  const requestedDelta = cornerRadius / rOuter;
  const deltaTheta = Math.min(requestedDelta, maxDelta);
  const actualCornerRadius = deltaTheta * rOuter;

  const p1x = cx + rOuter * Math.cos(startAngle);
  const p1y = cy + rOuter * Math.sin(startAngle);
  const p2x = cx + rOuter * Math.cos(endAngle);
  const p2y = cy + rOuter * Math.sin(endAngle);

  const p3x = cx + rInner * Math.cos(endAngle);
  const p3y = cy + rInner * Math.sin(endAngle);
  const p4x = cx + rInner * Math.cos(startAngle);
  const p4y = cy + rInner * Math.sin(startAngle);

  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

  let path = `M ${p4x} ${p4y} `;

  if (roundStartOuter) {
    const p1StraightX = cx + (rOuter - actualCornerRadius) * Math.cos(startAngle);
    const p1StraightY = cy + (rOuter - actualCornerRadius) * Math.sin(startAngle);
    const p1ArcX = cx + rOuter * Math.cos(startAngle + deltaTheta);
    const p1ArcY = cy + rOuter * Math.sin(startAngle + deltaTheta);
    path += `L ${p1StraightX} ${p1StraightY} `;
    path += `Q ${p1x} ${p1y} ${p1ArcX} ${p1ArcY} `;
  } else {
    path += `L ${p1x} ${p1y} `;
  }

  if (roundEndOuter) {
    const p2ArcX = cx + rOuter * Math.cos(endAngle - deltaTheta);
    const p2ArcY = cy + rOuter * Math.sin(endAngle - deltaTheta);
    const p2StraightX = cx + (rOuter - actualCornerRadius) * Math.cos(endAngle);
    const p2StraightY = cy + (rOuter - actualCornerRadius) * Math.sin(endAngle);
    path += `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2ArcX} ${p2ArcY} `;
    path += `Q ${p2x} ${p2y} ${p2StraightX} ${p2StraightY} `;
    path += `L ${p3x} ${p3y} `;
  } else {
    path += `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2x} ${p2y} `;
    path += `L ${p3x} ${p3y} `;
  }

  path += `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4x} ${p4y} Z`;
  return path;
};

// --- MAIN TOOLS COMPONENT ---
const Tools = ({
  selectedMode,
  handleToolClick,
  handleShapeClick,
  Icons,
  isDemo,
  onLoginClick
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const [isCompact, setIsCompact] = useState(false);

  const pointerStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const executeIfClick = (e, action) => {
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) action();
  };

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

  // --- Right-click to disable the current tool ---
  useEffect(() => {
    const handleContextMenu = (e) => {
      if (selectedMode) {
        e.preventDefault(); 
        handleToolClick(null); 
        if (handleShapeClick) handleShapeClick(null);
        setActivePopup(null);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [selectedMode, handleToolClick, handleShapeClick]);

  const PRIMARY_TOOLS = [
    { id: 'note', icon: Icons.NoteSvg, label: 'Note' },
    { id: 'hyperlink', icon: Icons.HyperlinkSvg, label: 'Link' },
    { id: 'image', icon: Icons.ImageSvg, label: 'Image' },
    { id: 'select', icon: Icons.SelectSvg, label: 'Select' },
    { id: 'hand', icon: Icons.HandSvg, label: 'Hand' },
    { id: 'text', icon: Icons.TextSvg, label: 'Text' },
    { id: 'shapes', icon: () => <img src={shapes} alt="Shapes" className="w-full h-full object-contain" />, label: 'Shapes' },
    { id: 'pencil', icon: Icons.PencilSvg, label: 'Draw & Highlight' },
  ];

  const numTools = PRIMARY_TOOLS.length;
  const sliceAngle = (2 * Math.PI) / numTools;
  const sliceDegrees = 360 / numTools;

  const activeIndex = PRIMARY_TOOLS.findIndex(tool => {
    if (activePopup === tool.id) return true;
    if (selectedMode === tool.id) return true;

    if (tool.id === 'pencil' && ['eraser', 'highlight'].includes(selectedMode)) return true;
    if (tool.id === 'shapes' && SHAPE_OPTIONS.includes(selectedMode)) return true;
    if (tool.id === 'note' && NOTE_OPTIONS.some(opt => opt.id === selectedMode)) return true;

    return false;
  });

  const onMainToolClick = (toolId) => {
    if (isDemo) return;

    const isCurrentlyActive = 
      selectedMode === toolId ||
      (toolId === 'pencil' && ['eraser', 'highlight'].includes(selectedMode)) ||
      (toolId === 'shapes' && SHAPE_OPTIONS.includes(selectedMode)) ||
      (toolId === 'note' && NOTE_OPTIONS.some(opt => opt.id === selectedMode));

    if (isCurrentlyActive) {
      handleToolClick(null);
      if (handleShapeClick) handleShapeClick(null);
      setActivePopup(null);
    } else if (['pencil', 'note', 'shapes'].includes(toolId)) {
      setActivePopup(activePopup === toolId ? null : toolId);
    } else {
      // 2. LOG MAIN TOOLS HERE (Direct action tools without submenus)
      logger.logAction("TOOL_OPENED", window.location.pathname, { 
        toolId: toolId 
      });

      handleToolClick(toolId);
      setActivePopup(null);
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setActivePopup(null);
  };

  const MENU_SIZE = isCompact ? 300 : 380;
  const CENTER = MENU_SIZE / 2;

  const CLOSED_BUTTON_SIZE = isCompact ? 60 : 70;
  const OPEN_BUTTON_SIZE = isCompact ? 50 : 60;

  const INNER_RADIUS = OPEN_BUTTON_SIZE / 2;

  const MAIN_OUTER_RADIUS = isCompact ? 65 : 80;
  const SUB_OUTER_RADIUS = isCompact ? 100 : 125;

  const MAIN_ICON_RADIUS = (INNER_RADIUS + MAIN_OUTER_RADIUS) / 2;
  const SUB_ICON_RADIUS = (MAIN_OUTER_RADIUS + SUB_OUTER_RADIUS) / 2;

  const smoothSpin = { type: "spring", stiffness: 150, damping: 18 };

  return (
    <div
      className={`relative flex items-center justify-center transition-all pointer-events-none ${isDemo ? "opacity-60 grayscale" : ""}`}
      style={{ width: CLOSED_BUTTON_SIZE, height: CLOSED_BUTTON_SIZE }}
    >

      <div className="absolute w-0 h-0 opacity-0 overflow-hidden pointer-events-none">
        <LiquidGlass />
      </div>

      {isDemo && isMenuOpen && (
        <div className="absolute top-[-60px] z-[60] flex flex-col items-center justify-center">
          <button
            onClick={()=>onLoginClick("Tools")}
            className="flex items-center justify-center gap-2 bg-[#9EFAA5] text-black font-bold rounded-full px-4 py-2 text-xs shadow-lg hover:scale-105 transition-transform whitespace-nowrap pointer-events-auto"
          >
            Login to Unlock Tools
          </button>
        </div>
      )}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: MENU_SIZE, height: MENU_SIZE }}
      >

        {/* --- MAIN MENU LAYER 1 --- */}
        <motion.div
          initial={false}
          animate={{ opacity: isMenuOpen ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="shadow-2xl overflow-hidden pointer-events-none"
            style={{
              width: MAIN_OUTER_RADIUS * 2,
              height: MAIN_OUTER_RADIUS * 2,
              borderRadius: "50%"
            }}
          >
            <div className="w-[110%] h-[110%] -ml-[5%] -mt-[5%] pointer-events-none">
              <LiquidGlass />
            </div>
          </div>
        </motion.div>

        {/* --- MAIN MENU LAYER 2 --- */}
        <motion.div
          initial={false}
          animate={{
            opacity: isMenuOpen ? 1 : 0,
            scale: isMenuOpen ? 1 : 0,
            rotate: isMenuOpen ? 0 : -180
          }}
          transition={smoothSpin}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ transformOrigin: "center center" }}
        >
          <svg width={MENU_SIZE} height={MENU_SIZE} className="absolute inset-0 overflow-visible pointer-events-none">
            <defs>
              <radialGradient id="pressed-state" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
              </radialGradient>
              
              <filter id="border-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.8">
                  <animate attributeName="flood-opacity" values="0.3; 0.9; 0.3" dur="2s" repeatCount="indefinite" />
                </feDropShadow>
              </filter>
            </defs>

            {activeIndex !== -1 && (
              <motion.g
                initial={false}
                animate={{ rotate: activeIndex * sliceDegrees }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
                style={{ originX: 0.5, originY: 0.5 }}
              >
                <circle cx={CENTER} cy={CENTER} r={MENU_SIZE / 2} fill="transparent" stroke="none" className="pointer-events-none" />
                
                <path 
                  d={describeArc(CENTER, CENTER, INNER_RADIUS, MAIN_OUTER_RADIUS, -Math.PI / 2, -Math.PI / 2 + sliceAngle)} 
                  fill="url(#pressed-state)" 
                  stroke="none" 
                  className={isMenuOpen ? "pointer-events-auto" : "pointer-events-none"} 
                />

                <path 
                  d={describeArc(CENTER, CENTER, INNER_RADIUS, MAIN_OUTER_RADIUS, -Math.PI / 2, -Math.PI / 2 + sliceAngle)} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.7)" 
                  strokeWidth="1.5"                
                  filter="url(#border-glow)"     
                  className="pointer-events-none" 
                />
              </motion.g>
            )}

            <circle cx={CENTER} cy={CENTER} r={MAIN_OUTER_RADIUS - 1} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" className="pointer-events-none"/>
            <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS + 1} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" className="pointer-events-none"/>

            {[...Array(numTools)].map((_, i) => {
              const angle = -Math.PI / 2 + (i * sliceAngle);
              const x1 = CENTER + INNER_RADIUS * Math.cos(angle);
              const y1 = CENTER + INNER_RADIUS * Math.sin(angle);
              const x2 = CENTER + MAIN_OUTER_RADIUS * Math.cos(angle);
              const y2 = CENTER + MAIN_OUTER_RADIUS * Math.sin(angle);
              return <line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" className="pointer-events-none"/>;
            })}
          </svg>

          {PRIMARY_TOOLS.map((tool, index) => {
            const angle = -Math.PI / 2 + (index * sliceAngle) + (sliceAngle / 2);
            const x = CENTER + MAIN_ICON_RADIUS * Math.cos(angle);
            const y = CENTER + MAIN_ICON_RADIUS * Math.sin(angle);
            const isActive = activeIndex === index;
            const iconSize = isCompact ? 26 : 34;

            return (
              <button
                key={tool.id}
                onPointerDown={handlePointerDown}
                onClick={(e) => executeIfClick(e, () => onMainToolClick(tool.id))}
                style={{
                  position: 'absolute', left: x - iconSize / 2, top: y - iconSize / 2,
                  width: iconSize, height: iconSize,
                }}
                className={`
                  z-50 flex items-center justify-center rounded-lg transition-transform hover:scale-110 
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]
                  ${isActive ? "text-[#ffffff] opacity-100 scale-95" : "text-white hover:text-[#d4d4d8]"}
                  ${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"}
                `}
                title={tool.label}
              >
                <div className={`flex items-center justify-center [&_svg]:w-full [&_svg]:h-full ${tool.id === 'pencil' ? 'w-[90%] h-[90%]' : 'w-[70%] h-[70%]'}`}>
                  <tool.icon />
                </div>
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {isMenuOpen && activePopup && (() => {
            const toolIndex = PRIMARY_TOOLS.findIndex(t => t.id === activePopup);
            if (toolIndex === -1) return null;

            let options = [];
            if (activePopup === 'pencil') {
              options = [
                { id: 'pencil', icon: Icons.PencilSvg, isTool: true },
                { id: 'eraser', icon: Icons.EraserSvg, isTool: true },
                ...HIGHLIGHTER_OPTIONS.map(opt => ({ ...opt, isHighlight: true }))
              ];
            }
            if (activePopup === 'note') options = NOTE_OPTIONS;
            if (activePopup === 'shapes') options = SHAPE_OPTIONS;
            if (options.length === 0) return null;

            const sliceMidAngle = -Math.PI / 2 + (toolIndex * sliceAngle) + (sliceAngle / 2);
            const wedgeAngle = Math.PI / 6;
            const startSubAngle = sliceMidAngle - (options.length * wedgeAngle) / 2;

            const wedgeData = options.map((opt, i) => {
              const startA = startSubAngle + i * wedgeAngle;
              const endA = startA + wedgeAngle;
              const isFirstWedge = i === 0;
              const isLastWedge = i === options.length - 1;
              const d = describeArc(CENTER, CENTER, MAIN_OUTER_RADIUS, SUB_OUTER_RADIUS, startA, endA, isFirstWedge, isLastWedge);
              const subMidAngle = startA + wedgeAngle / 2;
              const subX = CENTER + SUB_ICON_RADIUS * Math.cos(subMidAngle);
              const subY = CENTER + SUB_ICON_RADIUS * Math.sin(subMidAngle);
              const subIconSize = isCompact ? 26 : 34;
              const key = opt.id || opt.color || opt;
              return { opt, d, subX, subY, subIconSize, key };
            });

            const totalEndAngle = startSubAngle + (options.length * wedgeAngle);
            const popupBgPath = describeArc(CENTER, CENTER, MAIN_OUTER_RADIUS, SUB_OUTER_RADIUS, startSubAngle, totalEndAngle, true, true);

            return (
              <React.Fragment key={`sub-menu-wrap-${activePopup}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 30 }}
                  transition={smoothSpin}
                  className="absolute inset-0 z-0 pointer-events-none drop-shadow-xl"
                  style={{ transformOrigin: "center center" }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      clipPath: `path('${popupBgPath}')`,
                      WebkitClipPath: `path('${popupBgPath}')`,
                      transform: 'translateZ(0)',
                      willChange: 'transform'
                    }}
                  >
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      <LiquidGlass />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotate: 30 }}
                  transition={smoothSpin}
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{ transformOrigin: "center center" }}
                >
                  <svg width={MENU_SIZE} height={MENU_SIZE} className="absolute inset-0 pointer-events-none overflow-visible">
                    {wedgeData.map((w) => (
                      <path key={`stroke-${w.key}`} d={w.d} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" className="pointer-events-none" />
                    ))}
                  </svg>

                  {wedgeData.map((w) => (
                    <button
                      key={`btn-${w.key}`}
                      onPointerDown={handlePointerDown}
                      onClick={(e) => executeIfClick(e, () => {
                        const isToolActive = 
                          selectedMode === w.opt || 
                          selectedMode === w.opt.id || 
                          (activePopup === 'pencil' && w.opt.isHighlight && selectedMode === 'highlight');

                        if (isToolActive) {
                          if (activePopup === 'shapes') handleShapeClick(null);
                          else handleToolClick(null);
                        } else {
                          // 3. LOG SUB-TOOLS HERE (with colors/shapes attached)
                          if (activePopup === 'shapes') {
                            logger.logAction("TOOL_OPENED", window.location.pathname, { 
                              toolId: 'shapes', 
                              subType: w.opt 
                            });
                            handleShapeClick(w.opt);
                          } 
                          else if (activePopup === 'pencil') {
                            if (w.opt.isTool) {
                              logger.logAction("TOOL_OPENED", window.location.pathname, { 
                                toolId: w.opt.id 
                              });
                              handleToolClick(w.opt.id);
                            }
                            if (w.opt.isHighlight) {
                              logger.logAction("TOOL_OPENED", window.location.pathname, { 
                                toolId: 'highlight', 
                                color: w.opt.color 
                              });
                              handleToolClick('highlight', w.opt.color);
                            }
                          } 
                          else {
                            // Catch-all for Notes 
                            const toolColor = w.opt.color || w.opt.id;
                            logger.logAction("TOOL_OPENED", window.location.pathname, { 
                              toolId: activePopup, 
                              color: toolColor 
                            });
                            handleToolClick(activePopup, toolColor);
                          }
                        }
                        setActivePopup(null);
                      })}
                      style={{
                        position: 'absolute', left: w.subX - w.subIconSize / 2, top: w.subY - w.subIconSize / 2,
                        width: w.subIconSize, height: w.subIconSize,
                      }}
                      className="z-40 flex items-center justify-center hover:scale-110 transition-transform pointer-events-auto drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                    >
                      {activePopup === 'pencil' && w.opt.isTool && (
                        <div className={`flex items-center justify-center [&_svg]:w-full [&_svg]:h-full text-white/90 ${w.opt.id === 'pencil' ? 'w-[90%] h-[90%]' : 'w-[70%] h-[70%]'}`}>
                          <w.opt.icon />
                        </div>
                      )}
                      {activePopup === 'pencil' && w.opt.isHighlight && (
                        <img src={w.opt.src} alt="highlight" className="w-[70%] h-[70%] object-contain rotate-135 pointer-events-none" />
                      )}
                      {activePopup === 'note' && <img src={w.opt.src} alt="note" className="w-[80%] h-[80%] object-contain pointer-events-none" />}
                      {activePopup === 'shapes' && (
                        <div className="w-[70%] h-[70%] text-white/90 pointer-events-none">
                          {w.opt === 'line' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="22" x2="22" y2="2" /></svg>}
                          {w.opt === 'arrow' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                          {w.opt === 'circle' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>}
                          {w.opt === 'polygon' && <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 6-4 14H6L2 8z" /></svg>}
                        </div>
                      )}
                    </button>
                  ))}
                </motion.div>
              </React.Fragment>
            );
          })()}
        </AnimatePresence>

        <motion.button
          onPointerDown={handlePointerDown}
          onClick={(e) => executeIfClick(e, () => {
            setIsMenuOpen(!isMenuOpen);
            if (isMenuOpen) setActivePopup(null);
          })}
          animate={{
            width: isMenuOpen ? OPEN_BUTTON_SIZE : CLOSED_BUTTON_SIZE,
            height: isMenuOpen ? OPEN_BUTTON_SIZE : CLOSED_BUTTON_SIZE,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            position: 'absolute', left: CENTER, top: CENTER,
            x: "-50%", y: "-50%",
            background: 'rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
          className="relative rounded-full flex items-center justify-center z-[55] cursor-pointer pointer-events-auto overflow-hidden active:scale-95"
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            padding: '2px',
            background: `conic-gradient(
              from 200deg,
              rgba(255,255,255,0) 0deg,
              rgba(255,255,255,0.9) 60deg,
              rgba(255,255,255,1) 90deg,
              rgba(255,255,255,0.9) 120deg,
              rgba(255,255,255,0) 160deg,
              rgba(255,255,255,0) 200deg,
              rgba(255,255,255,0.35) 260deg,
              rgba(255,255,255,0.5) 290deg,
              rgba(255,255,255,0.35) 320deg,
              rgba(255,255,255,0) 360deg
            )`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            zIndex: 10,
          }} />

          <div className={`z-10 w-[100%] h-[100%] flex items-center justify-center pointer-events-none transition-all duration-300
            ${isMenuOpen ? "drop-shadow-[0_0_12px_rgba(255,255,255,1)]" : "drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"}
          `}>
            <img src={centerImage} alt="Center tool icon" className="w-[80%] h-[80%] object-contain opacity-80 pointer-events-none" />
          </div>
        </motion.button>

      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-30 pointer-events-auto" onPointerDown={handlePointerDown} onClick={(e) => executeIfClick(e, closeMenu)} />
      )}
    </div>
  );
};

export default Tools;