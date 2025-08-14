import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box, Paper } from "@mui/material";

export default function Timeline() {
	const dispatch = useDispatch();
	const year = useSelector((state) => state.map.year);

	const handleYearChange = (e) => {
		dispatch(setYear(Number(e.target.value)));
	};

	return (
		<Paper
			elevation={0}
			sx={{
				borderTop: "1px solid",
				borderColor: "divider",
				p: 1.5,
				flexShrink: 0,
				borderRadius: "8px",
				boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
			}}
		>
			<div className="timeline p-4">
				<input
					type="range"
					min="2000"
					max="2025"
					value={year}
					onChange={handleYearChange}
					className="w-full"
				/>
				<div className="text-center mt-2">Year: {year}</div>
			</div>
		</Paper>
	);
}
