import { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import LiquidGlass from "./LiquidGlass";
import dyno from '../../assets/icons/dyno.png';

const HANDLE_BASE = "absolute z-[1000000] transition-all duration-200 ease-in-out";
const HANDLE_CORNER = `${HANDLE_BASE} !w-6 !h-6 z-[1000001] hover:bg-cyan-400/30`;

const ResizableWindow = ({
  children,
  initialPos = { x: 370, y: 140 },
  initialSize = { width: 550, height: 600 },
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState(initialPos);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [prevBounds, setPrevBounds] = useState(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const CLOSED_BUTTON_SIZE = isCompact ? 60 : 70;

  const headerStartRef = useRef({ x: 0, y: 0 });

  // Manual touch drag state (used for both bubble and open-window header on touch)
  const touchDraggingRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchStartWindowPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const touchCheck = window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window;
    setIsTouch(touchCheck);

    const handleResize = () => {
      const isPortraitMobile = window.innerWidth < 768;
      const isLandscapeMobile = window.innerHeight < 600;
      const mobileCheck = isPortraitMobile || isLandscapeMobile;
      setIsMobile(mobileCheck);
      if (mobileCheck) { setSize({ width: 325, height: 375 }); setPosition({ x: 55, y: 7 }); }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    const handleAutoOpen = () => setIsMinimized(false);
    window.addEventListener('trigger-know-more', handleAutoOpen);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener('trigger-know-more', handleAutoOpen);
    };
  }, []);

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

  const getSafePosition = (x, y, targetWidth, targetHeight) => {
    const w = typeof targetWidth === 'string' ? parseInt(targetWidth) : targetWidth;
    const h = typeof targetHeight === 'string' ? parseInt(targetHeight) : targetHeight;
    const padding = 10;
    const maxX = Math.max(0, window.innerWidth - w - padding);
    const maxY = Math.max(0, window.innerHeight - h - padding);
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY))
    };
  };

  const performMaximize = () => {
    if (isMinimized) {
      const safePos = getSafePosition(position.x, position.y, size.width, size.height);
      setPosition(safePos);
      setIsMinimized(false);
      return;
    }
    if (!isMaximized) {
      setPrevBounds({ x: position.x, y: position.y, width: size.width, height: size.height });
      setIsMaximized(true);
    } else {
      if (prevBounds) {
        const safePos = getSafePosition(prevBounds.x, prevBounds.y, prevBounds.width, prevBounds.height);
        setPosition(safePos);
        setSize({ width: prevBounds.width, height: prevBounds.height });
      }
      setIsMaximized(false);
    }
  };

  // ─── Mouse-only header (click to maximize) ───────────────────────────────
  const handleHeaderPointerDown = (e) => {
    if (e.pointerType === 'touch') return;
    headerStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleHeaderPointerUp = (e) => {
    if (e.pointerType === 'touch') return;
    const dx = Math.abs(e.clientX - headerStartRef.current.x);
    const dy = Math.abs(e.clientY - headerStartRef.current.y);
    if (dx < 5 && dy < 5) performMaximize();
  };

  // ─── Shared manual touch drag logic ──────────────────────────────────────
  const startTouchDrag = (touch, currentPos, currentSize) => {
    touchDraggingRef.current = false;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartWindowPosRef.current = { x: currentPos.x, y: currentPos.y };
  };

  const moveTouchDrag = (e, currentSize) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      touchDraggingRef.current = true;
      setIsDragging(true);
      const w = typeof currentSize.width === 'string' ? parseInt(currentSize.width) : currentSize.width;
      const h = typeof currentSize.height === 'string' ? parseInt(currentSize.height) : currentSize.height;
      const safe = getSafePosition(
        touchStartWindowPosRef.current.x + dx,
        touchStartWindowPosRef.current.y + dy,
        w, h
      );
      setPosition(safe);
    }
  };

  const endTouchDrag = (onTap) => {
    setIsDragging(false);
    if (!touchDraggingRef.current) onTap?.();
    touchDraggingRef.current = false;
  };

  // ─── Bubble (minimized) touch handlers ───────────────────────────────────
  const handleBubbleTouchStart = (e) => {
    startTouchDrag(e.touches[0], position, { width: CLOSED_BUTTON_SIZE, height: CLOSED_BUTTON_SIZE });
  };
  const handleBubbleTouchMove = (e) => {
    moveTouchDrag(e, { width: CLOSED_BUTTON_SIZE, height: CLOSED_BUTTON_SIZE });
  };
  const handleBubbleTouchEnd = () => {
    endTouchDrag(() => {
      const safePos = getSafePosition(position.x, position.y, size.width, size.height);
      setPosition(safePos);
      setIsMinimized(false);
    });
  };

  // Mouse-only bubble open
  const handleBubblePointerDown = (e) => {
    if (e.pointerType === 'touch') return;
    headerStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleBubblePointerUp = (e) => {
    if (e.pointerType === 'touch') return;
    const dx = Math.abs(e.clientX - headerStartRef.current.x);
    const dy = Math.abs(e.clientY - headerStartRef.current.y);
    if (dx < 5 && dy < 5) {
      const safePos = getSafePosition(position.x, position.y, size.width, size.height);
      setPosition(safePos);
      setIsMinimized(false);
    }
  };

  // ─── Open window header touch drag ───────────────────────────────────────
  const handleWindowHeaderTouchStart = (e) => {
    if (isMaximized) return;
    startTouchDrag(e.touches[0], position, size);
  };
  const handleWindowHeaderTouchMove = (e) => {
    if (isMaximized) return;
    moveTouchDrag(e, size);
  };
  const handleWindowHeaderTouchEnd = () => {
    endTouchDrag(null); // no tap action on header (maximize is mouse-only)
  };

  // ─── Buttons ──────────────────────────────────────────────────────────────
  const toggleMinimize = (e) => {
    e.stopPropagation();
    if (isMaximized) {
      setIsMaximized(false);
      if (prevBounds) {
        const safePos = getSafePosition(prevBounds.x, prevBounds.y, prevBounds.width, prevBounds.height);
        setPosition(safePos);
        setSize({ width: prevBounds.width, height: prevBounds.height });
      }
    } else if (isMinimized) {
      const safePos = getSafePosition(position.x, position.y, size.width, size.height);
      setPosition(safePos);
    }
    setIsMinimized(!isMinimized);
  };

  const toggleMaximizeButton = (e) => {
    e.stopPropagation();
    performMaximize();
  };

  const getTargetSize = () => {
    if (isMinimized) return { width: CLOSED_BUTTON_SIZE, height: CLOSED_BUTTON_SIZE };
    if (isMaximized) return { width: "100%", height: "100%" };
    return size;
  };

  const getTargetPos = () => {
    if (isMaximized && !isMinimized) return { x: 0, y: 0 };
    return position;
  };

  const transitionClass = isDragging
    ? "!transition-none"
    : "transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]";

  // Rnd dragging: fully disabled on touch (we handle it manually above)
  // so content taps can never trigger it
  const disableRndDragging = isTouch || (isMaximized && !isMinimized);

  return (
    <Rnd
      size={getTargetSize()}
      position={getTargetPos()}
      maxWidth="100vw"
      maxHeight="100vh"
      cancel=".no-drag"
      onDragStart={() => { setIsDragging(true); }}
      onDragStop={(e, d) => {
        setIsDragging(false);
        if (!isMaximized) setPosition({ x: d.x, y: d.y });
      }}
      onResizeStart={() => setIsDragging(true)}
      onResizeStop={(e, dir, ref, delta, pos) => {
        setIsDragging(false);
        if (!isMinimized && !isMaximized) {
          setSize({ width: ref.style.width, height: ref.style.height });
          setPosition(pos);
        }
      }}
      minWidth={isMinimized ? 45 : 150}
      minHeight={isMinimized ? 45 : 120}
      bounds="window"
      dragHandleClassName="drag-handle"
      resizeHandleClasses={{
        top: `${HANDLE_BASE} !h-[14px] !top-0 left-0 right-0 cursor-n-resize hover:bg-cyan-500/20`,
        bottom: `${HANDLE_BASE} !h-[14px] !bottom-0 left-0 right-0 cursor-s-resize hover:bg-cyan-500/20`,
        left: `${HANDLE_BASE} !w-[14px] !left-0 top-0 bottom-0 cursor-w-resize hover:bg-cyan-500/20`,
        right: `${HANDLE_BASE} !w-[14px] !right-0 top-0 bottom-0 cursor-e-resize hover:bg-cyan-500/20`,
        topRight: `${HANDLE_CORNER} !top-0 !right-0 cursor-ne-resize`,
        bottomRight: `${HANDLE_CORNER} !bottom-0 !right-0 cursor-se-resize`,
        bottomLeft: `${HANDLE_CORNER} !bottom-0 !left-0 cursor-sw-resize`,
        topLeft: `${HANDLE_CORNER} !top-0 !left-0 cursor-nw-resize`,
      }}
      disableDragging={disableRndDragging}
      enableResizing={!isMaximized && !isMinimized}
      className={`fixed flex flex-col box-border z-[999999] overflow-hidden ${isMinimized ? "rounded-full" : "rounded-2xl"} ${isMaximized && !isMinimized ? "!rounded-none" : ""} ${transitionClass}`}
    >
      {isMinimized ? (
        <div
          className="drag-handle w-full h-full rounded-full cursor-pointer relative flex items-center justify-center"
          onPointerDown={handleBubblePointerDown}
          onPointerUp={handleBubblePointerUp}
          onTouchStart={handleBubbleTouchStart}
          onTouchMove={handleBubbleTouchMove}
          onTouchEnd={handleBubbleTouchEnd}
          style={{
            background: 'rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            touchAction: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            padding: '2px',
            background: `conic-gradient(from 200deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.9) 60deg, rgba(255,255,255,1) 90deg, rgba(255,255,255,0.9) 120deg, rgba(255,255,255,0) 160deg, rgba(255,255,255,0) 200deg, rgba(255,255,255,0.35) 260deg, rgba(255,255,255,0.5) 290deg, rgba(255,255,255,0.35) 320deg, rgba(255,255,255,0) 360deg)`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            zIndex: 10,
          }} />
          <img
            src={dyno}
            alt=""
            className="pointer-events-none select-none"
            draggable={false}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 3,
            }}
          />
        </div>
      ) : (
        <LiquidGlass>
          <div className="flex flex-col h-full w-full relative">
            {/* Header: mouse drag via Rnd (disabled on touch), touch drag manually */}
            <div
              className="drag-handle flex justify-between items-center px-3 h-[34px] border-b border-white/20 cursor-move shrink-0 select-none bg-white/10 z-20"
              onPointerDown={handleHeaderPointerDown}
              onPointerUp={handleHeaderPointerUp}
              onTouchStart={handleWindowHeaderTouchStart}
              onTouchMove={handleWindowHeaderTouchMove}
              onTouchEnd={handleWindowHeaderTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-white dark:text-white text-[13px] potta-one">Dino</span>
              </div>
              <div
                className="no-drag flex gap-1.5"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                <button onClick={toggleMinimize} className="w-5 h-5 rounded-full bg-black/70 hover:bg-white/30 flex items-center justify-center text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button onClick={toggleMaximizeButton} className="w-5 h-5 rounded-full bg-black/70 hover:bg-white/30 flex items-center justify-center text-white">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content: block ALL touch events so Rnd never sees them */}
            <div
              className="no-drag flex-1 min-h-0 w-full relative p-2 z-20 overflow-auto"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              style={{ touchAction: 'auto' }}
            >
              {children}
            </div>
          </div>
        </LiquidGlass>
      )}
    </Rnd>
  );
};

export default ResizableWindow;