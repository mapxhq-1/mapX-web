import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";
import Notes from "../map/Notes";
import { closeNotes } from "../../store/mapSlice";
import { toast } from "react-toastify";

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
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000, // Very high z-index to ensure it's above everything
          pointerEvents: notesOpen ? "auto" : "none", // Only allow interactions when open
          display: notesOpen ? "block" : "none", // Hide when closed
        }}
      >
        <Notes 
          noteData={currentNote} 
          isOpen={notesOpen} 
          onClose={() => dispatch(closeNotes())} 
        />
      </Box>
    </Box>
  );
}