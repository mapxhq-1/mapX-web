import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import MapView from "../map/MapView";
import Timeline from "../timeline/Timeline";
import LeftPanel from "../panels/LeftPanel";
import RightPanel from "../panels/RightPanel";

export default function MainLayout() {
	const [leftExpanded, setLeftExpanded] = useState(false);
	const [rightExpanded, setRightExpanded] = useState(false);

	return (
		<Box
			sx={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				gap: 0.5,
				// p: 0.5,
			}}
		>
			{/* Main Row */}
			<Box
				sx={{
					display: "flex",
					flex: 1,
					overflow: "hidden",
					minHeight: 0,
					gap: 0.5,
				}}
			>
				{/* Left Panel */}
				<LeftPanel
					expanded={leftExpanded}
					onToggle={() => setLeftExpanded((v) => !v)}
					position="left"
					widthExpanded={250}
					widthCollapsed={50}
				/>

				{/* Map */}
				<Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
					<MapView />
					{/* Timeline */}
					<Timeline />
				</Box>

				{/* Right Panel */}
				<RightPanel
					expanded={rightExpanded}
					onToggle={() => setRightExpanded((v) => !v)}
					position="right"
					widthExpanded={200}
					widthCollapsed={50}
				/>
			</Box>
		</Box>
	);
}
