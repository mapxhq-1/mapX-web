import React, { useEffect, useState, useRef } from "react"; // <-- Added useRef
import { Box, Typography, Button, useMediaQuery } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation'; 
import FullscreenIcon from '@mui/icons-material/Fullscreen'; 

// Shared Components
import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";
import MapLoader from "../loaders/MapLoader"; 
import GalaxyCanvas from "../common/GalaxyCanvas";
import { fetchAllEmpirePolygons } from "../../store/mapSlice";
import { motion } from "framer-motion"; 
import Tools from '../panels/Tools.jsx'
import handIcon from "../../assets/icons/hand_icon.png";
import selectIcon from "../../assets/icons/select_icon.png";

import pencilIcon from "../../assets/icons/pencil_icon.png";
import highlighterIcon from "../../assets/icons/highlighter_icon.png";
import eraserIcon from "../../assets/icons/eraser_icon.png";
import noteIcon from "../../assets/icons/note_icon.png";
import textIcon from "../../assets/icons/text_icon.png";
import hyperlinkIcon from "../../assets/icons/hyperlink_icon.png";
import imageIcon from "../../assets/icons/image_icon.png";

// Chatbot Components
import ResizableWindow from "../Chatbot/ResizableWindow";
import Chat from "../Chatbot/Chat";

