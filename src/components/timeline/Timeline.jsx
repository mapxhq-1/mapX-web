import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear } from "../../store/mapSlice";
import { Box } from "@mui/material";
import { isMaRange, maBinToYear, yearToMaBin, MA_BINS, MA_MIN_YEAR } from "../../utils/era";
import metalTexture from './metalSlider.png';

const BCE_BOUNDARY_YEAR = -4500;
const MAX_YEAR = 2026;
const BCE_MAX_YEAR = 4500;
const MIN_YEAR = MA_MIN_YEAR;
const FIRST_MA_YEAR = maBinToYear(MA_BINS[0]);
const TICK_SPACING_PX = 20;

const clampYear = (value) => Math.max(MIN_YEAR, Math.min(MAX_YEAR, value));

const getSpeedScale = (year) => {
  return isMaRange(year) ? 0.2 : 1; 
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
      if (index > 0) return maBinToYear(MA_BINS[index - 1]);
      return BCE_BOUNDARY_YEAR;
    }

    if (index < MA_BINS.length - 1) return maBinToYear(MA_BINS[index + 1]);
    return clampYear(year);
  }

  if (year === BCE_BOUNDARY_YEAR && dir < 0) return FIRST_MA_YEAR;

  let next = year + dir;
  if (next === 0) next += dir;

  return clampYear(next);
};

const getNextValidYear = (year, delta) => {
  if (!Number.isFinite(delta) || delta === 0) return clampYear(year);

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
  if (year > 0) return `${year} CE`;
  if (year < 0) return `${Math.abs(year)} BCE`;
  return "1 CE";
};

