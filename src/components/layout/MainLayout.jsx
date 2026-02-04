import React, { useEffect, useState } from "react";
import { Box, Typography, Button, useMediaQuery } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation'; 
import FullscreenIcon from '@mui/icons-material/Fullscreen'; // New icon for the button

import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";
import Notes from "../map/upload/Notes";
import ImageModel from "../map/upload/ImageModel";
import { closeNotes, closeImages, closeHyperlink, fetchAllEmpirePolygons } from "../../store/mapSlice";
import { toast } from "react-toastify";
import HyperlinkModel from "../map/upload/HyperlinkModel";
import MapLoader from "../loaders/MapLoader"; 
import { setEmail, setUserToken } from "../../store/projectSlice";
import ResizableWindow from "../Chatbot/ResizableWindow";
import Chat from "../Chatbot/Chat";
import GalaxyCanvas from "../common/GalaxyCanvas";

export default function MainLayout() {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
  
  // --- LAYOUT STATE ---
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const leftWidth = leftExpanded ? 250 : 50;
  const rightWidth = rightExpanded ? 300 : 50;

  // --- DATA STATE ---
  const { id } = useParams();
  const [project, setProject] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // --- REDUX STATE ---
  const notesOpen = useSelector((state) => state.map.notesOpen);
  const currentNote = useSelector((state) => state.map.currentNote);
  const imageOpen = useSelector((state) => state.map.imageOpen);
  const hyperlinkOpen = useSelector((state) => state.map.hyperlinkOpen);
  const loading = useSelector((state) => state.map.loading);

  // --- MEDIA QUERY FOR MOBILE PORTRAIT ---
  // Detects if width is small AND in portrait mode
  const isMobilePortrait = useMediaQuery('(max-width: 900px) and (orientation: portrait)');

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
          headers: {
            'client_name': 'mapx', "Authorization": `Bearer ${token}`
          }
        });
        setProject(res.data.data);
      } catch (err) {
        // Optional: toast.error(err.response?.data?.message);
        navigate('/');
      }
    }
    getProjectDetails();
  }, [id]);

  useEffect(() => {
    dispatch(fetchAllEmpirePolygons());
  }, [dispatch]);

  // --- HANDLER: FORCE FULLSCREEN & ROTATION ---
  const handleEnterExperience = async () => {
    try {
      const element = document.documentElement;

      // 1. Request Fullscreen (Removes browser address bar)
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) { // Safari/Chrome fallback
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { // IE/Edge fallback
        await element.msRequestFullscreen();
      }

      // 2. Lock Orientation to Landscape
      // Note: This API is not supported on all browsers (specifically iOS Safari often blocks it)
      if (window.screen.orientation && window.screen.orientation.lock) {
        await window.screen.orientation.lock("landscape").catch((err) => {
          console.warn("Orientation lock failed (device might not support it): ", err);
        });
      }
    } catch (error) {
      console.error("Error attempting to go fullscreen/rotate:", error);
    }
  };

  // --- VIEW 1: PORTRAIT WARNING SCREEN ---
  if (isMobilePortrait) {
    return (
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "white",
          textAlign: "center",
          p: 3,
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          overflow: "hidden"
        }}
      >
        {/* Background Layer */}
        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }}>
          <GalaxyCanvas />
        </Box>

        {/* Dark Pill Container */}
        <Box 
          sx={{ 
            background: "rgba(20, 20, 20, 0.75)", 
            backdropFilter: "blur(8px)",
            p: 5, 
            borderRadius: "50px", // Pill shape container
            border: "1px solid rgba(255, 255, 255, 0.08)",
            maxWidth: "90%",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }}
        >
          <ScreenRotationIcon 
            sx={{ 
              fontSize: 70, 
              mb: 2, 
              color: "#ffffff", 
              opacity: 0.9,
              animation: "spin 3s ease-in-out infinite" 
            }} 
          />
          
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: "#fff" }}>
            Rotate Device
          </Typography>
          
          <Typography variant="body1" sx={{ opacity: 0.7, mb: 1, color: "#fff" }}>
            Landscape mode is required.
          </Typography>

          <Typography variant="body2" sx={{ color: "#888", mb: 4, fontStyle: 'italic' }}>
            Tip: Use a laptop for better experience
          </Typography>

          {/* Button with Dark Green Background & 3D Top Border */}
          <Button 
            variant="contained" 
            size="large"
            startIcon={<FullscreenIcon />}
            onClick={handleEnterExperience}
            sx={{ 
              backgroundColor: "#2e7d32", // Dark Green
              color: "#ffffff", // White text
              
              // --- 3D Effect created here ---
              borderTop: "2px solid rgba(255, 255, 255, 0.4)", // Bright top highlight
              boxShadow: "0px 6px 15px rgba(0,0,0,0.4)", // Stronger bottom shadow for depth
              // ---------------------------

              borderRadius: "50px", // Pill Shape
              px: 4,
              py: 1.5,
              fontWeight: "bold",
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Rotate & Enter
          </Button>
        </Box>

        <style>
          {`@keyframes spin { 
              0% { transform: rotate(0deg); } 
              30% { transform: rotate(-90deg); } 
              70% { transform: rotate(-90deg); }
              100% { transform: rotate(0deg); } 
            }`}
        </style>
      </Box>
    );
  }
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", 
      }}
    >
      <ResizableWindow>
        <Chat />
      </ResizableWindow>
      
      <Box sx={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
        <MapView leftOffset={leftWidth} rightOffset={rightWidth} />
        
        {/* Timeline */}
        <Box
          id="timeline-overlay"
          sx={{
            position: "absolute",
            left: leftWidth + 8,
            right: rightWidth + 8,
            bottom: 8,
            zIndex: 15,
            pointerEvents: "none",
          }}
        >
          <Timeline />
        </Box>
        
        {/* Left Panel */}
        <Box
          sx={{
            position: "absolute",
            top: 0, left: 0, bottom: 0, zIndex: 20, pointerEvents: "auto",
          }}
        >
          <LeftPanel
            expanded={leftExpanded}
            onToggle={() => setLeftExpanded((v) => !v)}
            position="left"
            widthExpanded={250}
            widthCollapsed={50}
          />
        </Box>
        
        {/* Right Panel */}
        <Box
          sx={{
            position: "absolute",
            top: 0, right: 0, bottom: 0, zIndex: 20, pointerEvents: "auto",
          }}
        >
          <RightPanel
            expanded={rightExpanded}
            onToggle={() => setRightExpanded((v) => !v)}
            position="right"
            widthExpanded={300}
            widthCollapsed={50}
            project={project}
          />
        </Box>
        
        {/* Loader */}
        {loading && (
          <Box
            sx={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 500, pointerEvents: "none",
            }}
          >
            <MapLoader />
          </Box>
        )}
      </Box>
      
      {/* Modals */}
      {notesOpen && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: "auto" }}>
          <Notes noteData={currentNote} isOpen={notesOpen} onClose={() => dispatch(closeNotes())} />
        </Box>
      )}

      {imageOpen && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001, pointerEvents: "auto" }}>
          <ImageModel onClose={() => dispatch(closeImages())} />
        </Box>
      )}

      {hyperlinkOpen && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1001, pointerEvents: "auto" }}>
          <HyperlinkModel onClose={() => dispatch(closeHyperlink())} />
        </Box>
      )}
    </Box>
  );
}