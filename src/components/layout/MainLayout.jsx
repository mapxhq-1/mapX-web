import React, { useEffect, useState } from "react";
import { Box, Typography, Button, useMediaQuery } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { motion } from "framer-motion"; // <-- Added for draggable window

import ScreenRotationIcon from '@mui/icons-material/ScreenRotation'; 
import FullscreenIcon from '@mui/icons-material/Fullscreen'; 

import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";
import Notes from "../map/upload/Notes";
import ImageModel from "../map/upload/ImageModel";
import { closeNotes, closeImages, closeHyperlink, fetchAllEmpirePolygons } from "../../store/mapSlice";
import HyperlinkModel from "../map/upload/HyperlinkModel";
import MapLoader from "../loaders/MapLoader"; 
import { setEmail, setUserToken } from "../../store/projectSlice";
import ResizableWindow from "../Chatbot/ResizableWindow";
import Chat from "../Chatbot/Chat";
import GalaxyCanvas from "../common/GalaxyCanvas";
import Tools from '../panels/Tools.jsx'

// --- Tool Icons Imports ---
import pencilIcon from "../../assets/icons/pencil_icon.png";
import highlighterIcon from "../../assets/icons/highlighter_icon.png";
import eraserIcon from "../../assets/icons/eraser_icon.png";
import noteIcon from "../../assets/icons/note_icon.png";
import textIcon from "../../assets/icons/text_icon.png";
import hyperlinkIcon from "../../assets/icons/hyperlink_icon.png";
import imageIcon from "../../assets/icons/image_icon.png";
import handIcon from "../../assets/icons/hand_icon.png";
import selectIcon from "../../assets/icons/select_icon.png";

export default function MainLayout({ isDemo }) { // <-- Accept isDemo if needed for Tools
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
  
  // --- LAYOUT STATE ---
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const leftWidth = leftExpanded ? 250 : 50;
  const rightWidth = rightExpanded ? 300 : 50;

  // --- TOOLS STATE ---
  const [selectedMode, setSelectedMode] = useState(null);

  // --- DATA STATE ---
  const { id } = useParams();
  const [project, setProject] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const notesOpen = useSelector((state) => state.map.notesOpen);
  const currentNote = useSelector((state) => state.map.currentNote);
  const imageOpen = useSelector((state) => state.map.imageOpen);
  const hyperlinkOpen = useSelector((state) => state.map.hyperlinkOpen);
  const loading = useSelector((state) => state.map.loading);

  // --- MEDIA QUERIES ---
  const isMobilePortrait = useMediaQuery('(max-width: 900px) and (orientation: portrait)');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobileLandscape = useMediaQuery('(max-width: 1200px) and (orientation: landscape)');

  // --- AUTH & DATA ---
  useEffect(() => {
    const savedEmail = localStorage.getItem('ownerEmail');
    const savedToken = localStorage.getItem('userToken');
    if (savedEmail && savedToken) {
      dispatch(setEmail(savedEmail));
      dispatch(setUserToken(savedToken));
    }
  }, [dispatch]);

  useEffect(() => {
    async function getProjectDetails() {
      const token = localStorage.getItem('bearerToken');
      try {
        const res = await axios.get(BASE_URL + '/get-project-by-id/' + id, {
          headers: { 'client_name': 'mapx', "Authorization": `Bearer ${token}` }
        });
        setProject(res.data.data);
      } catch (err) { navigate('/'); }
    }
    getProjectDetails();
  }, [id]);

  useEffect(() => { dispatch(fetchAllEmpirePolygons()); }, [dispatch]);

  // --- FULLSCREEN HANDLERS ---
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

  // --- RENDER BLOCKING SCREENS ---
  const BlockingScreen = ({ icon, title, subtitle, buttonText, onButtonClick, onDismiss }) => (
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {buttonText && (
            <Button 
              variant="contained" size="large" startIcon={<FullscreenIcon />} onClick={onButtonClick}
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
    </Box>
  );

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

  if (isMobileLandscape && !isFullscreen && !isIOS) {
    return (
      <BlockingScreen 
        title="Fullscreen Required"
        subtitle="This experience requires fullscreen mode."
        buttonText="Enter Fullscreen"
        onButtonClick={handleEnterFullscreen}
        onDismiss={() => setIsFullscreen(true)}
        icon={<FullscreenIcon sx={{ fontSize: 80, mb: 2, color: "#ffffff", animation: "pulse 2s infinite" }} />}
      />
    );
  }

  // --- MAIN APP ---
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ResizableWindow><Chat /></ResizableWindow>
      
      <Box sx={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
        <MapView leftOffset={leftWidth} rightOffset={rightWidth} />
        
        <Box id="timeline-overlay" sx={{ position: "absolute", left: leftWidth + 8, right: rightWidth + 8, bottom: 8, zIndex: 15, pointerEvents: "none" }}>
          <Timeline />
        </Box>
        
        <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, zIndex: 20, pointerEvents: "auto" }}>
          <LeftPanel expanded={leftExpanded} onToggle={() => setLeftExpanded((v) => !v)} position="left" widthExpanded={250} widthCollapsed={50} isDemo={isDemo} />
        </Box>
        
        <Box sx={{ position: "absolute", top: 0, right: 0, bottom: 0, zIndex: 20, pointerEvents: "auto" }}>
          <RightPanel expanded={rightExpanded} onToggle={() => setRightExpanded((v) => !v)} position="right" widthExpanded={300} widthCollapsed={50} project={project} />
        </Box>
        
        {loading && <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, pointerEvents: "none" }}><MapLoader /></Box>}

        {/* --- FLOATING, DRAGGABLE TOOLS WIDGET --- */}
        <motion.div
          drag
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
            isDemo={isDemo}
          />
        </motion.div>

      </Box>
      
      {notesOpen && <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: "auto" }}><Notes noteData={currentNote} isOpen={notesOpen} onClose={() => dispatch(closeNotes())} /></Box>}
      {imageOpen && <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001, pointerEvents: "auto" }}><ImageModel onClose={() => dispatch(closeImages())} /></Box>}
      {hyperlinkOpen && <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001, pointerEvents: "auto" }}><HyperlinkModel onClose={() => dispatch(closeHyperlink())} /></Box>}

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 30% { transform: rotate(-90deg); } 70% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } } @keyframes pulse { 0% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }`}</style>
    </Box>
  );
}