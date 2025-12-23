import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux"; 
import { setYear } from "../../store/mapSlice"; 
import { yearFromDbFormat } from "../../utils/era";
import { getEmpireDetailsById } from "../api/geoJson"; 

const API_URL = "https://quantumbit-mapx-rag-chatbot.hf.space/chat";
const BEARER_TOKEN = "XnCHJlrDFJBgsdZsSFlSYCRrVk3_zxS8JXwRMp5Ufoo";

export default function Chat() {
  const dispatch = useDispatch();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCitations, setActiveCitations] = useState(null);
  
  // --- NEW STATE: Track Auto-Fly Count ---
  const [autoFlyCount, setAutoFlyCount] = useState(0); 

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const toSignedYear = (yVal, eraVal) => {
    const converted = yearFromDbFormat(yVal, eraVal);
    return Number.isFinite(converted) ? converted : null;
  };

  const handleFlyTo = async (empireMatch) => {
    if (!empireMatch || !empireMatch.objectId) return;

    try {
      const empireDetails = await getEmpireDetailsById(empireMatch.objectId);
      
      let targetCoords = null;
      
      if (empireDetails.content) {
         targetCoords = getCentroidFromGeoJSON(empireDetails.content);
      } 
      else if (empireDetails.lat && empireDetails.lng) {
         targetCoords = { lat: empireDetails.lat, lng: empireDetails.lng };
      }

      if (targetCoords && window.mapxFlyTo) {
        console.log("Flying to Calculated Center:", targetCoords);
        window.mapxFlyTo({ lng: targetCoords.lng, lat: targetCoords.lat });
      }

      const startYear = empireMatch.startYear || empireMatch.time; 
      if (startYear) {
         const y = typeof startYear === 'object' 
            ? toSignedYear(startYear.year, startYear.era)
            : parseInt(startYear);

         if (y !== null && Number.isFinite(y)) {
             dispatch(setYear(y));
         }
      }

    } catch (err) {
      console.error("FlyTo Error:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userMessage.content }),
      });

      const data = await res.json();
      const citations = data.sources || data.citations || [];

      const botMessage = {
        role: "assistant",
        content: data.answer || "No response received.",
        citations: citations,
        empire_match: data.empire_match || null, 
      };

      setMessages((prev) => [...prev, botMessage]);

      // --- UPDATED LOGIC: Auto-Fly only for first 2 occurrences ---
      if (data.empire_match) {
        if (autoFlyCount < 2) {
          handleFlyTo(data.empire_match);
          setAutoFlyCount(prev => prev + 1); // Increment count
        }
      }

    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error contacting server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%", 
      width: "100%", 
      backgroundColor: "transparent", 
      boxSizing: "border-box",
      position: "relative"
    }}>
      
      {/* --- MAIN CHAT AREA --- */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "20px 20px 10px 20px", 
        display: "flex", 
        flexDirection: "column", 
        gap: "16px", 
        scrollBehavior: "smooth",
        minHeight: 0 
      }}>
        
        {messages.length === 0 && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#555", textAlign: "center", opacity: 0.7 }}>
             <div style={{ width: "64px", height: "64px", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(10px)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             </div>
             <p style={{ fontWeight: "600", fontSize: "15px" }}>How can I help you?</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              animation: "fadeIn 0.3s ease-out forwards",
            }}
          >
            {/* Message Bubble */}
            <div style={{
               padding: "12px 18px",
               borderRadius: "20px",
               borderBottomRightRadius: msg.role === "user" ? "4px" : "20px",
               borderBottomLeftRadius: msg.role === "user" ? "20px" : "4px",
               backgroundColor: msg.role === "user" ? "#2563eb" : "rgba(255, 255, 255, 0.65)",
               backdropFilter: msg.role !== "user" ? "blur(10px)" : "none",
               color: msg.role === "user" ? "white" : "#1f2937",
               boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
               lineHeight: "1.5",
               fontSize: "14px",
               border: msg.role !== "user" ? "1px solid rgba(255,255,255,0.5)" : "none"
            }}>
               {msg.content}
            </div>
            
            {/* Action Buttons Area */}
            {( (msg.citations && msg.citations.length > 0) || msg.empire_match ) && (
               <div style={{ 
                 marginTop: "6px", 
                 textAlign: msg.role === "user" ? "right" : "left",
                 paddingLeft: msg.role === "user" ? 0 : "10px",
                 display: "flex",
                 gap: "8px",
                 justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
               }}>
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <button
                      onClick={() => setActiveCitations(msg.citations)}
                      style={buttonStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.5)"}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      Sources ({msg.citations.length})
                    </button>
                  )}

                  {msg.empire_match && (
                    <button
                      onClick={() => handleFlyTo(msg.empire_match)}
                      style={buttonStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.5)"}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                      Fly to Location
                    </button>
                  )}
               </div>
            )}
          </div>
        ))}
        
        {loading && (
           <div style={{ alignSelf: "flex-start", padding: "10px 15px", backgroundColor: "rgba(255,255,255,0.6)", borderRadius: "18px", borderBottomLeftRadius: "4px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                 <div style={{ width: "6px", height: "6px", background: "#999", borderRadius: "50%", animation: "bounce 1s infinite 0ms" }}></div>
                 <div style={{ width: "6px", height: "6px", background: "#999", borderRadius: "50%", animation: "bounce 1s infinite 200ms" }}></div>
                 <div style={{ width: "6px", height: "6px", background: "#999", borderRadius: "50%", animation: "bounce 1s infinite 400ms" }}></div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- INPUT AREA --- */}
      <div style={{ padding: "12px 16px 16px 16px", borderTop: "1px solid rgba(0,0,0,0.05)", backgroundColor: "transparent", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(255, 255, 255, 0.7)", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "24px", padding: "4px 6px 4px 16px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            style={{ 
              flex: 1, border: "none", outline: "none", fontSize: "14px", color: "#333", background: "transparent", padding: "8px 0"
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: "36px", height: "36px", borderRadius: "50%", border: "none",
              backgroundColor: input.trim() ? "#2563eb" : "rgba(0,0,0,0.1)",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() ? "pointer" : "default",
              transition: "all 0.2s"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translateX(1px)" }}>
               <line x1="22" y1="2" x2="11" y2="13"></line>
               <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {/* --- OVERLAY FOR CITATIONS --- */}
      {activeCitations && (
        <div 
          style={{
            position: "absolute",
            top: 0, left: 0, width: "100%", height: "100%",
            zIndex: 100,
            backgroundColor: "rgba(255, 255, 255, 0.85)", 
            backdropFilter: "blur(25px) saturate(180%)",
            display: "flex",
            flexDirection: "column",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            background: "rgba(255,255,255,0.4)"
          }}>
            <span style={{ fontWeight: "700", fontSize: "16px", color: "#111" }}>
              Sources ({activeCitations.length})
            </span>
            <button 
              onClick={() => setActiveCitations(null)}
              style={{
                width: "32px", height: "32px", borderRadius: "50%", border: "none",
                background: "rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#555"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {activeCitations.map((cite, index) => (
              <div 
                key={index}
                style={{
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderRadius: "16px",
                  padding: "16px",
                  marginBottom: "12px",
                  border: "1px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
                }}
              >
                 <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.5" }}>
                   {typeof cite === "string" ? cite : `Page ${cite.page} - ${cite.lesson}`}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); borderRadius: 3px; }
      `}</style>
    </div>
  );
}

// Helper Function placed outside component
function getCentroidFromGeoJSON(content) {
  try {
    const features = content.features || (content.type === "FeatureCollection" ? content.features : [content]);
    if (!features || features.length === 0) return null;

    const geometry = features[0].geometry;
    if (!geometry || !geometry.coordinates) return null;

    const flattenCoordinates = (coords) => {
      if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        return [coords];
      }
      return coords.reduce((acc, val) => acc.concat(flattenCoordinates(val)), []);
    };

    const allPoints = flattenCoordinates(geometry.coordinates);
    if (allPoints.length === 0) return null;

    let sumLng = 0;
    let sumLat = 0;

    allPoints.forEach(point => {
      sumLng += point[0]; 
      sumLat += point[1];
    });

    return {
      lng: sumLng / allPoints.length,
      lat: sumLat / allPoints.length
    };

  } catch (err) {
    console.error("Error calculating centroid:", err);
    return null;
  }
}

const buttonStyle = {
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.8)",
  borderRadius: "12px",
  padding: "4px 10px",
  fontSize: "11px",
  color: "#2563eb",
  fontWeight: "600",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  backdropFilter: "blur(4px)",
  transition: "all 0.2s"
};