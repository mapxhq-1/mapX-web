import React, { useState, useRef } from "react";
import { Rnd } from "react-rnd";

const ResizableWindow = ({
  children,
  initialPos = { x: 100, y: 100 },
  initialSize = { width: 380, height: 600 },
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [position, setPosition] = useState(initialPos);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [prevBounds, setPrevBounds] = useState(null);
  
  const isDraggingRef = useRef(false);

  // --- Handlers ---
  const handleHeaderClick = () => {
    if (isDraggingRef.current) return;
    if (isMinimized) { setIsMinimized(false); return; }
    
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

  const handleBubbleClick = () => {
    if (isDraggingRef.current) return;
    setIsMinimized(false);
  };

  const toggleMinimize = (e) => { e?.stopPropagation(); setIsMinimized(!isMinimized); };
  const toggleMaximizeButton = (e) => { e?.stopPropagation(); handleHeaderClick(); };

  // --- Layout Helpers ---
  const getTargetSize = () => (isMinimized ? { width: 64, height: 64 } : isMaximized ? { width: "100%", height: "100%" } : size);
  const getTargetPos = () => (isMaximized && !isMinimized ? { x: 0, y: 0 } : position);
  const transitionStyle = isDragging ? "none" : "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)"; // "Apple-like" ease

  return (
    <Rnd
      size={getTargetSize()}
      position={getTargetPos()}
      onDragStart={() => { setIsDragging(true); isDraggingRef.current = true; }}
      onDragStop={(e, d) => { 
        setIsDragging(false); 
        if (!isMaximized) setPosition({ x: d.x, y: d.y }); 
        setTimeout(() => { isDraggingRef.current = false; }, 100); 
      }}
      onResizeStart={() => setIsDragging(true)}
      onResizeStop={(e, dir, ref, delta, pos) => {
        setIsDragging(false);
        if (!isMinimized && !isMaximized) {
          setSize({ width: ref.style.width, height: ref.style.height });
          setPosition(pos);
        }
      }}
      minWidth={isMinimized ? 60 : 320}
      minHeight={isMinimized ? 60 : 350}
      bounds="window"
      dragHandleClassName="drag-handle"
      disableDragging={isMaximized && !isMinimized}
      enableResizing={!isMaximized && !isMinimized}
      
      style={{
        zIndex: 999999,
        position: "fixed",
        display: "flex",
        flexDirection: "column",
        // LIQUID GLASS STYLES ------------------------
        backgroundColor: isMinimized ? "rgba(37, 99, 235, 0.85)" : "rgba(255, 255, 255, 0.65)", // Translucent
        backdropFilter: "blur(20px) saturate(180%)", // The "Frost" Effect
        WebkitBackdropFilter: "blur(20px) saturate(180%)", // Safari Support
        border: "1px solid rgba(255, 255, 255, 0.4)", // Subtle glass border
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)", // Soft diffuse shadow
        // --------------------------------------------
        borderRadius: isMinimized ? "50%" : isMaximized ? "0px" : "24px", // Smoother corners
        overflow: "hidden",
        transition: transitionStyle,
        boxSizing: "border-box"
      }}
    >
      {/* --- BUBBLE (Glass Icon) --- */}
      <div
        className="drag-handle"
        onClick={handleBubbleClick}
        style={{
          width: "100%", height: "100%", display: isMinimized ? "flex" : "none",
          alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white",
          boxShadow: "inset 0 0 10px rgba(255,255,255,0.2)" // Inner glow
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>

      {/* --- WINDOW CONTENT --- */}
      <div style={{ display: !isMinimized ? "flex" : "none", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
          {/* Header (More Transparent) */}
          <div
            className="drag-handle"
            onClick={handleHeaderClick}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px", height: "60px",
              background: "rgba(255, 255, 255, 0.4)", // Slight white tint
              borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
              cursor: "move", flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, #60a5fa, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 2px 5px rgba(37,99,235,0.3)" }}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <span style={{ fontWeight: "700", color: "#333", fontSize: "15px", letterSpacing: "-0.01em" }}>MapX Chat</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }} onMouseDown={(e) => e.stopPropagation()}>
              <button onClick={toggleMinimize} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.05)", cursor: "pointer", display:"flex", alignItems:"center", justifyContent:"center", color: "#555", transition: "all 0.2s" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
              <button onClick={toggleMaximizeButton} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.05)", cursor: "pointer", display:"flex", alignItems:"center", justifyContent:"center", color: "#555", transition: "all 0.2s" }}>{isMaximized ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>}</button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, width: "100%", position: "relative", overflow: "hidden" }}>
            {children}
          </div>
      </div>
    </Rnd>
  );
};

export default ResizableWindow;