export default function DemoLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- NEW: Drag Boundary Ref ---
  const dragBoundaryRef = useRef(null);

  // --- LAYOUT & FULLSCREEN STATE ---
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  const leftWidth = leftExpanded ? 250 : 50;
  const rightWidth = rightExpanded ? 300 : 50;

  const loading = useSelector((state) => state.map.loading);

  // --- DEMO DATA STATE ---
  const [project] = useState({
    name: "Demo Project View",
    description: "Welcome to the interactive demo. Sign in to unlock full features.",
    id: "demo-123"
  });

  // --- MEDIA QUERIES (FROM REFERENCE) ---
  const isMobilePortrait = useMediaQuery('(max-width: 900px) and (orientation: portrait)');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobileLandscape = useMediaQuery('(max-width: 1200px) and (orientation: landscape)');

  // --- DATA FETCHING ---
  useEffect(() => { 
    dispatch(fetchAllEmpirePolygons()); 
  }, [dispatch]);

  // --- FULLSCREEN HANDLERS (ROBUST FIX FROM REFERENCE) ---
  useEffect(() => {
    const checkFullscreenStatus = () => {
      const isFull = 
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement ||
        document.webkitCurrentFullScreenElement;

      setIsFullscreen(!!isFull);
    };

    document.addEventListener("fullscreenchange", checkFullscreenStatus);
    document.addEventListener("webkitfullscreenchange", checkFullscreenStatus);
    document.addEventListener("mozfullscreenchange", checkFullscreenStatus);
    document.addEventListener("MSFullscreenChange", checkFullscreenStatus);

    const intervalId = setInterval(checkFullscreenStatus, 500);
    checkFullscreenStatus();

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreenStatus);
      document.removeEventListener("webkitfullscreenchange", checkFullscreenStatus);
      document.removeEventListener("mozfullscreenchange", checkFullscreenStatus);
      document.removeEventListener("MSFullscreenChange", checkFullscreenStatus);
      clearInterval(intervalId);
    };
  }, []);

    const ToolIcons = {
      SelectSvg: () => <img src={selectIcon} alt="Select" className="w-full h-full object-contain" />,
      HandSvg: () => <img src={handIcon} alt="Hand" className="w-full h-full object-contain" />,
      PencilSvg: () => <img src={pencilIcon} alt="Pencil" className="w-full h-full object-contain" />,
      HighlighterSvg: () => <img src={highlighterIcon} alt="Highlighter" className="w-full h-full object-contain" />,
      EraserSvg: () => <img src={eraserIcon} alt="Eraser" className="w-full h-full object-contain" />,
      NoteSvg: () => <img src={noteIcon} alt="Notes" className="w-full h-full object-contain" />,
      TextSvg: () => <img src={textIcon} alt="Text" className="w-full h-full object-contain" />,
      HyperlinkSvg: () => <img src={hyperlinkIcon} alt="Hyperlink" className="w-full h-full object-contain" />,
      ImageSvg: () => <img src={imageIcon} alt="Image" className="w-full h-full object-contain" />,
    };

    const handleToolClick = (mode, color=null) => {
    setSelectedMode(mode);
    try { window.mapxDrawSetMode && window.mapxDrawSetMode(mode,color); } catch (e) { console.error("Error:", e) }
  };

  const handleShapeClick = (shapeType) => {
    setSelectedMode(shapeType);
    try { window.mapxDrawSetMode && window.mapxDrawSetMode(shapeType); } catch(e){console.error("Error:", e)}
  };

  const handleEnterFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) await element.requestFullscreen();
      else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) await element.msRequestFullscreen();
      
      if (window.screen.orientation && window.screen.orientation.lock) {
        await window.screen.orientation.lock("landscape").catch((e) => console.log(e));
      }
    } catch (error) { console.error(error); }
  };

  const BlockingScreen = ({ icon, title, subtitle, buttonText, onButtonClick }) => (
    <Box sx={{
      height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", backgroundColor: "#000000",
      color: "white", textAlign: "center", p: 3, position: "fixed", top: 0, left: 0, zIndex: 9999
    }}>
      <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }}>
        <GalaxyCanvas />
      </Box>
      <Box sx={{ 
        background: "rgba(20, 20, 20, 0.75)", backdropFilter: "blur(8px)", p: 5, 
        borderRadius: "50px", border: "1px solid rgba(255, 255, 255, 0.08)",
        maxWidth: "90%", boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
      }}>
        {icon}
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>{title}</Typography>
        <Typography variant="body1" sx={{ opacity: 0.7, mb: 3, color: "#fff" }}>{subtitle}</Typography>
        
        {buttonText && (
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<FullscreenIcon />} 
            onClick={onButtonClick}
            sx={{ 
              backgroundColor: "#2e7d32", color: "#ffffff", borderRadius: "50px", px: 4, py: 1.5, 
              fontWeight: "bold", textTransform: "none", borderTop: "2px solid rgba(255, 255, 255, 0.4)", 
            }}
          >
            {buttonText}
          </Button>
        )}
      </Box>
    </Box>
  );

  // --- RENDER LOGIC ---

  // 1. Portrait Warning
  if (isMobilePortrait) {
    return (
      <BlockingScreen 
        title="Rotate Device"
        subtitle={isIOS ? "Please physically rotate your device to landscape." : "Please rotate your device to landscape mode."}
        buttonText={isIOS ? null : "Rotate & Enter"}
        onButtonClick={isIOS ? () => {} : handleEnterFullscreen}
        icon={<ScreenRotationIcon sx={{ fontSize: 70, mb: 2, color: "#ffffff", animation: "spin 3s infinite" }} />}
      />
    );
  }

  // 2. Landscape but NO Fullscreen (Non-iOS)
  if (isMobileLandscape && !isFullscreen && !isIOS) {
    return (
      <BlockingScreen 
        title="Fullscreen Required"
        subtitle="This experience requires fullscreen mode."
        buttonText="Enter Fullscreen"
        onButtonClick={handleEnterFullscreen}
        icon={<FullscreenIcon sx={{ fontSize: 80, mb: 2, color: "#ffffff", animation: "pulse 2s infinite" }} />}
      />
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {/* --- INVISIBLE DRAG BOUNDARY W/ PADDING --- */}
      <div 
        ref={dragBoundaryRef} 
        style={{ position: 'fixed', top: 20, left: 20, right: 20, bottom: 20, pointerEvents: 'none', zIndex: -1 }} 
      />

      {/* chatbot with Demo Prop */}
      <ResizableWindow>
        <Chat isDemo={true} />
      </ResizableWindow>

      <Box sx={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
        
        <MapView leftOffset={leftWidth} rightOffset={rightWidth} isDemo={true} />
        
        <Box id="timeline-overlay" sx={{ position: "absolute", left: leftWidth + 8, right: rightWidth + 8, bottom: 8, zIndex: 15, pointerEvents: "none" }}>
          <Timeline isDemo={true} />
        </Box>
        
        <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, zIndex: 20, pointerEvents: "auto" }}>
          <LeftPanel expanded={leftExpanded} onToggle={() => setLeftExpanded((v) => !v)} position="left" widthExpanded={250} widthCollapsed={50} isDemo={true} />
        </Box>
        
        <Box sx={{ position: "absolute", top: 0, right: 0, bottom: 0, zIndex: 20, pointerEvents: "auto" }}>
          <RightPanel expanded={rightExpanded} onToggle={() => setRightExpanded((v) => !v)} position="right" widthExpanded={300} widthCollapsed={50} project={project} isDemo={true} />
        </Box>
        
        {loading && <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, pointerEvents: "none" }}><MapLoader /></Box>}
        
        {/* --- FLOATING, DRAGGABLE TOOLS WIDGET --- */}
        <motion.div
          drag
          dragConstraints={dragBoundaryRef} // <-- Added boundary constraint here
          dragElastic={0.1} // <-- Slight bounce when hitting edge
          dragMomentum={false}
          // Use fixed positioning so it escapes all box constraints
          style={{ 
            position: 'fixed', 
            bottom: '200px', 
            left: '78%',
            x: '-50%', // Centers it horizontally based on its own width
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}
          className="pointer-events-auto"
        >

          <Tools 
            selectedMode={selectedMode} 
            handleToolClick={handleToolClick}
            handleShapeClick={handleShapeClick}
            Icons={ToolIcons}
            isDemo={true}
          />
        </motion.div>
      </Box>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 30% { transform: rotate(-90deg); } 70% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } } 
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }
      `}</style>
    </Box>
  );
}