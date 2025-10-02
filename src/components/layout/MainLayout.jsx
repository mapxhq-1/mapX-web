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
import { closeNotes,closeImages, closeHyperlink } from "../../store/mapSlice";
import { toast } from "react-toastify";
import HyperlinkModel from "../map/upload/HyperlinkModel";

export default function MainLayout() {
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const { id } = useParams();
  const [project, setProject] = useState({});
  const leftWidth = leftExpanded ? 250 : 50;
  const rightWidth = rightExpanded ? 300 : 50;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get notes state from Redux
  const notesOpen = useSelector((state) => state.map.notesOpen);
  const currentNote = useSelector((state) => state.map.currentNote);
  const imageOpen = useSelector((state) => state.map.imageOpen);
  const hyperlinkOpen = useSelector((state) => state.map.hyperlinkOpen);
  
  useEffect(() => {
    async function getProjectDetails() {
      try {
        const res = await axios.get('/project-management-service/get-project-by-id/' + id, {
          headers: {
            'client_name': 'mapx'
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
      </Box>
      
      {/* Notes Modal - rendered at top level with highest z-index */}
      {/* Notes Modal - separate container */}
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

{/* Image Modal - separate container */}
{imageOpen && (
  <Box
    sx={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1001, // Higher than Notes modal
      pointerEvents: "auto",
    }}
  >
    <ImageModel 
      onClose={() => dispatch(closeImages())} 
    />
  </Box>
)}

{hyperlinkOpen && (
  <Box
    sx={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1001, // Higher than Notes modal
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