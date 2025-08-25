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
  const TICK_SPACING_PX = 20;
  const INVERT_SCALE = true;

  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [buttonOffset, setButtonOffset] = useState(0);
  const velocityRef = useRef(0); // inertia velocity

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect
          ? entry.contentRect.width
          : containerRef.current.clientWidth;
        setContainerWidth(Math.max(0, Math.floor(w)));
      }
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth || 0);
    return () => ro.disconnect();
  }, []);

  const years = useMemo(() => {
    const arr = [];
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) arr.push(y);
    return arr;
  }, []);

  const index = Math.max(0, Math.min(MAX_YEAR - MIN_YEAR, year - MIN_YEAR));
  const translateX = Math.floor(containerWidth / 2 - index * TICK_SPACING_PX);

  const handleYearChange = (e) => {
    const y = Number(e.target.value);
    dispatch(setYear(Math.min(MAX_YEAR, Math.max(MIN_YEAR, y))));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    velocityRef.current = 0; // reset inertia
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const maxOffset = 40;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    setButtonOffset(clampedOffset);

    // store velocity for inertia after release
    velocityRef.current = clampedOffset * 0.2;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setButtonOffset(0);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, dragStartX]);

  // 🚀 Physics Loop
  useEffect(() => {
  let frameId;
  const friction = 0.95;  // 🔽 stronger friction (stops faster)

  const animate = () => {
    if (isDragging && buttonOffset !== 0) {
      // --- while dragging ---
      const offset = Math.abs(buttonOffset);
      const actualMaxOffset = 40; // Match your clamp limit
      const t = offset / actualMaxOffset; // 0 → 1
      const maxSpeed = 25;

      // Declare speed outside the if/else blocks
      let speed = 0;

      if (t < 0.2) {
        // Ultra slow movement from the very start
        speed = maxSpeed * 0.005 * (t / 0.2); // 0-0.5% of max speed
      } else if (t < 0.5) {
        // Still slow phase
        const adjustedT = (t - 0.2) / 0.3;
        speed = maxSpeed * (0.005 + 0.025 * Math.pow(adjustedT, 3)); // 0.5-3% of max speed
      } else {
        // Normal acceleration phase
        const adjustedT = (t - 0.5) / 0.5;
        speed = maxSpeed * (0.03 + 0.97 * Math.pow(adjustedT, 5)); // 3-100% of max speed
      }

      if (buttonOffset > 0 && year < MAX_YEAR) {
        dispatch(setYear(Math.min(MAX_YEAR, Math.round(year + speed))));
      } else if (buttonOffset < 0 && year > MIN_YEAR) {
        dispatch(setYear(Math.max(MIN_YEAR, Math.round(year - speed))));
      }

      // update velocity reference for inertia
      velocityRef.current = buttonOffset * 0.12;
    } else if (!isDragging && Math.abs(velocityRef.current) > 0.1) {
      // --- inertia after release ---
      const inertiaSpeed = velocityRef.current * 0.15;

      if (velocityRef.current > 0 && year < MAX_YEAR) {
        dispatch(setYear(Math.min(MAX_YEAR, Math.round(year + inertiaSpeed))));
      } else if (velocityRef.current < 0 && year > MIN_YEAR) {
        dispatch(setYear(Math.max(MIN_YEAR, Math.round(year + inertiaSpeed))));
      }

      // 🔽 stronger damping for quick stop
      velocityRef.current *= friction;
    }

    frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(frameId);
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
      {/* Year input */}
      <Box
        sx={{
          textAlign: "center",
          mb: 2,
          fontSize: "24px",
          fontWeight: "bold",
          color: "#000",
          position: "relative",
        }}
      >
        <input
          value={year}
          onChange={handleYearChange}
          style={{
            backgroundColor: "#fff",
            padding: "2px 8px",
            borderRadius: "6px",
            border: "none",
            fontWeight: "bold",
            fontSize: "24px",
            textAlign: "center",
            color: "#000",
            outline: "none",
            width: `${String(year).length + 3}ch`,
            minWidth: "3ch",
          }}
        />
        <Box
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: "95%",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid #fff",
          marginTop: "2px",
        }}
        />
      </Box>

      {/* Ruler */}
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          height: 56,
          overflow: "hidden",
          mb: 0.25,
        }}
      >
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: -22,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 12,
            fontWeight: 700,
            color: "#000",
            background: "#fff",
          }}
        >
          {year}
        </Box>

        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: (MAX_YEAR - MIN_YEAR + 1) * TICK_SPACING_PX,
            transform: `translateX(${translateX}px)`,
          }}
        >
          {years.map((y, i) => {
            const isDecade = y % 5 === 0;
            const tickHeight = isDecade ? 30 : 15;
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
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Draggable Control */}
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
        <Box
          sx={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.6)",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          ‹
        </Box>

        <Box
          sx={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.6)",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          ›
        </Box>

        <Box
          ref={sliderRef}
          sx={{
            position: "absolute",
            width: 65,
            height: 18,
            background: "#fff",
            borderRadius: "16px",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            cursor: "grab",
            transform: `translateX(${buttonOffset}px)`,
            transition: isDragging ? "none" : "transform 100ms ease-out",
            "&:active": {
              cursor: "grabbing",
              boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
            },
          }}
          onMouseDown={handleMouseDown}
        />
      </Box>
    </Box>
  );
}
