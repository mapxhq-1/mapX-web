import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box } from "@mui/material";

// Format year with CE/BCE suffix
const formatYear = (year) => {
  if (year > 0) {
    return `${year} CE`;
  } else if (year < 0) {
    return `${Math.abs(year)} BCE`;
  } else {
    return '1 CE'; // Skip year 0, go to 1 CE
  }
};

// Helper function to get next valid year (skipping year 0)
const getNextValidYear = (year, direction) => {
  const next = year + direction;
  if (next === 0) {
    // Skip year 0, go directly to 1 CE or -1 BCE
    return direction > 0 ? 1 : -1;
  }
  return next;
};

export default function Timeline() {
  const dispatch = useDispatch();
  const globalYear = useSelector((state) => state.map.year);

  // Local year for smooth dragging
  const [localYear, setLocalYear] = useState(globalYear);
  const [inputValue, setInputValue] = useState(formatYear(globalYear));
  const [showGoButton, setShowGoButton] = useState(false);

  // Constants
  const MIN_YEAR = 0;
  const MAX_YEAR = 2025;
  const BCE_MAX_YEAR = 4500; // For BCE years (0 to 4500 BCE)
  const TICK_SPACING_PX = 20;


  // Refs & State
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const buttonOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const maxDragAbsRef = useRef(0);
  const dragAccumulatorRef = useRef(0);

  // Arrow hold/acceleration state
  const holdDirRef = useRef(0); // -1 left, +1 right
  const holdStartTsRef = useRef(0);
  const holdRafRef = useRef(0);
  const stepAccumulatorRef = useRef(0);

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
      setInputValue(formatYear(globalYear));
    }
  }, [globalYear, isDragging, localYear]);

  // Update inputValue whenever localYear changes
  useEffect(() => {
    setInputValue(formatYear(localYear));
  }, [localYear]);


  // Precompute years (BCE years from -4500 to -1, then CE years from 1 to 2025)
  const years = useMemo(() => {
    const bceYears = Array.from({ length: BCE_MAX_YEAR }, (_, i) => -(BCE_MAX_YEAR - i)); // -4500, -4499, ..., -1
    const ceYears = Array.from({ length: MAX_YEAR }, (_, i) => i + 1); // 1, 2, ..., 2025
    return [...bceYears, ...ceYears];
  }, []);

  // Virtualization setup
  const getYearIndex = (year) => {
    if (year > 0) {
      // CE years: index = BCE_MAX_YEAR + year - 1 (since we start from 1 CE, not 0)
      return BCE_MAX_YEAR + year - 1;
    } else {
      // BCE years: index = BCE_MAX_YEAR + year (year is negative)
      return BCE_MAX_YEAR + year;
    }
  };
  
  const index = Math.max(0, Math.min(years.length - 1, getYearIndex(localYear)));
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
    maxDragAbsRef.current = 0;
    dragAccumulatorRef.current = 0;
  };

  // Drag move
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    const maxOffset = 40;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));

    buttonOffsetRef.current = clampedOffset;
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(calc(-50% + ${clampedOffset}px))`;
    }
    velocityRef.current = clampedOffset * 0.2;
    maxDragAbsRef.current = Math.max(maxDragAbsRef.current, Math.abs(clampedOffset));
  };

  // Drag end — final sync
  const handleMouseUp = () => {
    setIsDragging(false);
    // final confirm
    if (localYear !== globalYear) dispatch(setYear(localYear));
    buttonOffsetRef.current = 0;
    if (sliderRef.current) {
      sliderRef.current.style.transform = "translateX(-50%)";
    }
    dragAccumulatorRef.current = 0;

    // If the drag was tiny, interpret as a single step year
    if (maxDragAbsRef.current <= 6) {
      const dir = Math.sign(velocityRef.current || 0);
      if (dir !== 0) {
        const next = Math.max(
          -BCE_MAX_YEAR,
          Math.min(MAX_YEAR, getNextValidYear(localYear, dir))
        );
        if (next !== localYear) {
          setLocalYear(next);
          // commit once; avoid extra churn
          if (next !== globalYear) dispatch(setYear(next));
        }
      }
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
  // Speed expressed in years per frame to accumulate (60 FPS assumed)
  const maxSpeed = 1.2; // upper bound when fully dragged
  return Array.from({ length: 101 }, (_, i) => {
    const t = i / 100; // 0 → 1
    let speed;
    if (t < 0.2) {
      // very slow start
      speed = maxSpeed * Math.pow(t / 0.2, 3) * 0.05; // up to ~0.05*max
    } else if (t < 0.5) {
      // gradual ramp
      const n = (t - 0.2) / 0.3; // 0 → 1
      speed = maxSpeed * (0.05 + 0.25 * Math.pow(n, 2));
    } else {
      // accelerate to max
      const n = (t - 0.5) / 0.5; // 0 → 1
      speed = maxSpeed * (0.3 + 0.7 * n);
    }
    return speed;
  });
}, []);


  // Physics + inertia loop
  useEffect(() => {
    let frameId;
    const friction = 0.95;
    // Debounced commit to Redux to avoid 60fps global churn
    let commitTimer = 0;
    const scheduleCommit = (value) => {
      if (commitTimer) clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        if (value !== globalYear) dispatch(setYear(value));
      }, 120);
    };

    const animate = () => {
      const offset = buttonOffsetRef.current;

      if (isDragging && offset !== 0) {
        const t = Math.abs(offset) / 40;
        const speed = speedLookup[Math.min(100, Math.floor(t * 100))];

        // accumulate fractional movement for smooth, slow start
        dragAccumulatorRef.current += speed;
        const step = Math.floor(dragAccumulatorRef.current);
        if (step > 0) {
          const dir = offset > 0 ? 1 : -1;
          const target = Math.max(
            -BCE_MAX_YEAR,
            Math.min(MAX_YEAR, getNextValidYear(localYear, dir * step))
          );
          if (target !== localYear) {
            setLocalYear(target);
            // do NOT dispatch every frame; schedule a debounced commit
            scheduleCommit(target);
          }
          dragAccumulatorRef.current -= step;
        }

        velocityRef.current = offset * 0.12;
      } else if (!isDragging && Math.abs(velocityRef.current) > 0.1) {
        const inertiaSpeed = velocityRef.current * 0.15;
        const next =
          velocityRef.current > 0
            ? Math.min(MAX_YEAR, Math.round(getNextValidYear(localYear, inertiaSpeed)))
            : Math.max(-BCE_MAX_YEAR, Math.round(getNextValidYear(localYear, inertiaSpeed)));

        if (next !== localYear) {
          setLocalYear(next);
          // during inertia, still debounce global updates
          scheduleCommit(next);
        }

        velocityRef.current *= friction;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      if (commitTimer) clearTimeout(commitTimer);
      cancelAnimationFrame(frameId);
    };
  }, [isDragging, localYear, globalYear, speedLookup, dispatch]);

  // ----- Arrow hold with highway-like acceleration -----
  const stopHold = () => {
    holdDirRef.current = 0;
    stepAccumulatorRef.current = 0;
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    holdRafRef.current = 0;
  };

  const startHold = (dir) => {
    if (dir === 0) return;
    holdDirRef.current = dir;
    holdStartTsRef.current = performance.now();
    stepAccumulatorRef.current = 0;

    let lastTs = performance.now();
    const loop = (ts) => {
      if (holdDirRef.current === 0) return;
      const elapsed = Math.max(0, ts - holdStartTsRef.current);
      const dt = Math.max(0.001, (ts - lastTs) / 1000); // seconds
      lastTs = ts;

      // Acceleration profile: starts slow, ramps to fast over ~1200ms
      // Compute steps per second between 4 and 40
      const t = Math.min(1, elapsed / 1200);
      const stepsPerSec = 4 + Math.pow(t, 1.8) * (40 - 4);
      const stepsThisFrame = stepsPerSec * dt;
      stepAccumulatorRef.current += stepsThisFrame;
      const wholeSteps = Math.floor(stepAccumulatorRef.current);
      if (wholeSteps > 0) {
        stepAccumulatorRef.current -= wholeSteps;
        const delta = holdDirRef.current * wholeSteps;
        const next = Math.max(-BCE_MAX_YEAR, Math.min(MAX_YEAR, getNextValidYear(localYear, delta)));
        if (next !== localYear) {
          setLocalYear(next);
          dispatch(setYear(next));
        }
      }

      holdRafRef.current = requestAnimationFrame(loop);
    };
    holdRafRef.current = requestAnimationFrame(loop);
  };

  const handleArrowClick = (dir) => {
    const next = Math.max(-BCE_MAX_YEAR, Math.min(MAX_YEAR, getNextValidYear(localYear, dir)));
    if (next !== localYear) {
      setLocalYear(next);
      if (next !== globalYear) dispatch(setYear(next));
    }
  };

  // Parse input and set year
  const parseAndSetYear = (inputValue) => {
    const trimmedValue = inputValue.trim();
    
    // Match patterns like "400 BCE", "2023 CE", "400", "-400", etc.
    const bceMatch = trimmedValue.match(/(\d+)\s*BCE/i);
    const ceMatch = trimmedValue.match(/(\d+)\s*CE/i);
    const numberMatch = trimmedValue.match(/-?\d+/);
    
    let parsedYear = null;
    
    if (bceMatch) {
      // Parse BCE year (e.g., "400 BCE" -> -400)
      parsedYear = -parseInt(bceMatch[1]);
    } else if (ceMatch) {
      // Parse CE year (e.g., "2023 CE" -> 2023)
      parsedYear = parseInt(ceMatch[1]);
    } else if (numberMatch) {
      // Parse direct number (e.g., "400", "-400")
      parsedYear = parseInt(numberMatch[0]);
    }
    
    if (parsedYear !== null && !isNaN(parsedYear)) {
      // Skip year 0 - convert to 1 CE
      if (parsedYear === 0) {
        parsedYear = 1;
      }
      // Clamp to valid range
      const clampedYear = Math.max(-BCE_MAX_YEAR, Math.min(MAX_YEAR, parsedYear));
      setLocalYear(clampedYear);
      if (clampedYear !== globalYear) dispatch(setYear(clampedYear));
      setInputValue(formatYear(clampedYear));
      setShowGoButton(false); // Hide Go button after successful navigation
    } else {
      // Reset to current year if parsing fails
      setInputValue(formatYear(localYear));
      setShowGoButton(false); // Hide Go button on parse failure
    }
  };


  return (
    <Box sx={{ position: "fixed", left: 0, right: 0, width: "100vw", zIndex: 15, color: "#fff", pointerEvents: "none", bottom: 8 }}>
      {/* Year input */}
      <Box sx={{ textAlign: "center", mb: 2, fontSize: "24px", fontWeight: "bold", color: "#000", position: "relative", pointerEvents: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              // Allow free text input
              const newValue = e.target.value;
              setInputValue(newValue);
              
              // Show Go button when user is typing (different from current formatted year)
              const isTyping = newValue !== formatYear(localYear);
              setShowGoButton(isTyping);
            }}
            onBlur={() => {
              parseAndSetYear(inputValue);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                parseAndSetYear(inputValue);
              }
            }}
            style={{
              backgroundColor: "#fff",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              fontWeight: "bold",
              fontSize: "24px",
              textAlign: "center",
              color: "#000",
              outline: "none",
              width: `${Math.max(formatYear(localYear).length + 3, 8)}ch`,
              minWidth: "8ch",
              pointerEvents: "auto",
              placeholder: "e.g. 400 BCE or 2023 CE",
              transition: "border-color 0.2s ease",
            }}
          />
          
          {/* Go Button - appears when typing */}
          {showGoButton && (
            <Box
              sx={{
                backgroundColor: "#4CAF50",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                "&:hover": {
                  backgroundColor: "#45a049",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                },
                "&:active": {
                  transform: "translateY(0)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }
              }}
              onClick={() => {
                parseAndSetYear(inputValue);
              }}
            >
              Go
            </Box>
          )}
        </Box>
        
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
            pointerEvents: "none",
          }}
        />
      </Box>

      {/* Ruler */}
      <Box ref={containerRef} sx={{ position: "relative", height: 48, overflow: "hidden", mb: 0, pointerEvents: "none" }}>
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
          {formatYear(localYear)}
        </Box>

        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: (BCE_MAX_YEAR + MAX_YEAR) * TICK_SPACING_PX,
            transform: `translateX(${translateX}px)`,
            pointerEvents: "none",
          }}
        >
          {visibleYears.map(({ y, left }) => {
            const isDecade = y % 5 === 0;
            const tickHeight = isDecade ? 30 : 15;
            return (
              <Box key={y} sx={{ position: "absolute", left, pointerEvents: "none" }}>
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
          marginTop: "-10px",
          background: "rgba(0,0,0,0.28)",
          backdropFilter: "blur(2px)",
          pointerEvents: "auto",
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
          onMouseDown={(e)=>{ e.preventDefault(); startHold(-1); }}
          onMouseUp={()=> stopHold()}
          onMouseLeave={()=> stopHold()}
          onClick={()=> handleArrowClick(-1)}
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
          onMouseDown={(e)=>{ e.preventDefault(); startHold(1); }}
          onMouseUp={()=> stopHold()}
          onMouseLeave={()=> stopHold()}
          onClick={()=> handleArrowClick(1)}
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
            left: "50%",
            transform: "translateX(-50%)",
          }}
          onMouseDown={handleMouseDown}
        />
      </Box>
    </Box>
  );
}