export default function Timeline() {
  const dispatch = useDispatch();
  const globalYear = useSelector((state) => state.map.year);

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

  const holdDirRef = useRef(0); 
  const holdStartTsRef = useRef(0);
  const holdRafRef = useRef(0);
  const stepAccumulatorRef = useRef(0);
  const sliderBindingRef = useRef(null);

  // --- COMPACT DETECTION ---
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const checkSize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isShort = window.innerHeight < 600;
      setIsCompact(isLandscape && isShort);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // --- DYNAMIC STYLES ---
  const styles = {
    // Lifted up from the bottom
    bottom: isCompact ? 12 : 24, 
    
    inputMargin: isCompact ? 0.5 : 2,
    inputPadding: isCompact ? "4px 8px" : "8px 12px",
    inputFontSize: isCompact ? "14px" : "24px",
    
    goBtnSize: isCompact ? "w-8 h-8 text-[10px]" : "w-15 h-15 text-lg",
    
    rulerHeight: isCompact ? 24 : 48,
    labelTop: isCompact ? -16 : -22,
    labelFontSize: isCompact ? 10 : 12,
    
    sliderContainerWidth: isCompact ? 80 : 109,
    sliderContainerHeight: isCompact ? 32 : 44,
    sliderButtonWidth: isCompact ? 46 : 62,
    sliderButtonHeight: isCompact ? 20 : 27,
    arrowFontSize: isCompact ? "18px" : "24px",
    arrowOffset: isCompact ? "4px" : "7px",
    
    tickMajor: isCompact ? 16 : 30,
    tickMinor: isCompact ? 8 : 15,
  };

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

  useEffect(() => {
    const animating = isDragging || buttonOffsetRef.current !== 0 || Math.abs(velocityRef.current) > 0.1;
    if (!animating && globalYear !== localYear) {
      setLocalYear(globalYear);
      setInputValue(formatYear(globalYear));
    }
  }, [globalYear, isDragging, localYear]);

  useEffect(() => {
    setInputValue(formatYear(localYear));
  }, [localYear]);

  useEffect(() => {
  const slider = sliderRef.current; // Use the same ref as the JSX
  if (!slider) return;

  const onTouchStart = (e) => handleDragStart(e);
  const onTouchMove = (e) => handleDragMove(e);
  const onTouchEnd = (e) => handleDragEnd(e);

  // Bind with passive: false to allow preventDefault()
  slider.addEventListener("touchstart", onTouchStart, { passive: false });
  slider.addEventListener("touchmove", onTouchMove, { passive: false });
  slider.addEventListener("touchend", onTouchEnd);
  slider.addEventListener("touchcancel", onTouchEnd);

  return () => {
    slider.removeEventListener("touchstart", onTouchStart);
    slider.removeEventListener("touchmove", onTouchMove);
    slider.removeEventListener("touchend", onTouchEnd);
    slider.removeEventListener("touchcancel", onTouchEnd);
  };
}, [isDragging]);

  const years = useMemo(() => {
    const maYears = MA_BINS.slice().reverse().map((bin) => maBinToYear(bin));
    const bceYears = Array.from({ length: BCE_MAX_YEAR }, (_, i) => BCE_BOUNDARY_YEAR + i);
    const ceYears = Array.from({ length: MAX_YEAR }, (_, i) => i + 1);
    return [...maYears, ...bceYears, ...ceYears];
  }, []);

  const getYearIndex = (year) => {
    if (isMaRange(year)) {
      const index = getMaIndex(year);
      if (index === null) return 0;
      return MA_BINS.length - 1 - index;
    }
    if (year < 0) return MA_BINS.length + (year - BCE_BOUNDARY_YEAR);
    if (year > 0) return MA_BINS.length + BCE_MAX_YEAR + year - 1;
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

  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
    return e.clientX;
  };

  const handleDragStart = (e) => {
    if (e.cancelable) e.preventDefault();
    setIsDragging(true);
    dragStartX.current = getClientX(e);
    velocityRef.current = 0;
    maxDragAbsRef.current = 0;
    dragAccumulatorRef.current = 0;
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
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

  const handleMouseDown = handleDragStart;
  const handleMouseMove = handleDragMove;
  const handleMouseUp = handleDragEnd;

  const handleTouchStart = (e) => handleDragStart(e);
  const handleTouchMove = (e) => handleDragMove(e);
  const handleTouchEnd = (e) => handleDragEnd(e);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleDragMove(e);
    const handleGlobalMouseUp = (e) => handleDragEnd(e);
    const handleGlobalTouchMove = (e) => { if (isDragging) handleDragMove(e); };
    const handleGlobalTouchEnd = (e) => { if (isDragging) handleDragEnd(e); };

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

const speedLookup = useMemo(() => {
  const maxSpeed = 1.2; 
  return Array.from({ length: 101 }, (_, i) => {
    const t = i / 100; 
    let speed;
    if (t < 0.2) speed = maxSpeed * Math.pow(t / 0.2, 3) * 0.05; 
    else if (t < 0.5) {
      const n = (t - 0.2) / 0.3; 
      speed = maxSpeed * (0.05 + 0.25 * Math.pow(n, 2));
    } else {
      const n = (t - 0.5) / 0.5; 
      speed = maxSpeed * (0.3 + 0.7 * n);
    }
    return speed;
  });
}, []);

  useEffect(() => {
    let frameId;
    const friction = 0.95;
    let commitTimer = 0;

    const animate = () => {
      const offset = buttonOffsetRef.current;

      if (isDragging && offset !== 0) {
        const t = Math.min(1, Math.abs(offset) / 40);
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
      const dt = Math.max(0.001, (ts - lastTs) / 1000); 
      lastTs = ts;

      const t = Math.min(1, elapsed / 1200);
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

  const handleArrowStart = (dir, e) => { if (e) e.preventDefault(); startHold(dir); };
  const handleArrowEnd = (e) => { if (e) e.preventDefault(); stopHold(); };
  const handleArrowClickOrTouch = (dir, e) => {
    if (e) e.preventDefault();
    const timeSinceStart = performance.now() - holdStartTsRef.current;
    if (timeSinceStart < 150) handleArrowClick(dir);
  };

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

    const bceMatch = trimmedValue.match(/(\d+)\s*BCE/i);
    const ceMatch = trimmedValue.match(/(\d+)\s*CE/i);
    const numberMatch = trimmedValue.match(/-?\d+/);

    let parsedYear = null;
    if (bceMatch) parsedYear = -parseInt(bceMatch[1], 10);
    else if (ceMatch) parsedYear = parseInt(ceMatch[1], 10);
    else if (numberMatch) parsedYear = parseInt(numberMatch[0], 10);

    if (parsedYear !== null && Number.isFinite(parsedYear)) {
      if (parsedYear === 0) parsedYear = 1;
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
    <Box sx={{ position: "fixed", left: 0, right: 0, width: "100vw", zIndex: 15, color: "#fff", pointerEvents: "none", bottom: styles.bottom }}>
      
      {/* Input */}
      <Box sx={{ textAlign: "center", mb: styles.inputMargin, fontSize: styles.inputFontSize, fontWeight: "bold", color: "#000", position: "relative", pointerEvents: "none" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 1, pointerEvents: "auto", width: "fit-content", margin: "0 auto" }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setInputValue(newValue);
              setShowGoButton(newValue !== formatYear(localYear));
            }}
            onBlur={() => parseAndSetYear(inputValue)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); parseAndSetYear(inputValue); }}}
            style={{
              backgroundColor: "#fff",
              padding: styles.inputPadding,
              borderRadius: "100px",
              borderTop: "3px solid rgba(0, 0, 0, 0.2)",
              fontWeight: "bold",
              fontSize: styles.inputFontSize,
              textAlign: "center",
              color: "#000",
              outline: "none",
              width: `${Math.max(formatYear(localYear).length + 3, 8)}ch`,
              minWidth: "8ch",
              pointerEvents: "auto",
              transition: "border-color 0.2s ease",
            }}
          />
          
          {showGoButton && (
            <button
              onClick={() => parseAndSetYear(inputValue)}
              className={`flex items-center justify-center rounded-full bg-green-600 hover:bg-green-500 bg-gradient-to-b from-green-500 to-green-700 text-white font-bold border-b-4 border-green-900/30 ring-1 ring-white/20 transition-all duration-200 ease-in-out active:scale-95 active:border-b-0 active:translate-y-1 hover:scale-105 hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] ${styles.goBtnSize}`}
            >
              GO
            </button>
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
      <Box ref={containerRef} sx={{ position: "relative", height: styles.rulerHeight, overflow: "hidden", mb: 0, pointerEvents: "none" }}>
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: styles.labelTop,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: styles.labelFontSize,
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
            const tickHeight = isMajorTick ? styles.tickMajor : styles.tickMinor;
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
                height: styles.sliderContainerHeight,
                width: styles.sliderContainerWidth,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${metalTexture})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "2px solid rgba(255,255,255,0.2)",
                borderRadius: "20px",
                padding: "6px",
                margin: "0 auto",
                marginTop: "-10px",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)",
                pointerEvents: "auto",
              }}
            >
        <Box
          sx={{
            position: "absolute",
            left: styles.arrowOffset,
            color: "rgba(255,255,255,0.6)",
            fontSize: styles.arrowFontSize,
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
            right: styles.arrowOffset,
            color: "rgba(255,255,255,0.6)",
            fontSize: styles.arrowFontSize,
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
          onMouseDown={handleMouseDown}
          sx={{
            position: "absolute",
            width: styles.sliderButtonWidth,
            height: styles.sliderButtonHeight,
            backgroundImage: `url(${metalTexture})`,
            backgroundColor: "#ccc", 
            backgroundSize: "cover", 
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.5)",
            borderRadius: "16px",
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "transform 100ms ease-out",
            touchAction: "none",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            "&:active": {
              filter: "brightness(0.85)", 
              transform: "translateX(-50%) scale(0.98)", 
            },
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </Box>
    </Box>
  );
}