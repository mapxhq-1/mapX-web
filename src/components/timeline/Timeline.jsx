import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box } from "@mui/material";
import { isMaRange, maBinToYear, yearToMaBin, MA_BINS, MA_MIN_YEAR } from "../../utils/era";

const BCE_BOUNDARY_YEAR = -4500;
const MAX_YEAR = 2025;
const BCE_MAX_YEAR = 4500;
const MIN_YEAR = MA_MIN_YEAR;
const FIRST_MA_YEAR = maBinToYear(MA_BINS[0]);
const TICK_SPACING_PX = 20;

const clampYear = (value) => Math.max(MIN_YEAR, Math.min(MAX_YEAR, value));

const getSpeedScale = (year) => {
  return isMaRange(year) ? 0.2 : 1; // tune 0.08 → 0.05 if you want it even slower
};

const snapToMaBin = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (!MA_BINS.length) return null;

  let best = MA_BINS[0];
  let bestDiff = Math.abs(best - numeric);
  for (let i = 1; i < MA_BINS.length; i++) {
    const candidate = MA_BINS[i];
    const diff = Math.abs(candidate - numeric);
    if (diff < bestDiff || (diff === bestDiff && candidate > best)) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return best;
};

const getMaIndex = (year) => {
  const maBin = yearToMaBin(year);
  if (maBin === null) return null;
  const idx = MA_BINS.indexOf(maBin);
  if (idx !== -1) return idx;

  let bestIdx = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < MA_BINS.length; i++) {
    const diff = Math.abs(MA_BINS[i] - maBin);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const stepYear = (year, direction) => {
  const dir = direction > 0 ? 1 : -1;

  if (dir === 0) return clampYear(year);

  if (isMaRange(year)) {
    const index = getMaIndex(year);
    if (index === null) return clampYear(year);

    if (dir > 0) {
      if (index > 0) {
        return maBinToYear(MA_BINS[index - 1]);
      }
      return BCE_BOUNDARY_YEAR;
    }

    if (index < MA_BINS.length - 1) {
      return maBinToYear(MA_BINS[index + 1]);
    }
    return clampYear(year);
  }

  if (year === BCE_BOUNDARY_YEAR && dir < 0) {
    return FIRST_MA_YEAR;
  }

  let next = year + dir;
  if (next === 0) {
    next += dir;
  }

  return clampYear(next);
};

const getNextValidYear = (year, delta) => {
  if (!Number.isFinite(delta) || delta === 0) {
    return clampYear(year);
  }

  const dir = delta > 0 ? 1 : -1;
  let steps = Math.abs(Math.trunc(delta));
  if (steps === 0) steps = 1;

  let current = year;
  for (let i = 0; i < steps; i++) {
    const next = stepYear(current, dir);
    if (next === current) break;
    current = next;
  }

  return clampYear(current);
};

const formatYear = (year) => {
  if (isMaRange(year)) {
    const maBin = yearToMaBin(year);
    return maBin ? `${maBin} Ma` : `${MA_BINS[0]} Ma`;
  }
  if (year > 0) {
    return `${year} CE`;
  }
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return "1 CE";
};

export default function Timeline() {
  const dispatch = useDispatch();
  const globalYear = useSelector((state) => state.map.year);

  // Local year for smooth dragging
  const [localYear, setLocalYear] = useState(globalYear);
  const [inputValue, setInputValue] = useState(formatYear(globalYear));
  const [showGoButton, setShowGoButton] = useState(false);

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


  // Precompute years: Ma bins (oldest to newest), then BCE, then CE
  const years = useMemo(() => {
    const maYears = MA_BINS.slice().reverse().map((bin) => maBinToYear(bin));
    const bceYears = Array.from({ length: BCE_MAX_YEAR }, (_, i) => BCE_BOUNDARY_YEAR + i);
    const ceYears = Array.from({ length: MAX_YEAR }, (_, i) => i + 1);
    return [...maYears, ...bceYears, ...ceYears];
  }, []);

  // Virtualization setup
  const getYearIndex = (year) => {
    if (isMaRange(year)) {
      const index = getMaIndex(year);
      if (index === null) return 0;
      return MA_BINS.length - 1 - index;
    }

    if (year < 0) {
      return MA_BINS.length + (year - BCE_BOUNDARY_YEAR);
    }

    if (year > 0) {
      return MA_BINS.length + BCE_MAX_YEAR + year - 1;
    }

    return MA_BINS.length + BCE_MAX_YEAR;
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

  // Unified drag handlers that work with both mouse and touch
  const getClientX = (e) => {
    // Handle both mouse and touch events
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return e.changedTouches[0].clientX;
    }
    return e.clientX;
  };

  // Drag start - unified for mouse and touch
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = getClientX(e);
    velocityRef.current = 0;
    maxDragAbsRef.current = 0;
    dragAccumulatorRef.current = 0;
  };

  // Drag move - unified for mouse and touch
  const handleDragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const currentX = getClientX(e);
    const deltaX = currentX - dragStartX.current;
    const maxOffset = 40;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));

    buttonOffsetRef.current = clampedOffset;
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(calc(-50% + ${clampedOffset}px))`;
    }
    velocityRef.current = clampedOffset * 0.2;
    maxDragAbsRef.current = Math.max(maxDragAbsRef.current, Math.abs(clampedOffset));
  };

  // Drag end — final sync - unified for mouse and touch
  const handleDragEnd = (e) => {
    if (e) e.preventDefault();
    setIsDragging(false);

    let finalYear = clampYear(localYear);
    if (isMaRange(finalYear)) {
      const index = getMaIndex(finalYear);
      if (index !== null) {
        const snappedYear = maBinToYear(MA_BINS[index]);
        if (snappedYear !== finalYear) {
          finalYear = snappedYear;
          setLocalYear(snappedYear);
        }
      }
    }

    if (finalYear !== globalYear) dispatch(setYear(finalYear));

    buttonOffsetRef.current = 0;
    if (sliderRef.current) {
      sliderRef.current.style.transform = "translateX(-50%)";
    }
    dragAccumulatorRef.current = 0;

    if (maxDragAbsRef.current <= 6) {
      const dir = Math.sign(velocityRef.current || 0);
      if (dir !== 0) {
        const next = getNextValidYear(finalYear, dir);
        if (next !== finalYear) {
          setLocalYear(next);
          if (next !== globalYear) dispatch(setYear(next));
        }
      }
    }

    maxDragAbsRef.current = 0;
  };

  // Legacy mouse handlers for backward compatibility
  const handleMouseDown = handleDragStart;
  const handleMouseMove = handleDragMove;
  const handleMouseUp = handleDragEnd;

  // Touch handlers for slider (direct wrappers)
  const handleTouchStart = (e) => {
    handleDragStart(e);
  };

  const handleTouchMove = (e) => {
    handleDragMove(e);
  };

  const handleTouchEnd = (e) => {
    handleDragEnd(e);
  };

  // Global event listeners for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleDragMove(e);
    const handleGlobalMouseUp = (e) => handleDragEnd(e);
    const handleGlobalTouchMove = (e) => {
      if (isDragging) {
        handleDragMove(e);
      }
    };
    const handleGlobalTouchEnd = (e) => {
      if (isDragging) {
        handleDragEnd(e);
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove, { passive: false });
      document.addEventListener("mouseup", handleGlobalMouseUp, { passive: false });
      document.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
      document.addEventListener("touchend", handleGlobalTouchEnd, { passive: false });
      document.addEventListener("touchcancel", handleGlobalTouchEnd, { passive: false });
    }
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
      document.removeEventListener("touchcancel", handleGlobalTouchEnd);
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
        const t = Math.min(1, Math.abs(offset) / 40);
        //const speed = speedLookup[Math.min(100, Math.floor(t * 100))];
        const baseSpeed = speedLookup[Math.min(100, Math.floor(t * 100))];
        const scale = getSpeedScale(localYear);
        const speed = baseSpeed * scale;

        dragAccumulatorRef.current += speed;
        const steps = Math.floor(dragAccumulatorRef.current);
        if (steps > 0) {
          const direction = offset > 0 ? 1 : -1;
          let current = localYear;
          for (let i = 0; i < steps; i++) {
            const candidate = getNextValidYear(current, direction);
            if (candidate === current) break;
            current = candidate;
          }

          if (current !== localYear) {
            setLocalYear(current);
            dispatch(setYear(current));
          }

          dragAccumulatorRef.current -= steps;
        }

        velocityRef.current = offset * 0.12;
      } else if (!isDragging && Math.abs(velocityRef.current) > 0.1) {
        //const inertiaSpeed = velocityRef.current * 0.15;
        const scale = getSpeedScale(localYear);
        const inertiaSpeed = velocityRef.current * 0.15 * scale;

        const steps = Math.abs(Math.round(inertiaSpeed));
        if (steps > 0) {
          const direction = velocityRef.current > 0 ? 1 : -1;
          let current = localYear;
          for (let i = 0; i < steps; i++) {
            const candidate = getNextValidYear(current, direction);
            if (candidate === current) break;
            current = candidate;
          }

          if (current !== localYear) {
            setLocalYear(current);
            dispatch(setYear(current));
          }
        }

        velocityRef.current *= friction;
        if (Math.abs(velocityRef.current) < 0.01) velocityRef.current = 0;
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
      //const stepsPerSec = 4 + Math.pow(t, 1.8) * (40 - 4);
      const baseStepsPerSec = 4 + Math.pow(t, 1.8) * (40 - 4);
      const scale = getSpeedScale(localYear);
      const stepsPerSec = baseStepsPerSec * scale;

      const stepsThisFrame = stepsPerSec * dt;
      stepAccumulatorRef.current += stepsThisFrame;
      const wholeSteps = Math.floor(stepAccumulatorRef.current);
      if (wholeSteps > 0) {
        stepAccumulatorRef.current -= wholeSteps;
        let current = localYear;
        for (let i = 0; i < wholeSteps; i++) {
          const candidate = getNextValidYear(current, holdDirRef.current);
          if (candidate === current) break;
          current = candidate;
        }

        if (current !== localYear) {
          setLocalYear(current);
          dispatch(setYear(current));
        }
      }

      holdRafRef.current = requestAnimationFrame(loop);
    };
    holdRafRef.current = requestAnimationFrame(loop);
  };

  const handleArrowClick = (dir) => {
    const next = getNextValidYear(localYear, dir);
    if (next !== localYear) {
      setLocalYear(next);
      if (next !== globalYear) dispatch(setYear(next));
    }
  };

  // Unified arrow button handlers for touch and mouse
  const handleArrowStart = (dir, e) => {
    if (e) e.preventDefault();
    startHold(dir);
  };

  const handleArrowEnd = (e) => {
    if (e) e.preventDefault();
    stopHold();
  };

  const handleArrowClickOrTouch = (dir, e) => {
    if (e) e.preventDefault();
    // Only trigger click action if hold hasn't started (very brief touch)
    const timeSinceStart = performance.now() - holdStartTsRef.current;
    if (timeSinceStart < 150) {
      handleArrowClick(dir);
    }
  };

  // Parse input and set year
  const parseAndSetYear = (inputValue) => {
    const trimmedValue = inputValue.trim();

    const maMatch = trimmedValue.match(/^(\d{1,3})\s*Ma/i);
    if (maMatch) {
      const maValue = Number(maMatch[1]);
      if (Number.isFinite(maValue) && maValue >= 1) {
        const snapped = maValue === 1 ? 1 : snapToMaBin(maValue);
        if (snapped !== null) {
          const year = maBinToYear(snapped);
          setLocalYear(year);
          if (year !== globalYear) dispatch(setYear(year));
          setInputValue(formatYear(year));
          setShowGoButton(false);
          return;
        }
      }
    }

    // Match patterns like "400 BCE", "2023 CE", "400", "-400", etc.
    const bceMatch = trimmedValue.match(/(\d+)\s*BCE/i);
    const ceMatch = trimmedValue.match(/(\d+)\s*CE/i);
    const numberMatch = trimmedValue.match(/-?\d+/);

    let parsedYear = null;

    if (bceMatch) {
      parsedYear = -parseInt(bceMatch[1], 10);
    } else if (ceMatch) {
      parsedYear = parseInt(ceMatch[1], 10);
    } else if (numberMatch) {
      parsedYear = parseInt(numberMatch[0], 10);
    }

    if (parsedYear !== null && Number.isFinite(parsedYear)) {
      if (parsedYear === 0) {
        parsedYear = 1;
      }
      const clampedYear = clampYear(parsedYear);
      setLocalYear(clampedYear);
      if (clampedYear !== globalYear) dispatch(setYear(clampedYear));
      setInputValue(formatYear(clampedYear));
      setShowGoButton(false);
    } else {
      setInputValue(formatYear(localYear));
      setShowGoButton(false);
    }
  };


  return (
    <Box sx={{ position: "fixed", left: 0, right: 0, width: "100vw", zIndex: 15, color: "#fff", pointerEvents: "none", bottom: 8 }}>
      {/* Year input */}
      <Box sx={{ textAlign: "center", mb: 2, fontSize: "24px", fontWeight: "bold", color: "#000", position: "relative", pointerEvents: "none" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 1, pointerEvents: "auto", width: "fit-content", margin: "0 auto" }}>
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
              placeholder: "e.g. 100 Ma, 400 BCE, or 2023 CE",
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
            width: (MA_BINS.length + BCE_MAX_YEAR + MAX_YEAR) * TICK_SPACING_PX,
            transform: `translateX(${translateX}px)`,
            pointerEvents: "none",
          }}
        >
          {visibleYears.map(({ y, left }) => {
            let isMajorTick = false;
            if (isMaRange(y)) {
              const maBin = yearToMaBin(y);
              isMajorTick = maBin !== null && maBin % 50 === 0;
            } else {
              isMajorTick = y % 5 === 0;
            }
            const tickHeight = isMajorTick ? 30 : 15;
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
            top : "0",
            cursor: "pointer",
            userSelect: "none",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
          onMouseDown={(e) => handleArrowStart(-1, e)}
          onMouseUp={handleArrowEnd}
          onMouseLeave={handleArrowEnd}
          onClick={(e) => handleArrowClickOrTouch(-1, e)}
          onTouchStart={(e) => handleArrowStart(-1, e)}
          onTouchEnd={(e) => {
            handleArrowEnd(e);
            handleArrowClickOrTouch(-1, e);
          }}
          onTouchCancel={handleArrowEnd}
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
            top : "0.4px",
            cursor: "pointer",
            userSelect: "none",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
          onMouseDown={(e) => handleArrowStart(1, e)}
          onMouseUp={handleArrowEnd}
          onMouseLeave={handleArrowEnd}
          onClick={(e) => handleArrowClickOrTouch(1, e)}
          onTouchStart={(e) => handleArrowStart(1, e)}
          onTouchEnd={(e) => {
            handleArrowEnd(e);
            handleArrowClickOrTouch(1, e);
          }}
          onTouchCancel={handleArrowEnd}
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
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "transform 100ms ease-out",
            touchAction: "none",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            "&:active": {
              boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
            },
            left: "50%",
            transform: "translateX(-50%)",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />
      </Box>
    </Box>
  );
}