import "regenerator-runtime/runtime";
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux"; 
import { setYear, setFlyToPosition, setMarkers } from "../../store/mapSlice"; 
import { yearFromDbFormat } from "../../utils/era";
import { toast } from 'react-toastify'; 
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm'; 
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import { sendMessage as sendChatMessage, fetchAllChats, getChatHistory, deleteChatSession } from "../api/chatService";

export default function Chat() {
  const dispatch = useDispatch();
  
  // --- SPEECH RECOGNITION HOOK ---
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // --- STATE ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCitations, setActiveCitations] = useState(null);
  
  // Grade & Language State
  const [selectedGrade, setSelectedGrade] = useState(0);
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN'); 

  // Session & UI State
  const [sessionId, setSessionId] = useState(null); 
  const [autoFlyCount, setAutoFlyCount] = useState(0); 
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState([]);
  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const email = useSelector((state)=>state.project.ownerEmail);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (email) {
        loadHistoryList();
    }
  }, [email]);

  // --- SYNC VOICE TRANSCRIPT TO INPUT ---
  useEffect(() => {
    if (!transcript) return;
    setInput(transcript);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.selectionStart = el.selectionEnd = transcript.length;
      el.scrollLeft = el.scrollWidth;
    });
  }, [transcript]);


  const loadHistoryList = async () => {
    try {
        const chats = await fetchAllChats(email);
        const sortedChats = chats.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.updatedAt || b.createdAt || 0);
            return dateB - dateA; 
        });

        const formatted = sortedChats.map(c => ({
            id: c.sessionId, 
            title: c.chatTitle || c.title || (c.createdAt ? `Chat ${new Date(c.createdAt).toLocaleDateString()}` : "New Chat")
        }));
        setChatHistoryList(formatted);
    } catch (error) {
        console.error("Error loading history list", error);
    }
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const confirmDeleteChat = async () => {
    if (!sessionId) return;
    setShowDeleteModal(false);
    try {
        await deleteChatSession(sessionId);
        toast.success("Chat deleted successfully");
        setChatHistoryList(prev => prev.filter(c => c.id !== sessionId));
        startNewChat(); 
    } catch (error) {
        console.error("Delete failed", error);
        toast.error("Failed to delete chat");
    }
  };

  const mapHistoryToUi = (historyItem) => {
      const uiMsgs = [];
      uiMsgs.push({ role: "user", content: historyItem.userInput, timestamp: historyItem.timestamp });

      let empireData = null;
      if (historyItem.flyToPosition && (historyItem.flyToPosition.location || historyItem.flyToPosition.lat)) {
          empireData = {
              name: historyItem.flyToPosition.location || "Location",
              lat: historyItem.flyToPosition.lat,
              lng: historyItem.flyToPosition.lng,
              time: historyItem.flyToPosition.time,      
              markers: historyItem.flyToPosition.markers, 
              zoom: historyItem.flyToPosition.zoom
          };
      }

      const citations = historyItem.citations?.sources || historyItem.citations?.data || [];

      uiMsgs.push({ 
          role: "assistant", 
          content: historyItem.modelResponse,
          citations: citations, 
          empire_match: empireData,
          timestamp: historyItem.timestamp
      });

      return uiMsgs;
  };

  const loadOldChat = async (id) => {
    try {
        setLoading(true);
        setSessionId(id);
        setMobileMenuOpen(false); 
        
        const data = await getChatHistory(id);
        if (data && data.history) {
            const sortedHistory = data.history.sort((a, b) => {
                const tA = new Date(a.timestamp || 0);
                const tB = new Date(b.timestamp || 0);
                return tA - tB; 
            });

            const uiMessages = [];
            sortedHistory.forEach(h => {
                const mapped = mapHistoryToUi(h);
                uiMessages.push(...mapped);
            });
            setMessages(uiMessages);
        }
    } catch (e) {
        console.error("Failed to load chat", e);
        toast.error("Could not load chat history");
    } finally {
        setLoading(false);
    }
  };

  const toSignedYear = (yVal, eraVal) => {
    const converted = yearFromDbFormat(yVal, eraVal);
    return Number.isFinite(converted) ? converted : null;
  };

  const flyToIfPossible = (lat, lng,zoom) => {
     try {
         if (window.mapxFlyTo && Number.isFinite(lat) && Number.isFinite(lng)) {
             window.mapxFlyTo({ lng, lat, zoom:zoom||4 });
         }
     } catch (_) {}
  };

  const handleFlyTo = (empireMatch) => {
    if (!empireMatch) return;
    const { lat, lng, time, markers,zoom } = empireMatch;

    if (lat !== undefined && lng !== undefined) {
        flyToIfPossible(lat, lng, zoom);
    }
    dispatch(setFlyToPosition({ lat, lng }));
    dispatch(setMarkers(markers))

    const timeValue = time;

    if (timeValue !== undefined && timeValue !== null) {
       let y = null;

       if (typeof timeValue === 'string' && timeValue.includes(' ')) {
           const parts = timeValue.split(' ');
           const yearNum = parseInt(parts[0], 10);
           const eraStr = parts[1]; // "CE", "BCE"
           y = toSignedYear(yearNum, eraStr);
       } else if (typeof timeValue === 'object') {
           y = toSignedYear(timeValue.year, timeValue.era);
       } else {
           y = toSignedYear(timeValue);
       }

       if (y !== null && Number.isFinite(y)) {
           dispatch(setYear(y));
       }
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput("");
    resetTranscript(); 
    setAutoFlyCount(0);
    if (window.innerWidth < 768) setMobileMenuOpen(false);
  };

  // --- MICROPHONE TOGGLE ---
  const handleMicClick = () => {
    if (listening) {
        SpeechRecognition.stopListening();
    } else {
        try {
            SpeechRecognition.startListening({ 
                continuous: true, 
                language: voiceLanguage 
            });
        } catch (err) {
            console.error("Error invoking startListening:", err);
        }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (listening) {
        SpeechRecognition.stopListening();
    }

    const currentInput = input;
    setInput(""); 
    resetTranscript(); 
    setLoading(true);

    const userMessage = { role: "user", content: currentInput };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const data = await sendChatMessage(email, sessionId, currentInput, selectedGrade);
      
      if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          loadHistoryList(); 
      }

      if (data.history) {
          const sortedHistory = data.history.sort((a, b) => {
              const tA = new Date(a.timestamp || 0);
              const tB = new Date(b.timestamp || 0);
              return tA - tB;
          });

          const newUiMessages = [];
          sortedHistory.forEach(h => {
              newUiMessages.push(...mapHistoryToUi(h));
          });
          setMessages(newUiMessages);

          const lastHistoryItem = sortedHistory[sortedHistory.length - 1];
          if (lastHistoryItem.flyToPosition && autoFlyCount < 2) {
              const flyData = lastHistoryItem.flyToPosition;
              const empireMatchData = {
                  lat: flyData.lat,
                  lng: flyData.lng,
                  location: flyData.location,
                  time: flyData.time,
                  zoom: flyData.zoom,
                  markers: flyData.markers
              };
              handleFlyTo(empireMatchData);
              setAutoFlyCount(prev => prev + 1);
          }
      }

    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error contacting server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- ICONS ---
  const UserIcon = () => (
    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#007bff", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    </div>
  );

  const BotIcon = () => (
    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#10a37f", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M4 8h16"></path><path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M9 14h6"></path></svg>
    </div>
  );

useEffect(() => {
  const onKeyDown = (e) => {
    // Ctrl + Space (works even when focused in input)
    if (e.ctrlKey && e.code === "Space" && !e.repeat) {
      e.preventDefault();
      SpeechRecognition.startListening({
        continuous: true,
        language: voiceLanguage,
      });
    }
  };

  const onKeyUp = (e) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      SpeechRecognition.stopListening();
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  };
}, [voiceLanguage]);


  return (
    // Reverted to height: 100% and added position: relative for safety
    <div style={{ display: "flex", height: "100%", width: "100%", position: "relative", backgroundColor: "#f9fafb", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* --- SIDEBAR --- */}
      <div style={{
          width: sidebarOpen ? "250px" : "0px",
          backgroundColor: "#f3f4f6",
          transition: "width 0.3s ease",
          overflow: "hidden",
          display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #e5e7eb"
      }} className="desktop-sidebar">
        
        <div style={{ padding: "16px" }}>
            <button onClick={startNewChat} style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px", cursor: "pointer", fontSize: "14px", fontWeight: "500", width: "100%", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: "18px" }}>+</span> New Chat
            </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#6b7280", padding: "10px 6px", fontWeight: "600" }}>Recent</div>
            {chatHistoryList.map(chat => (
                <div key={chat.id} onClick={() => loadOldChat(chat.id)} style={{ padding: "12px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#374151", display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px", backgroundColor: sessionId === chat.id ? "#e5e7eb" : "transparent" }} className="history-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    {chat.title}
                </div>
            ))}
        </div>
      </div>

      {/* --- MOBILE OVERLAY --- */}
      {mobileMenuOpen && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} onClick={() => setMobileMenuOpen(false)}>
            <div style={{ width: "85%", maxWidth: "300px", height: "100%", background: "#f9fafb", padding: "20px", boxShadow: "2px 0 10px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={startNewChat} style={{ marginBottom: "20px", padding: "16px", width: "100%", border: "1px solid #ddd", background: "white", borderRadius: "8px", fontSize: "16px", fontWeight: "500" }}>+ New Chat</button>
                <div style={{ marginTop: "10px", flex: 1, overflowY: "auto" }}>
                    <div style={{ fontSize: "12px", textTransform: "uppercase", color: "#6b7280", marginBottom: "10px", fontWeight: "600" }}>Recent Chats</div>
                    {chatHistoryList.map(chat => (
                        <div key={chat.id} onClick={() => loadOldChat(chat.id)} style={{ padding: "14px 10px", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{chat.title}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative", backgroundColor: "#fff" }}>
        
        {/* Top Bar */}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", minHeight: "60px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => { if (window.innerWidth < 768) setMobileMenuOpen(true); else setSidebarOpen(!sidebarOpen); }} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "10px", marginRight: "8px", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <span style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>Happy Dyno</span>
            </div>
            {sessionId && (
                <button onClick={handleDeleteClick} title="Delete Chat" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "10px", color: "#dc2626", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "500" }} className="hover-bg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span style={{ display: window.innerWidth < 600 ? "none" : "block" }}>Delete</span>
                </button>
            )}
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "0 10px", WebkitOverflowScrolling: "touch" }}>
            <div style={{ width: "100%", maxWidth: "768px", margin: "0 auto", padding: "20px 0 40px 0", display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {messages.length === 0 && (
                    <div style={{ marginTop: "15%", textAlign: "center", padding: "0 20px" }}>
                          <div style={{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>Dyno here!!</div>
                          <div style={{ fontSize: "16px", color: "#666" }}>Ask about history, geography, or specific empires.</div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "12px", width: "100%" }}>
                        {msg.role === "user" ? <UserIcon /> : <BotIcon />}
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "4px", color: "#111" }}>{msg.role === "user" ? "You" : "Assistant"}</div>
                            
                            <div style={{ fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
                                <ReactMarkdown 
                                    children={msg.content}
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({node, ...props}) => <p style={{margin: '0 0 10px 0'}} {...props} />,
                                        ul: ({node, ...props}) => <ul style={{margin: '0 0 10px 0', paddingLeft: '24px', listStyleType: 'disc'}} {...props} />,
                                        ol: ({node, ...props}) => <ol style={{margin: '0 0 10px 0', paddingLeft: '24px', listStyleType: 'decimal'}} {...props} />,
                                        li: ({node, ...props}) => <li style={{marginBottom: '6px'}} {...props} />,
                                        h1: ({node, ...props}) => <h1 style={{fontSize: '1.4em', fontWeight: 'bold', margin: '16px 0 8px 0'}} {...props} />,
                                        h2: ({node, ...props}) => <h2 style={{fontSize: '1.25em', fontWeight: 'bold', margin: '14px 0 8px 0'}} {...props} />,
                                        h3: ({node, ...props}) => <h3 style={{fontSize: '1.1em', fontWeight: 'bold', margin: '12px 0 6px 0'}} {...props} />,
                                        table: ({node, ...props}) => (
                                            <div style={{overflowX: 'auto', marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '4px'}}>
                                                <table style={{borderCollapse: 'collapse', width: '100%', fontSize: '14px'}} {...props} />
                                            </div>
                                        ),
                                        thead: ({node, ...props}) => <thead style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}} {...props} />,
                                        th: ({node, ...props}) => <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', border: '1px solid #e5e7eb'}} {...props} />,
                                        td: ({node, ...props}) => <td style={{padding: '12px', border: '1px solid #e5e7eb', verticalAlign: 'top'}} {...props} />,
                                        code: ({node, inline, className, children, ...props}) => {
                                            return inline ? (
                                                <code style={{background: '#f3f4f6', padding: '2px 4px', borderRadius: '4px', fontSize: '90%', fontFamily: 'monospace'}} {...props}>{children}</code>
                                            ) : (
                                                <code style={{display: 'block', background: '#1f2937', color: '#fff', padding: '12px', borderRadius: '8px', overflowX: 'auto', marginBottom: '10px', fontFamily: 'monospace', fontSize: '13px'}} {...props}>{children}</code>
                                            )
                                        }
                                    }}
                                />
                            </div>

                            {((msg.citations && msg.citations.length > 0) || msg.empire_match) && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
                                    {msg.citations && msg.citations.length > 0 && (
                                        <button onClick={() => setActiveCitations(msg.citations)} style={chipStyle}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                                            View Sources ({msg.citations.length})
                                        </button>
                                    )}
                                    {msg.empire_match && (
                                        <button onClick={() => handleFlyTo(msg.empire_match)} style={chipStyle}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                                            Fly to Location
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                        <BotIcon />
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "32px" }}>
                             <div className="dot-pulse"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} style={{ height: "1px" }} />
            </div>
        </div>

        {/* Input Area - Adjusted for mobile keyboards */}   
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "16px 12px", background: "white", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
            <div style={{ width: "100%", maxWidth: "768px", position: "relative" }}>
                
                {/* SETTINGS BAR: Grade Selector & Language Selector */}
                <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <select
                        value={selectedGrade === 0 ? "no_grade" : selectedGrade === null? "all_grades": selectedGrade}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "no_grade") setSelectedGrade(0);
                            else if (val === "all_grades") setSelectedGrade(null);
                            else setSelectedGrade(val);
                        }}
                        style={dropdownStyle}
                    >
                        <option value="no_grade">No Grade</option>
                        <option value="all_grades">All Grades</option>
                        {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                            <option key={g} value={`${g}th Grade`}>{g}th Grade</option>
                        ))}
                    </select>

                    <select
                        value={voiceLanguage}
                        onChange={(e) => setVoiceLanguage(e.target.value)}
                        style={dropdownStyle}
                    >
                        <option value="en-IN">English (India)</option>
                        <option value="kn-IN">Kannada</option>
                    </select>
                </div>

                <div style={{ position: "relative", width: "100%" }}>
                    <input 
                        type="text" 
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        // Generic placeholder for both desktop/mobile
                        placeholder={listening ? "Listening..." : "Type or tap space to open mic..."}
                        style={{ 
                            width: "100%", 
                            // Increased font size to 16px to prevent iOS zoom
                            fontSize: "16px",
                            padding: "14px 110px 14px 16px", 
                            borderRadius: "24px", 
                            border: listening ? "1px solid #10a37f" : "1px solid #ddd", 
                            outline: "none", 
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)" 
                        }}
                    />
                    
                    {/* --- BUTTON GROUP (MIC + SEND) --- */}
                    <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "6px" }}>
                        
                        {/* Mic Button - Larger Touch Target */}
                        {browserSupportsSpeechRecognition && (
                            <button
                                onClick={handleMicClick}
                                title="Speech to Text"
                                style={{
                                    background: listening ? "#dc2626" : "#f3f4f6",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "40px",
                                    height: "40px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: listening ? "white" : "#555",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {listening ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12"></rect></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                )}
                            </button>
                        )}

                        <button 
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            style={{ 
                                background: input.trim() ? "#10a37f" : "#ccc", 
                                border: "none", 
                                borderRadius: "50%", 
                                width: "40px", 
                                height: "40px", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                color: "white", 
                                cursor: input.trim() ? "pointer" : "default", 
                                transition: "background 0.2s" 
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

      {/* --- MODALS --- */}
      {showDeleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s ease-out", backdropFilter: "blur(2px)" }} onClick={() => setShowDeleteModal(false)}>
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", width: "85%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", animation: "slideUp 0.2s ease-out" }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px", color: "#1f2937", fontWeight: "600" }}>Delete Chat?</h3>
                <p style={{ color: "#6b7280", fontSize: "15px", lineHeight: "1.5", marginBottom: "24px" }}>This will permanently delete the current conversation.</p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button onClick={() => setShowDeleteModal(false)} style={{ padding: "12px 16px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "white", color: "#374151", cursor: "pointer", fontWeight: "500", fontSize: "15px" }}>Cancel</button>
                    <button onClick={confirmDeleteChat} style={{ padding: "12px 16px", borderRadius: "6px", border: "none", background: "#dc2626", color: "white", cursor: "pointer", fontWeight: "500", fontSize: "15px" }}>Delete</button>
                </div>
            </div>
        </div>
      )}

      {activeCitations && (
        <div style={{ position: "fixed", right: "20px", top: "70px", width: "calc(100% - 40px)", maxWidth: "300px", background: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", borderRadius: "12px", zIndex: 100, maxHeight: "50%", display: "flex", flexDirection: "column", border: "1px solid #eee" }}>
             <div style={{ padding: "16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
                 <span style={{ fontWeight: "600", fontSize: "14px" }}>References</span>
                 <button onClick={() => setActiveCitations(null)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "8px", fontSize: "24px", color: "#666", lineHeight: "0.5" }}>&times;</button>
             </div>
             <div style={{ padding: "16px", overflowY: "auto" }}>
                 {activeCitations.map((c, i) => (
                     <div key={i} style={{ marginBottom: "10px", padding: "12px", background: "#f3f4f6", borderRadius: "8px", fontSize: "13px", color: "#333", lineHeight: "1.4" }}>{typeof c === "string" ? c : `Page ${c.page} - ${c.lesson} - Grade : ${c.grade}`}</div>
                 ))}
             </div>
        </div>
      )}

      <style>{`
        .history-item:active { background-color: #e5e7eb !important; }
        .hover-bg:active { background-color: rgba(220, 38, 38, 0.1) !important; }
        .dot-pulse { width: 8px; height: 8px; background: #888; border-radius: 50%; animation: pulse 1s infinite alternate; }
        @keyframes pulse { from { opacity: 0.4; } to { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 768px) { .desktop-sidebar { display: none !important; } }
      `}</style>
    </div>
    </div>
  );
}

// Reusable styles
const dropdownStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    backgroundColor: "white",
    fontSize: "14px",
    color: "#374151",
    outline: "none",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    minHeight: "40px" 
};

const chipStyle = { 
    background: "white", 
    border: "1px solid #ddd", 
    borderRadius: "20px", 
    padding: "8px 14px", 
    fontSize: "13px", 
    color: "#555", 
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    gap: "8px", 
    fontWeight: "500", 
    transition: "background 0.2s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
};