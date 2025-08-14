import React from "react";
import { Paper, Box } from "@mui/material";

export default function RightPanel({
	expanded,
	onToggle,

	widthExpanded = 250,
	widthCollapsed = 50,
}) {
	const panelWidth = expanded ? widthExpanded : widthCollapsed;

	const panelStyles = (theme) => ({
		height: "100%",
		flexShrink: 0,
		cursor: "pointer",
		transition: theme.transitions.create("width", {
			duration: theme.transitions.duration.standard,
		}),
		display: "flex",
		flexDirection: "column",
		backgroundColor: theme.palette.background.paper,
		// border: `1px solid ${theme.palette.divider}`,
		// borderRadius: position === "left" ? "8px 0 0 8px" : "0 8px 8px 0",
		overflow: "hidden",
		boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
		"&:hover": {
			boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
		},
	});

	return (
		<Paper
			elevation={0}
			onClick={onToggle}
			sx={(theme) => ({
				...panelStyles(theme),
				width: panelWidth,
			})}
		>
			{/* <Box sx={{ flex: 1 }}>{children}</Box> */}
			Right Panel
		</Paper>
	);
}
