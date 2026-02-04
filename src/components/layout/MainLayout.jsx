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
  // If user is on mobile vertical, show this screen with the button
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
          backgroundColor: "#1a1a1a", // Dark background
          color: "white",
          textAlign: "center",
          p: 3,
          position: "fixed",
          top: 0, left: 0, zIndex: 9999
        }}
      >
        <ScreenRotationIcon sx={{ fontSize: 60, mb: 2, animation: "spin 2s infinite" }} />
        
        <Typography variant="h5" gutterBottom>
          Landscape Mode Required
        </Typography>
        
        <Typography variant="body1" sx={{ opacity: 0.8, mb: 4 }}>
          This map is best viewed in landscape mode.
        </Typography>

        <Button 
          variant="contained" 
          size="large"
          startIcon={<FullscreenIcon />}
          onClick={handleEnterExperience}
          sx={{ 
            backgroundColor: "#4caf50", 
            "&:hover": { backgroundColor: "#388e3c" },
            borderRadius: "20px",
            px: 4,
            py: 1.5,
            textTransform: "none",
            fontSize: "1.1rem"
          }}
        >
          Rotate & Enter Fullscreen
        </Button>

        <style>
          {`@keyframes spin { 
              0% { transform: rotate(0deg); } 
              25% { transform: rotate(-90deg); } 
              100% { transform: rotate(-90deg); } 
            }`}
        </style>
      </Box>
    );
  }

  // --- VIEW 2: STANDARD LANDSCAPE APP ---
  // This renders normally. When the user rotates the phone (or clicks the button above), 
  // the browser treats it as a PC screen (Landscape).
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