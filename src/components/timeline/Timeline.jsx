import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box } from "@mui/material";

export default function Timeline() {
	const dispatch = useDispatch();
	const year = useSelector((state) => state.map.year);

	// Internal year range (negative for BCE, positive for CE)
	const MIN_YEAR = -2000; // 2000 BCE
	const MAX_YEAR = 2025; // 2025 CE
	const TICK_SPACING_PX = 24; // distance between consecutive years
	const INVERT_SCALE = true; // render ticks from the top instead of bottom

	const containerRef = useRef(null);
	const sliderRef = useRef(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartX, setDragStartX] = useState(0);
	const [buttonOffset, setButtonOffset] = useState(0);

	// Helper functions to convert between display format and internal year
	const formatYearForDisplay = (internalYear) => {
		if (internalYear < 0) {
			return `${Math.abs(internalYear)} BCE`;
		} else if (internalYear === 0) {
			return "1 CE";
		} else {
			return `${internalYear} CE`;
		}
	};

	const parseYearFromDisplay = (displayYear) => {
		if (displayYear.includes("BCE")) {
			return -parseInt(displayYear.replace(" BCE", ""));
		} else if (displayYear.includes("CE")) {
			const year = parseInt(displayYear.replace(" CE", ""));
			return year === 0 ? 1 : year;
		}
		return parseInt(displayYear);
	};

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

	const handleMouseDown = (e) => {
		e.preventDefault();
		setIsDragging(true);
		setDragStartX(e.clientX);
		setButtonOffset(0);
	};

	const handleMouseMove = (e) => {
		if (!isDragging) return;

		const deltaX = e.clientX - dragStartX;
		const maxOffset = 40; // Maximum offset in pixels
		const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
		setButtonOffset(clampedOffset);

		// Determine direction and speed based on offset
		if (Math.abs(clampedOffset) > 15) {
			const direction = clampedOffset > 0 ? "right" : "left";
			if (direction === "left" && year > MIN_YEAR) {
				dispatch(setYear(year - 1));
			} else if (direction === "right" && year < MAX_YEAR) {
				dispatch(setYear(year + 1));
			}
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		setButtonOffset(0);
	};

	useEffect(() => {
		const handleGlobalMouseMove = (e) => {
			handleMouseMove(e);
		};

		const handleGlobalMouseUp = () => {
			handleMouseUp();
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleGlobalMouseMove);
			document.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [isDragging, dragStartX, year, dispatch]);

	// Continuous update when dragging
	useEffect(() => {
		if (!isDragging) return;

		const interval = setInterval(() => {
			if (buttonOffset > 15 && year < MAX_YEAR) {
				dispatch(setYear(year + 1));
			} else if (buttonOffset < -15 && year > MIN_YEAR) {
				dispatch(setYear(year - 1));
			}
		}, 100); // Update every 100ms

		return () => clearInterval(interval);
	}, [isDragging, buttonOffset, year, dispatch]);

	return (
		<Box
			sx={{
				position: "fixed",
				bottom: "20px",
				left: 0,
				right: 0,
				width: "100vw",
				zIndex: 1,
				p: 0,
				flexShrink: 0,
				color: "#fff",
				pointerEvents: "auto",
			}}
		>
			{/* Current year display at top */}
			<Box
				sx={{
					textAlign: "center",
					mb: 2,
					fontSize: "24px",
					fontWeight: "bold",
					color: "#000",
					// background: "#fff",

					// borderRadius: 1,

					// boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
				}}
			>
				<span
					style={{
						backgroundColor: "#fff",
						padding: "2px 8px",
						borderRadius: "6px",
					}}
				>
					{formatYearForDisplay(year)}
				</span>
			</Box>
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
					mb: 0.25,
				}}
			>
				{/* Center label above ruler (current year) */}
				<Box
					component="span"
					sx={{
						position: "absolute",
						top: -22,
						left: "50%",
						transform: "translateX(-50%)",
						display: "inline-block",
						whiteSpace: "nowrap",
						fontSize: 12,
						fontWeight: 700,
						color: "#000",
						background: "#fff",
					}}
				>
					{formatYearForDisplay(year)}
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

			{/* Draggable Button Slider */}
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					position: "relative",
					height: 40,
					width: 140,
					border: "2px solid rgba(255,255,255,0.2)",
					borderRadius: "20px",
					padding: "6px",
					margin: "0 auto",
				}}
			>
				{/* Left arrow indicator */}
				<Box
					sx={{
						position: "absolute",
						left: "20px",
						top: "50%",
						transform: "translateY(-50%)",
						color: "rgba(255,255,255,0.6)",
						fontSize: "24px",
						fontWeight: "bold",
						cursor: "pointer",
					}}
				>
					‹
				</Box>

				{/* Right arrow indicator */}
				<Box
					sx={{
						position: "absolute",
						right: "20px",
						top: "50%",
						transform: "translateY(-50%)",
						color: "rgba(255,255,255,0.6)",
						fontSize: "24px",
						fontWeight: "bold",
						cursor: "pointer",
					}}
				>
					›
				</Box>

				{/* Draggable button */}
				<Box
					ref={sliderRef}
					sx={{
						position: "absolute",
						width: 65,
						height: 18,
						background: "#fff",
						borderRadius: "16px",
						border: "2px solid rgba(255,255,255,0.3)",
						padding: "4px",
						margin: "2px",
						boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
						cursor: "grab",
						transform: `translateX(${buttonOffset}px)`,
						transition: isDragging ? "none" : "transform 0.2s ease",
						"&:active": {
							cursor: "grabbing",
							boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
							border: "2px solid rgba(255,255,255,0.5)",
						},
						"&:hover": {
							boxShadow: "0 5px 10px rgba(0,0,255,0.35)",
							border: "2px solid rgba(255,255,255,0.4)",
						},
					}}
					onMouseDown={handleMouseDown}
				/>
			</Box>
		</Box>
	);
}
