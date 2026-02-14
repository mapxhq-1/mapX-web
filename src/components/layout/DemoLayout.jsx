import React, { useEffect, useState } from "react";
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

// Chatbot Components
import ResizableWindow from "../Chatbot/ResizableWindow";
import Chat from "../Chatbot/Chat";

export default function DemoLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- LAYOUT & FULLSCREEN STATE ---
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // --- BLOCKING SCREEN COMPONENT ---
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
      
      {/* chatbot with Demo Prop */}
      <ResizableWindow>
        <Chat isDemo={true} />
      </ResizableWindow>

      <Box sx={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
        
        {/* --- PREMIUM BLACK DEPTH BUTTON --- */}
        <Box sx={{
          position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100,
        }}>
          <Button
            onClick={() => navigate('/myProjects')}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: '74px', px: { xs: 4, md: 6 }, py: 1.5, textTransform: 'none',
              background: 'linear-gradient(180deg, #242424 0%, #0a0a0a 100%)', color: '#ffffff',
              borderBottom: '1px solid #0a0a0a',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.6)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(180deg, #323232 0%, #141414 100%)',
                transform: 'translateY(-2px)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.9)', 
              },
              '&:active': {
                transform: 'scale(0.96) translateY(1px)', background: '#050505', 
                boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(255, 255, 255, 0.05)',
              }
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>
              YOU ARE MISSING A LOT OF THINGS
            </Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500, color: '#f5f5f5', letterSpacing: '0.3px' }}>
              Log in to unlock full features
            </Typography>
          </Button>
        </Box>

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
      </Box>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 30% { transform: rotate(-90deg); } 70% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } } 
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }
      `}</style>
    </Box>
  );
}