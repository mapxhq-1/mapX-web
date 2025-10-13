import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";
import Notes from "../map/upload/Notes";
import ImageModel from "../map/upload/ImageModel"
import { closeNotes, closeImages, closeHyperlink, fetchAllEmpirePolygons } from "../../store/mapSlice";
import { toast } from "react-toastify";
import HyperlinkModel from "../map/upload/HyperlinkModel";
import MapLoader from "../loaders/MapLoader"; // Import the loader
import { setEmail,setUserToken } from "../../store/projectSlice";
export default function MainLayout() {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT +  "/project-management-service";
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const { id } = useParams();
  const [project, setProject] = useState({});
  const leftWidth = leftExpanded ? 250 : 50;
  const rightWidth = rightExpanded ? 300 : 50;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get state from Redux
  const notesOpen = useSelector((state) => state.map.notesOpen);
  const currentNote = useSelector((state) => state.map.currentNote);
  const imageOpen = useSelector((state) => state.map.imageOpen);
  const hyperlinkOpen = useSelector((state) => state.map.hyperlinkOpen);
  const loading = useSelector((state) => state.map.loading); // Get loading state
  
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
        const res = await axios.get(BASE_URL+'/get-project-by-id/' + id, {
          headers: {
            'client_name': 'mapx',"Authorization": `Bearer ${token}`
          }
        });
        setProject(res.data.data);
      } catch (err) {
        toast.error(err.response.data.message);
        navigate('/');
      }
    }
    getProjectDetails();
  }, [id]);

  // Fetch empire polygons on mount
  useEffect(() => {
    dispatch(fetchAllEmpirePolygons());
  }, [dispatch]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Map and overlays */}
      <Box sx={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
        {/* Map */}
        <MapView leftOffset={leftWidth} rightOffset={rightWidth} />
        
        {/* Timeline overlay */}
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
        
        {/* Left Panel overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 20,
            pointerEvents: "auto",
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
        
        {/* Right Panel overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            pointerEvents: "auto",
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
        
        {/* Loading Overlay - positioned within the map container */}
        {loading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 500, // Below modals but above everything else
              pointerEvents: "none",
            }}
          >
            <MapLoader />
          </Box>
        )}
      </Box>
      
      {/* Notes Modal */}
      {notesOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            pointerEvents: "auto",
          }}
        >
          <Notes 
            noteData={currentNote} 
            isOpen={notesOpen} 
            onClose={() => dispatch(closeNotes())} 
          />
        </Box>
      )}

      {/* Image Modal */}
      {imageOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1001,
            pointerEvents: "auto",
          }}
        >
          <ImageModel 
            onClose={() => dispatch(closeImages())} 
          />
        </Box>
      )}

      {/* Hyperlink Modal */}
      {hyperlinkOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1001,
            pointerEvents: "auto",
          }}
        >
          <HyperlinkModel
            onClose={() => dispatch(closeHyperlink())} 
          />
        </Box>
      )}
    </Box>
  );
}