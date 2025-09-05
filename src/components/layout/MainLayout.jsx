import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";

export default function MainLayout() {
	const [leftExpanded, setLeftExpanded] = useState(false);
	const [rightExpanded, setRightExpanded] = useState(false);

	const leftWidth = leftExpanded ? 250 : 50;
	const rightWidth = rightExpanded ? 300 : 50;

	return (
		<Box
			sx={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				// gap: 0.5,
				// p: 0.5,
			}}
		>
			{/* Map and overlays */}
			<Box sx={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0 }}>
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
					/>
				</Box>
			</Box>
		</Box>
	);
}
