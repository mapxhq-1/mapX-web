import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box } from "@mui/material";

export default function Timeline() {
	const dispatch = useDispatch();
	const year = useSelector((state) => state.map.year);

	const MIN_YEAR = 2000;
	const MAX_YEAR = 2025;
	const TICK_SPACING_PX = 36; // distance between consecutive years
	const INVERT_SCALE = true; // render ticks from the top instead of bottom

	const containerRef = useRef(null);
	const [containerWidth, setContainerWidth] = useState(0);

	useEffect(() => {
		if (!containerRef.current) return;
		const ro = new (window.ResizeObserver ||
			class {
				observe() {}
				disconnect() {}
			})((entries) => {
			for (const entry of entries) {
				const w = entry.contentRect
					? entry.contentRect.width
					: containerRef.current.clientWidth;
				setContainerWidth(Math.max(0, Math.floor(w)));
			}
		});
		ro.observe(containerRef.current);
		// Initial
		setContainerWidth(containerRef.current.clientWidth || 0);
		return () => ro.disconnect();
	}, []);

	const years = useMemo(() => {
		const arr = [];
		for (let y = MIN_YEAR; y <= MAX_YEAR; y++) arr.push(y);
		return arr;
	}, []);

	const index = Math.max(0, Math.min(MAX_YEAR - MIN_YEAR, year - MIN_YEAR));
	// Move the ruler so that the current year's tick sits at the horizontal center
	const translateX = Math.floor(containerWidth / 2 - index * TICK_SPACING_PX);

	const handleYearChange = (e) => {
		const y = Number(e.target.value);
		dispatch(setYear(y));
	};

	return (
		<Box
			sx={{
				p: 1.25,
				flexShrink: 0,
				color: "#fff",
			}}
		>
			<style>{`
			.timeline-slider{ -webkit-appearance:none; appearance:none; width:100%; height:32px; background:transparent; }
			.timeline-slider:focus{ outline:none; }
			.timeline-slider::-webkit-slider-runnable-track{ height:2px; background:rgba(255,255,255,0.35); border-radius:2px; }
			.timeline-slider::-moz-range-track{ height:2px; background:rgba(255,255,255,0.35); border-radius:2px; }
			.timeline-slider::-webkit-slider-thumb{ -webkit-appearance:none; width:46px; height:22px; border-radius:14px; background:#0b0b0d; border:1px solid rgba(255,255,255,0.35); box-shadow: inset 0 0 0 10px #ffffff, 0 2px 4px rgba(0,0,0,0.6); margin-top:-10px; }
			.timeline-slider::-moz-range-thumb{ width:46px; height:22px; border-radius:14px; background:#0b0b0d; border:1px solid rgba(255,255,255,0.35); box-shadow: inset 0 0 0 10px #ffffff, 0 2px 4px rgba(0,0,0,0.6); }
			`}</style>

			{/* Ruler viewport */}
			<Box
				ref={containerRef}
				sx={{
					position: "relative",
					height: 56,
					overflow: "hidden",
					borderTop: "1px solid rgba(255,255,255,0.2)",
					mb: 1,
				}}
			>
				{/* Center indicator */}
				<Box
					sx={{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: "50%",
						width: 2,
						transform: "translateX(-1px)",
						background: "#fff",
						opacity: 0.6,
					}}
				/>

				{/* Center label above ruler (current year) */}
				<Box
					sx={{
						position: "absolute",
						top: -22,
						left: "50%",
						transform: "translateX(-50%)",
						px: 1,
						py: 0.2,
						fontSize: 12,
						fontWeight: 700,
						color: "#000",
						background: "#fff",
						borderRadius: 1,
						boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
					}}
				>
					{year}
				</Box>

				{/* Ruler track */}
				<Box
					sx={{
						position: "absolute",
						top: 0,
						left: 0,
						height: "100%",
						width: (MAX_YEAR - MIN_YEAR + 1) * TICK_SPACING_PX,
						transform: `translateX(${translateX}px)`,
						transition: "transform 160ms ease",
					}}
				>
					{years.map((y, i) => {
						const isDecade = y % 10 === 0;
						const isHalf = !isDecade && y % 5 === 0;
						const tickHeight = isDecade ? 36 : isHalf ? 26 : 14;
						return (
							<Box
								key={y}
								sx={{
									position: "absolute",
									left: i * TICK_SPACING_PX,
									...(INVERT_SCALE ? { top: 0 } : { bottom: 0 }),
								}}
							>
								<Box
									sx={{
										width: 2,
										height: tickHeight,
										background: "#fff",
										opacity: isDecade ? 0.95 : isHalf ? 0.8 : 0.55,
									}}
								/>
								{/* year labels removed per request */}
							</Box>
						);
					})}
				</Box>
			</Box>

			{/* Slider control at bottom */}
			<Box sx={{ display: "flex", justifyContent: "center" }}>
				<input
					className="timeline-slider"
					type="range"
					min={MIN_YEAR}
					max={MAX_YEAR}
					step={1}
					value={year}
					onChange={handleYearChange}
				/>
			</Box>
		</Box>
	);
}
