import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box } from "@mui/material";

export default function Timeline() {
  const dispatch = useDispatch();
  const globalYear = useSelector((state) => state.map.year);

  // Local year for smooth dragging
  const [localYear, setLocalYear] = useState(globalYear);

  // Constants
  const MIN_YEAR = -4000;
  const MAX_YEAR = 2025;
  const TICK_SPACING_PX = 20;


  // Refs & State
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const buttonOffsetRef = useRef(0);
  const velocityRef = useRef(0);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width || containerRef.current.clientWidth;
        setContainerWidth(Math.max(0, Math.floor(w)));
      }
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth || 0);
    return () => ro.disconnect();
  }, []);

  // Sync global year into local year when redux updates externally,
  // but NOT while dragging or during inertia (prevents snap-back).
  useEffect(() => {
    const animating =
      isDragging ||
      buttonOffsetRef.current !== 0 ||
      Math.abs(velocityRef.current) > 0.1;

    if (!animating && globalYear !== localYear) {
      setLocalYear(globalYear);
    }
  }, [globalYear, isDragging, localYear]);

  // Precompute years
  const years = useMemo(
    () => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i),
    []
  );

  // Virtualization setup
  const index = Math.max(0, Math.min(MAX_YEAR - MIN_YEAR, localYear - MIN_YEAR));
  const translateX = useMemo(
    () => Math.floor(containerWidth / 2 - index * TICK_SPACING_PX),
    [containerWidth, index]
  );

  const visibleYears = useMemo(() => {
    const visibleCount = Math.ceil(containerWidth / TICK_SPACING_PX) + 10;
    const startIndex = Math.max(0, index - visibleCount);
    const endIndex = Math.min(years.length, index + visibleCount);
    return years
      .slice(startIndex, endIndex)
      .map((y, i) => ({ y, left: (startIndex + i) * TICK_SPACING_PX }));
  }, [years, index, containerWidth]);

  // Drag start
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    velocityRef.current = 0;
  };

  // Drag move
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    const maxOffset = 40;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));

    buttonOffsetRef.current = clampedOffset;
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(${clampedOffset}px)`;
    }
    velocityRef.current = clampedOffset * 0.2;
  };

  // Drag end — final sync
  const handleMouseUp = () => {
    setIsDragging(false);
    dispatch(setYear(localYear)); // final confirm
    buttonOffsetRef.current = 0;
    if (sliderRef.current) {
      sliderRef.current.style.transform = "translateX(0px)";
    }
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
  }, [isDragging]);

  // Precompute easing curve
const speedLookup = useMemo(() => {
  const maxSpeed = 1; // Maximum scroll speed at full drag
  return Array.from({ length: 101 }, (_, i) => {
    const t = i / 100; // Drag percentage (0 → 1)
    let speed;

    if (t < 0.4) {
      // First 20% → EXTREMELY slow start using cubic easing
      // At 10% drag, speed is only ~0.1% of maxSpeed
      speed = maxSpeed * Math.pow(t / 0.2, 3) * 0.05;
    } else if (t < 0.4) {
      // 20% → 40% → begin smoother ramp-up
      const normalized = (t - 0.2) / 0.2; // Scale 0 → 1
      speed = maxSpeed * (0.05 + Math.pow(normalized, 2) * 0.25);
    } else {
      // 40% → 100% → accelerate fully but controlled
      const normalized = (t - 0.4) / 0.6;
      speed = maxSpeed * (0.3 + normalized * 0.7);
    }

    return speed;
  });
}, []);


  // Physics + inertia loop
  useEffect(() => {
    let frameId;
    const friction = 0.95;

    const animate = () => {
      const offset = buttonOffsetRef.current;

      if (isDragging && offset !== 0) {
        const t = Math.abs(offset) / 40;
        const speed = speedLookup[Math.min(100, Math.floor(t * 100))];

        let next = localYear;

        if (offset > 0 && localYear < MAX_YEAR) {
          next = Math.min(MAX_YEAR, Math.round(localYear + speed));
          if (next !== localYear) setLocalYear(next);
        } else if (offset < 0 && localYear > MIN_YEAR) {
          next = Math.max(MIN_YEAR, Math.round(localYear - speed));
          if (next !== localYear) setLocalYear(next);
        }

        // 🔴 LIVE Redux sync during drag (only when year actually changes)
        if (next !== globalYear) {
          dispatch(setYear(next));
        }

        velocityRef.current = offset * 0.12;
      } else if (!isDragging && Math.abs(velocityRef.current) > 0.1) {
        const inertiaSpeed = velocityRef.current * 0.15;
        const next =
          velocityRef.current > 0
            ? Math.min(MAX_YEAR, Math.round(localYear + inertiaSpeed))
            : Math.max(MIN_YEAR, Math.round(localYear + inertiaSpeed));

        if (next !== localYear) {
          setLocalYear(next);

          // 🔴 LIVE Redux sync during inertia as well
          if (next !== globalYear) {
            dispatch(setYear(next));
          }
        }

        velocityRef.current *= friction;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isDragging, localYear, globalYear, speedLookup, dispatch]);
function PassNumber(n){
  if(isNaN(Number(n)))return n;
  return Number(n);
}
  return (
    <Box sx={{ position: "fixed", bottom: "20px", left: 0, right: 0, width: "100vw", zIndex: 1, color: "#fff" }}>
      {/* Year input */}
      <Box sx={{ textAlign: "center", mb: 2, fontSize: "24px", fontWeight: "bold", color: "#000", position: "relative" }}>
        <input
          value={localYear}
          onChange={(e) => {
            const v = PassNumber(e.target.value);
            setLocalYear(v);
            dispatch(setYear(v)); // keep Redux in sync when typing
          }}
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
            width: `${String(localYear).length + 3}ch`,
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
      <Box ref={containerRef} sx={{ position: "relative", height: 56, overflow: "hidden", mb: 0.25 }}>
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
          {localYear}
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
          {visibleYears.map(({ y, left }) => {
            const isDecade = y % 5 === 0;
            const tickHeight = isDecade ? 30 : 15;
            return (
              <Box key={y} sx={{ position: "absolute", left }}>
                <Box sx={{ width: 2, height: tickHeight, background: "#fff" }} />
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
          height: 44,
          width: 109,
          border: "2px solid rgba(255,255,255,0.2)",
          borderRadius: "20px",
          padding: "6px",
          margin: "0 auto",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: "7px",
            color: "rgba(255,255,255,0.6)",
            fontSize: "24px",
            fontWeight: "bold",
            top : "0"
          }}
        >
          ‹
        </Box>

        <Box
          sx={{
            position: "absolute",
            right: "7px",
            color: "rgba(255,255,255,0.6)",
            fontSize: "24px",
            fontWeight: "bold",
            top : "0.4px"
          }}
        >
          ›
        </Box>

        <Box
          ref={sliderRef}
          sx={{
            position: "absolute",
            width: 62,
            height: 27,
            background: "#fff",
            borderRadius: "16px",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            cursor: "grab",
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
