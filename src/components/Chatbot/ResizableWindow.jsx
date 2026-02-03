import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import LiquidGlass from "./LiquidGlass";


// Shared classes for resize handles
const HANDLE_BASE = "absolute z-[1000000] transition-all duration-200 ease-in-out";
const HANDLE_CORNER = `${HANDLE_BASE} !w-6 !h-6 z-[1000001] hover:bg-cyan-400/30`;

const ResizableWindow = ({
  children,
  initialPos = { x: 330, y: 10 },
  initialSize = { width: 550, height: 600 },
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPosition] = useState(initialPos);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [prevBounds, setPrevBounds] = useState(null);
  
  // Refs for logic
  const isDraggingRef = useRef(false);
  
  // We need separate refs for Header vs Bubble to avoid conflicts
  const headerStartRef = useRef({ x: 0, y: 0 });
  const bubbleStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleAutoOpen = () => {
      setIsMinimized(false);
    };
    window.addEventListener('trigger-know-more', handleAutoOpen);
    return () => {
      window.removeEventListener('trigger-know-more', handleAutoOpen);
    };
  }, []);

  // --- Core Maximize Logic ---
  const performMaximize = () => {
    if (isMinimized) {
      setIsMinimized(false);
      return;
    }
    if (!isMaximized) {
      setPrevBounds({ x: position.x, y: position.y, width: size.width, height: size.height });
      setPosition({ x: 0, y: 0 });
      setSize({ width: "100%", height: "100%" });
    } else {
      if (prevBounds) {
        setPosition({ x: prevBounds.x, y: prevBounds.y });
        setSize({ width: prevBounds.width, height: prevBounds.height });
      }
    }
    setIsMaximized(!isMaximized);
  };

  // --- HEADER HANDLERS (Maximize) ---
  const handleHeaderPointerDown = (e) => {
    // Record where we started touching the header
    headerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleHeaderPointerUp = (e) => {
    // Calculate distance moved
    const deltaX = Math.abs(e.clientX - headerStartRef.current.x);
    const deltaY = Math.abs(e.clientY - headerStartRef.current.y);

    // If moved less than 5px, it's a CLICK (Tap), not a drag.
    if (deltaX < 5 && deltaY < 5) {
      // Logic: If on desktop (mouse), allow dragging check? 
      // Actually, standardizing on Pointer events solves both.
      performMaximize();
    }
  };

  // --- BUBBLE HANDLERS (Minimize Restore) ---
  // This is the "Alternative Method" -> Manual coordinate checking
  const handleBubblePointerDown = (e) => {
    bubbleStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleBubblePointerUp = (e) => {
    // Calculate how far the bubble was dragged
    const deltaX = Math.abs(e.clientX - bubbleStartRef.current.x);
    const deltaY = Math.abs(e.clientY - bubbleStartRef.current.y);

    // If moved less than 5px, treat it as a TAP to open
    // This ignores Rnd's "isDragging" state completely.
    if (deltaX < 5 && deltaY < 5) {
      setIsMinimized(false);
    }
  };

  // --- BUTTON HANDLERS ---
  const toggleMinimize = (e) => {
    e.stopPropagation(); // Stop event from reaching the header
    // e.nativeEvent.stopImmediatePropagation(); // Hard stop for some browsers
    
    if (isMaximized) {
      setIsMaximized(false);
      if (prevBounds) {
        setPosition({ x: prevBounds.x, y: prevBounds.y });
        setSize({ width: prevBounds.width, height: prevBounds.height });
      }
    }
    setIsMinimized(!isMinimized);
  };

  const toggleMaximizeButton = (e) => {
    e.stopPropagation();
    performMaximize();
  };

  // --- Layout Helpers ---
  const getTargetSize = () => isMinimized ? { width: 64, height: 64 } : isMaximized ? { width: "100%", height: "100%" } : size;
  const getTargetPos = () => isMaximized && !isMinimized ? { x: 0, y: 0 } : position;
  const transitionClass = isDragging ? "transition-none" : "transition-[width,height,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]";

  return (
    <Rnd
      size={getTargetSize()}
      position={getTargetPos()}
      cancel=".no-drag"
      onDragStart={() => { 
        setIsDragging(true); 
        isDraggingRef.current = true; 
      }}
      onDragStop={(e, d) => { 
        setIsDragging(false); 
        if (!isMaximized) setPosition({ x: d.x, y: d.y }); 
        setTimeout(() => { isDraggingRef.current = false; }, 100); 
      }}
      onResizeStart={() => setIsDragging(true)}
      onResizeStop={(e, dir, ref, delta, pos) => { setIsDragging(false); if (!isMinimized && !isMaximized) { setSize({ width: ref.style.width, height: ref.style.height }); setPosition(pos); } }}
      minWidth={isMinimized ? 60 : 320}
      minHeight={isMinimized ? 60 : 350}
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
      disableDragging={isMaximized && !isMinimized}
      enableResizing={!isMaximized && !isMinimized}
      className={`fixed flex flex-col box-border z-[999999] overflow-hidden ${isMinimized ? "rounded-full" : "rounded-2xl"} ${isMaximized && !isMinimized ? "!rounded-none" : ""} ${transitionClass}`}
    >
      <LiquidGlass>
        
        {/* --- MINIMIZED BUBBLE (FIXED) --- */}
        <div 
           className={`rounded-full drag-handle w-full h-full bg-zinc-500/60 border-1 border-zinc-400 items-center justify-center cursor-pointer text-white ${ isMinimized ? "flex" : "hidden" }`} 
           // Replaced onClick with Pointer Events to bypass Drag conflicts
           onPointerDown={handleBubblePointerDown}
           onPointerUp={handleBubblePointerUp}
        >
          <img src="/logo/dyno.png" alt="" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
        </div>

        {/* --- MAXIMIZED CONTENT --- */}
        <div className={`${!isMinimized ? "flex" : "hidden"} flex-col h-full w-full relative`}>
          
          {/* Header */}
          <div 
            className="drag-handle flex justify-between items-center px-4 h-[40px] border-b border-white/20 cursor-move shrink-0 select-none bg-white/10 z-20"
            // Using Pointer Events here too for consistency
            onPointerDown={handleHeaderPointerDown}
            onPointerUp={handleHeaderPointerUp}
          >
             <div className="flex items-center gap-3">
               <span className=" text-white dark:text-white text-[15px] potta-one">Happy Dyno</span>
             </div>

             {/* BUTTONS CONTAINER */}
             <div 
                className="no-drag flex gap-2" 
                // Stop propagation on everything to be safe
                onPointerDown={(e) => e.stopPropagation()} 
                onPointerUp={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
             >
                <button 
                  onClick={toggleMinimize} 
                  className="w-6 h-6 rounded-full bg-black/70 hover:bg-white/30 flex items-center justify-center text-white"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button 
                  onClick={toggleMaximizeButton} 
                  className="w-6 h-6 rounded-full bg-black/70 hover:bg-white/30 flex items-center justify-center text-white"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                </button>
             </div>
          </div>

          {/* User Children (Content) */}
          <div className="flex-1 min-h-0 w-full relative p-2 z-20 overflow-auto">
            {children}
          </div>
        </div>
      </LiquidGlass>
    </Rnd>
  );
};

export default ResizableWindow;