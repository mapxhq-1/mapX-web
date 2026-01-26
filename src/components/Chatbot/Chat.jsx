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

  const email = useSelector((state) => state.project.ownerEmail);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isListeningRef = useRef(listening);
  useEffect(() => {
    isListeningRef.current = listening;
  }, [listening]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
//ANCHOR - Update
  useEffect(() => {
    console.log("ChatBot")
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

  // ... (deleteChatDirectly, mapHistoryToUi, loadOldChat, etc... keep as is) ...
  // Keeping these hidden for brevity, they do not need changes
  const deleteChatDirectly = async (e, idToDelete) => {
    e.stopPropagation();
    try {
      await deleteChatSession(idToDelete);
      toast.success("Chat deleted");
      setChatHistoryList(prev => prev.filter(c => c.id !== idToDelete));
      if (sessionId === idToDelete) {
        startNewChat();
      }
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

  const flyToIfPossible = (lat, lng, zoom) => {
    try {
      if (window.mapxFlyTo && Number.isFinite(lat) && Number.isFinite(lng)) {
        window.mapxFlyTo({ lng, lat, zoom: zoom || 4 });
      }
    } catch (_) { }
  };

  const handleFlyTo = (empireMatch) => {
    if (!empireMatch) return;
    const { lat, lng, time, markers, zoom } = empireMatch;

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

  const handleMicClick = async  () => {
    if (listening) {
      await SpeechRecognition.abortListening();
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

  // 1. REFACTORED: Accept override parameters
  const sendMessage = async (overrideInput = null, overrideGrade = null, forceNewSession = false, skipAutoFly = false) => {
    const textToSend = overrideInput || input;
    // If overrideGrade is passed (even 0 or -1), use it. Otherwise use state.
    const gradeToSend = overrideGrade !== null ? overrideGrade : selectedGrade; 
    
    // If forcing a new session, use null explicitly. Otherwise use state sessionId.
    const activeSessionId = forceNewSession ? null : sessionId;

    if (!textToSend.trim() || loading) return;

    await SpeechRecognition.abortListening();

    if (!overrideInput) {
      setInput("");
      resetTranscript();
    }
    
    setLoading(true);

    const userMessage = { role: "user", content: textToSend };
    // If it's a new session, clear messages first
    if (forceNewSession) {
        setMessages([userMessage]);
    } else {
        setMessages((prev) => [...prev, userMessage]);
    }

    try {
      const lang = voiceLanguage ==="kn-IN"?"kn":"";
      
      // Use the variables we created above
      const data = await sendChatMessage(email, activeSessionId, textToSend, gradeToSend, lang);

      // If we didn't have a session ID before, or forced a new one, update state
      if ((!activeSessionId) && data.sessionId) {
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
        if (lastHistoryItem.flyToPosition && autoFlyCount < 2 && !skipAutoFly) {
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

  // 2. NEW: Listen for the Custom Event
  useEffect(() => {
    const handleTrigger = (e) => {
        const { query, grade } = e.detail;
        
        // 1. Reset Chat UI
        startNewChat(); 
        
        // 2. Trigger Send immediately
        // We pass 'true' as the 3rd argument to force a fresh session ID in the API call
        sendMessage(query, grade, true, true); 
    };

    window.addEventListener('trigger-know-more', handleTrigger);

    // Cleanup
    return () => {
        window.removeEventListener('trigger-know-more', handleTrigger);
    };
  }, []); // Empty dependency array = runs on mount

// --- KEYBOARD HANDLER (UPDATED) ---
  useEffect(() => {
    const onKeyDown = (e) => {
      // FIX: Use SHIFT + SPACE instead of Alt + Space
      // Shift + Space is safe on all operating systems.
      // We also keep Ctrl + Space as an option.
      const isTrigger = (e.ctrlKey || e.shiftKey) && e.code === "Space";

      if (isTrigger && !e.repeat) {
        // Stop the space bar from scrolling the page
        e.preventDefault();
        e.stopPropagation(); 
        
        // Only start if we aren't already listening
        if (!isListeningRef.current) {
            resetTranscript(); 
            SpeechRecognition.startListening({
                continuous: true,
                language: voiceLanguage,
            });
        }
      }
    };

    const onKeyUp = (e) => {
      if (e.code === "Space") {
        // Check Ref before stopping to avoid stopping if it wasn't started
        if (isListeningRef.current) {
            e.preventDefault();
            e.stopPropagation();
            SpeechRecognition.abortListening();
        }
      }
    };

    // Attach to window to catch events everywhere
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [voiceLanguage]);

  return (
    <>
      <style>{`
        /* Sidebar Scrollbar - Green Thumb */
        .custom-scrollbar-sidebar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb {
          background-color: #25d366; /* WhatsApp Green */
          border-radius: 10px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb:hover {
          background-color: #128c7e;
        }

        /* Chat Area Scrollbar - Teal Thumb */
        .custom-scrollbar-chat::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-chat::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb {
          background-color: #006D5B; /* Dark Teal */
          border-radius: 10px;
        }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb:hover {
          background-color: #004f42;
        }
      `}</style>

      {/* MAIN CONTAINER */}
      <div className="flex h-full w-full relative rounded-[25px] overflow-hidden font-sans bg-[#f1ebe3] text-[#111b21]">
        
        {/* --- SIDEBAR (Desktop) --- */}
        <div 
          className={`hidden md:flex flex-col shrink-0 border-r border-[#004f42] transition-all duration-300 overflow-hidden bg-[#075e54] text-white`}
          style={{ width: sidebarOpen ? "250px" : "0px" }}
        >
          <div className="p-4">
            <button 
              onClick={startNewChat} 
              className="flex items-center gap-2.5 bg-[#006D5B] hover:bg-[#128c7e] text-white border-none rounded-full py-3 px-4 w-full shadow-md transition-colors duration-200 font-bold text-sm"
            >
              <span className="text-lg">+</span> New Chat
            </button>
          </div>

          {/* Sidebar List with Custom Green Scrollbar */}
          <div className="flex-1 overflow-y-auto px-2.5 custom-scrollbar-sidebar">
            <div className="text-[11px] uppercase text-[#e9edef]/70 py-2.5 px-1.5 font-bold tracking-wide">Recent</div>
            {chatHistoryList.map(chat => {
              const isActive = sessionId === chat.id;
              return (
                <div key={chat.id}
                  onClick={() => { loadOldChat(chat.id); setSidebarOpen(false) }}
                  className={`group flex items-center justify-between gap-2.5 mb-1 px-3 py-2.5 rounded-full cursor-pointer text-[13px] transition-all duration-200 ${
                    isActive 
                    ? "bg-[#006D5B] text-white border-b-3 border-[#044a3a]/50 translate-y-px" // 3D Effect: Bottom border only
                    : "text-[#e9edef] hover:bg-[#006D5B] hover:text-white border-b-4 border-transparent hover:border-[#044a3a]/30" 
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteChatDirectly(e, chat.id)}
                    className={`p-1 border-none bg-transparent cursor-pointer transition-opacity duration-200 ${
                      isActive ? "text-[#ff6b6b] opacity-100" : "text-[#aebac1] opacity-0 group-hover:opacity-100 hover:text-[#ff6b6b]"
                    }`}
                    title="Delete Chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* User Profile */}
          <div className="px-6 py-3 bg-[#006D5B] rounded-full border-t-2  border-[#075e54]/70">
            <div className="text-xs text-[#e9edef]">{email || "User"}</div>
          </div>
        </div>

        {/* --- MOBILE OVERLAY --- */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-[85%] max-w-[300px] h-full bg-[#006D5B] text-white p-5 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <button 
                  onClick={startNewChat} 
                  className="mb-5 p-4 w-full border-none rounded-full text-base font-medium text-white bg-[#006D5B] hover:bg-[#128c7e]"
              >
                  + New Chat
              </button>
              <div className="mt-2.5 flex-1 overflow-y-auto custom-scrollbar-sidebar">
                <div className="text-xs uppercase text-[#e9edef]/70 mb-2.5 font-bold">Recent Chats</div>
                {chatHistoryList.map(chat => (
                  <div key={chat.id} onClick={() => loadOldChat(chat.id)} className={`p-3.5 border-b border-[#075e54] cursor-pointer text-[15px] flex items-center justify-between gap-2.5 ${sessionId === chat.id ? "text-white font-semibold bg-[#075e54]" : "text-[#e9edef]"}`}>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteChatDirectly(e, chat.id)}
                      className="border-none bg-transparent text-[#ef4444] cursor-pointer p-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 flex flex-col h-full relative bg-[#faf9f5]">

          {/* Top Bar */}
          <div className="px-4 py-3 flex items-center justify-between min-h-[60px]">
            <div className="flex items-center">
              <button 
                  onClick={() => { if (window.innerWidth < 768) setMobileMenuOpen(true); else setSidebarOpen(!sidebarOpen); }} 
                  className="bg-transparent border-none cursor-pointer p-2.5 mr-2 text-[#54656f] hover:bg-black/5 rounded-full flex items-center justify-center transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
            </div>
          </div>

          {/* Chat List - Custom Teal Scrollbar */}
          <div className="flex-1 overflow-y-auto flex flex-col px-2.5 custom-scrollbar-chat">
            <div className="w-full max-w-3xl mx-auto py-5 pb-10 flex flex-col gap-6">

              {messages.length === 0 && (
                <div className="mt-[15%] text-center px-5">
                  <div className="text-2xl font-bold text-[#333] mb-2">Dyno here!!</div>
                  <div className="text-base text-[#666]">Ask about history, geography, or specific empires.</div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`
                      flex-initial max-w-[85%] min-w-0 p-3 px-4.5 rounded-t-2xl 
                      ${msg.role === "user" 
                          ? "bg-[#d9fdd3] text-[#111b21] rounded-bl-2xl shadow-md" 
                          : "bg-transparent text-[#111b21] rounded-br-2xl shadow-none" 
                      }
                  `}>

                    {/* Content */}
                    <div className="text-base leading-relaxed">
                      <ReactMarkdown
                        children={msg.content}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="mb-2.5 pl-6 list-disc" {...props} />,
                          ol: ({ node, ...props }) => <ol className="mb-2.5 pl-6 list-decimal" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1.5" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3.5 mb-2" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-1.5" {...props} />,
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto mb-4 border border-gray-200 rounded">
                              <table className="w-full text-sm border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => <thead className="bg-gray-100 border-b-2 border-gray-200" {...props} />,
                          th: ({ node, ...props }) => <th className="p-3 text-left font-semibold border border-gray-200" {...props} />,
                          td: ({ node, ...props }) => <td className="p-3 border border-gray-200 align-top" {...props} />,
                          code: ({ node, inline, className, children, ...props }) => {
                            return inline ? (
                              <code className="px-1 py-0.5 rounded text-[90%] font-mono bg-black/5" {...props}>{children}</code>
                            ) : (
                              <code className="block bg-[#f0f2f5] text-[#111b21] p-3 rounded-lg overflow-x-auto mb-2.5 font-mono text-[13px]" {...props}>{children}</code>
                            )
                          }
                        }}
                      />
                    </div>

                    {/* Interactive Buttons (Citations / FlyTo) */}
                    {((msg.citations && msg.citations.length > 0) || msg.empire_match) && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {msg.citations && msg.citations.length > 0 && (
                          <button onClick={() => setActiveCitations(msg.citations)} className="bg-[#f0f2f5] border border-[#e9edef] hover:bg-[#d9dce0] rounded-full px-3.5 py-2 text-[13px] text-[#111b21] flex items-center gap-2 font-medium transition-colors shadow-sm">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                            View Sources ({msg.citations.length})
                          </button>
                        )}
                        {msg.empire_match && (
                          <button onClick={() => handleFlyTo(msg.empire_match)} className="bg-[#f0f2f5] border border-[#e9edef] hover:bg-[#d9dce0] rounded-full px-3.5 py-2 text-[13px] text-[#111b21] flex items-center gap-2 font-medium transition-colors shadow-sm">
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
                <div className="flex gap-3 w-full justify-start pl-4.5">
                  <div className="flex items-center gap-1 h-8">
                    <div className="w-2 h-2 bg-[#888] rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-px" />
            </div>
          </div>

          {/* Input Area */}
          <div className="w-full flex justify-center p-4 bg-[#faf9f5] shrink-0 border-t border-[#d1d7db]">
            <div className="w-full max-w-3xl relative">

              {/* SETTINGS BAR */}
              <div className="mb-3 flex gap-2.5 flex-wrap">
                <select
                  value={selectedGrade === 0 ? "no_grade" : selectedGrade === null ? "all_grades" : selectedGrade}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "no_grade") setSelectedGrade(0);
                    else if (val === "all_grades") setSelectedGrade(null);
                    else setSelectedGrade(val);
                  }}
                  className="py-2.5 px-4 rounded-full border border-[#e9edef] bg-white text-sm text-[#111b21] outline-none cursor-pointer shadow-sm min-h-[40px] hover:bg-gray-50 transition-colors"
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
                  className="py-2.5 px-3 rounded-full border border-[#e9edef] bg-white text-sm text-[#111b21] outline-none cursor-pointer shadow-sm min-h-[40px] hover:bg-gray-50 transition-colors"
                >
                  <option value="en-IN">English (India)</option>
                  <option value="kn-IN">Kannada</option>
                </select>
              </div>

              {/* INPUT CONTAINER */}
              <div 
                  className={`
                      relative w-full rounded-3xl overflow-hidden bg-white shadow-sm
                  `}
              >

                {/* Breathing Glow Effect (Green) */}
                {listening && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[80%] h-[70px] blur-[10px] z-0 pointer-events-none animate-[pulse_2s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_bottom,rgba(37,211,102,0.8)_0%,transparent_100%)]" />
                )}

                {/* Input Field */}
                <input
                  type="text"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={listening ? "Listening..." : "Type or tap space to open mic..."}
                  className="w-full text-base px-4 py-3.5 pr-[110px] border-none outline-none bg-transparent text-[#111b21] relative z-10 placeholder-[#8696a0]"
                />

                {/* Buttons Inside Input */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex gap-1.5">
                  {browserSupportsSpeechRecognition && (
                    <button
                      onClick={handleMicClick}
                      title="Speech to Text"
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-b-2 border-black/10
                        ${listening
                            ? "bg-[#25d366] text-white hover:bg-[#128c7e] shadow-[0_0_10px_rgba(37,211,102,0.3)]"
                            : "bg-zinc-100/50 text-[#54656f] hover:bg-[#f0f1e3]"
                        }
                      `}
                    >
                      {listening ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" /></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-b-2 border-black/10
                      ${input.trim() && !loading
                          ? "bg-[#075e54] text-white hover:bg-[#006D5B] cursor-pointer"
                          : "bg-transparent text-[#aebac1] cursor-not-allowed"
                      }
                    `}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Citation Popup */}
          {activeCitations && (
            <div className="fixed right-5 top-[70px] w-[calc(100%-40px)] max-w-[300px] bg-white text-[#111b21] shadow-2xl rounded-xl z-50 max-h-[50%] flex flex-col border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
                <span className="font-semibold text-sm">References</span>
                <button onClick={() => setActiveCitations(null)} className="border-none bg-transparent cursor-pointer p-2 text-2xl text-[#54656f] leading-[0.5] hover:text-[#111b21]">&times;</button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar-chat">
                {activeCitations.map((c, i) => (
                  <div key={i} className="mb-2.5 p-3 bg-[#f0f2f5] rounded-lg text-[13px] text-[#111b21] leading-snug">
                      {typeof c === "string" ? c : `Page ${c.page} - ${c.lesson} - Grade : ${c.grade}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}