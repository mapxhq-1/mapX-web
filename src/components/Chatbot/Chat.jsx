import "regenerator-runtime/runtime";
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setYear, setFlyToPosition, setMarkers } from "../../store/mapSlice";
import { yearFromDbFormat } from "../../utils/era";
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from "framer-motion";

import { sendMessage as sendChatMessage, fetchAllChats, getChatHistory, deleteChatSession } from "../api/chatService";

export default function Chat() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const browserSupportsSpeechRecognition = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setListening(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && listening) {
      mediaRecorderRef.current.stop();
      setListening(false);
    }
  };

  const handleMicClick = async () => {
    if (listening) stopRecording();
    else await startRecording();
  };

  const transcribeAudio = async (audioBlob) => {
    const loadingToast = toast.loading("Transcribing audio...");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "saaras:v3");
      formData.append("mode", "transcribe"); 

      const res = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: { "api-subscription-key": import.meta.env.VITE_SARVAM_API_KEY },
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      
      if (data.transcript) {
        setInput(prev => (prev + (prev ? " " : "") + data.transcript).trim());
        toast.update(loadingToast, { render: "Transcription complete", type: "success", isLoading: false, autoClose: 2000 });
      } else {
        toast.update(loadingToast, { render: "No speech detected", type: "info", isLoading: false, autoClose: 2000 });
      }
    } catch (err) {
      console.error("Transcription error:", err);
      toast.update(loadingToast, { render: "Failed to transcribe audio", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  async function fetchThinkingText(query) {
    const res = await fetch(
      "https://api.sarvam.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": import.meta.env.VITE_SARVAM_API_KEY
        },
        body: JSON.stringify({
          model: "sarvam-m",
          temperature: 0.7,
          top_p: 1,
          max_tokens: 80,
          messages: [
            {
              role: "user",
              content: `You are generating background “thinking” status text for an AI assistant.
The assistant answers questions ONLY about:
- History
- Ancient and medieval empires
- Civilizations
- Geography and the globe
- Historical timelines and places
Generate exactly 5 short thinking status messages.
Each message:
- 2 to 6 words only
- Neutral and analytical tone
- Related to historical or geographical reasoning
- No answers, No facts, No explanations, No sports, No modern events, No emojis, No punctuation
- Use the user query and think in that context
- No preamble like "Here are 5 lines".
User query (for context only):
"${query}"`
            }
          ]
        })
      }
    );

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices[0].message.content
      .split("\n")
      .map(t => t.replace(/^[-•\d.]+\s*/, "").trim())
      .filter(Boolean);
  }
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCitations, setActiveCitations] = useState(null);

  const [selectedGrade, setSelectedGrade] = useState(0);
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN');

  const [sessionId, setSessionId] = useState(null);
  const [autoFlyCount, setAutoFlyCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState([]);
  const [thinkingTexts, setThinkingTexts] = useState([]);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [listening, setListening] = useState(false);
  
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const placeholders = [
    "Press mic to start speaking",              
    "बोलना शुरू करने के लिए माइक दबाएं",        
    "কথা বলা শুরু করতে মাইক টিপুন",              
    "ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿರಿ",                     
    "സംസാരിക്കാൻ മൈക്ക് അമർത്തുക",                
    "बोलणे सुरू करण्यासाठी माइक दाबा",           
    "କହିବା ଆରମ୍ଭ କରିବାକୁ ମାଇକ୍ ଦବାନ୍ତୁ",             
    "ਬੋਲਣਾ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਮਾਈਕ ਦਬਾਓ",               
    "பேசத் தொடங்க மைக்கை அழுத்தவும்",             
    "మాట్లాడటం ప్రారంభించడానికి మైక్ నొక్కండి",     
    "બોલવાનું શરૂ કરવા માટે માઇક દબાવો"           
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (listening || input.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000); 
    return () => clearInterval(interval);
  }, [listening, input]); 

  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  useEffect(() => {
    const checkLandscape = () => {
      const isMobileWidth = window.innerWidth < 900;
      const isShortHeight = window.innerHeight < 500;
      setIsLandscapeMobile(isMobileWidth && isShortHeight);
    };
    checkLandscape();
    window.addEventListener('resize', checkLandscape);
    return () => window.removeEventListener('resize', checkLandscape);
  }, []);

  const email = useSelector((state) => state.project.ownerEmail);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const guestPromptsUsed = messages.filter(m => m.role === "user").length;
  const guestPromptsLeft = guestLimitReached ? 0 : Math.max(0, 10 - guestPromptsUsed);

  const getEffectiveUserId = () => {
    if (email) return email; 
    let guestId = localStorage.getItem('dyno_guest_id');
    if (!guestId) {
      guestId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_guest`;
      localStorage.setItem('dyno_guest_id', guestId);
    }
    return guestId;
  };

  const effectiveUserId = getEffectiveUserId();
  
  const isListeningRef = useRef(listening);
  useEffect(() => { isListeningRef.current = listening; }, [listening]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  // ✅ INITIAL LOAD LOGIC: Only auto-load saved session for guests
  useEffect(() => {
    const initializeChat = async () => {
      await loadHistoryList();
      if (!email) {
        const storedSessionId = localStorage.getItem('dyno_guest_session_id');
        if (storedSessionId) loadOldChat(storedSessionId);
      }
    };
    initializeChat();
  }, [effectiveUserId]);

  const loadHistoryList = async () => {
    try {
      const chats = await fetchAllChats(effectiveUserId);
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

  const deleteChatDirectly = async (e, idToDelete) => {
    e.stopPropagation();
    try {
      await deleteChatSession(idToDelete);
      toast.success("Chat deleted");
      setChatHistoryList(prev => prev.filter(c => c.id !== idToDelete));
      if (sessionId === idToDelete) startNewChat();
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("Failed to delete chat");
    }
  };

  const mapHistoryToUi = (historyItem) => {
    const uiMsgs = [];
    let userContent = historyItem.userInput || "";
    const identifier = "//////";
    
    if (userContent.includes(identifier)) {
      userContent = userContent.split(identifier)[0].trim();
    }

    uiMsgs.push({ role: "user", content: userContent, timestamp: historyItem.timestamp });

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

    uiMsgs.push({
      role: "assistant",
      content: historyItem.modelResponse,
      citations: historyItem.citations?.sources || historyItem.citations?.data || [],
      empire_match: empireData,
      timestamp: historyItem.timestamp
    });

    return uiMsgs;
  };

  const loadOldChat = async (id) => {
    try {
      setLoading(true);
      setSessionId(id);
      
      if (!email) localStorage.setItem('dyno_guest_session_id', id);
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
          uiMessages.push(...mapHistoryToUi(h));
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

    if (lat !== undefined && lng !== undefined) flyToIfPossible(lat, lng, zoom);
    dispatch(setFlyToPosition({ lat, lng }));
    dispatch(setMarkers(markers));

    if (time !== undefined && time !== null) {
      let y = null;
      if (typeof time === 'string' && time.includes(' ')) {
        const parts = time.split(' ');
        y = toSignedYear(parseInt(parts[0], 10), parts[1]);
      } else if (typeof time === 'object') {
        y = toSignedYear(time.year, time.era);
      } else {
        y = toSignedYear(time);
      }
      if (y !== null && Number.isFinite(y)) dispatch(setYear(y));
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput("");
    setAutoFlyCount(0);
    setSidebarOpen(false);
    if (!email) localStorage.removeItem('dyno_guest_session_id');
    if (window.innerWidth < 768) setMobileMenuOpen(false);
  };

  const sendMessage = async (
    overrideInput = null,
    overrideGrade = null,
    forceNewSession = false,
    skipAutoFly = false,
    isHidden = false 
  ) => {
    const textToSend = overrideInput || input;
    const gradeToSend = overrideGrade !== null ? overrideGrade : selectedGrade;
    const activeSessionId = forceNewSession ? null : sessionId;

    if (!textToSend.trim() || loading) return;

    if (listening) {
      try { stopRecording(); } catch (e) { console.warn("Could not abort listening:", e); }
    }

    if (!overrideInput) setInput("");
    setLoading(true);

    let displayContent = textToSend;
    const identifier = "//////";
    if (textToSend.includes(identifier)) {
        displayContent = textToSend.split(identifier)[0].trim();
    }

    const userMessage = { role: "user", content: displayContent };

    if (!isHidden) {
      if (forceNewSession) setMessages([userMessage]);
      else setMessages((prev) => [...prev, userMessage]);
    }

    try {
      const lang = voiceLanguage === "kn-IN" ? "kn" : "";
      setThinkingTexts([]);
      setThinkingIndex(0);

      fetchThinkingText(displayContent)
        .then(texts => setThinkingTexts(texts.length ? texts : ["Thinking…"]))
        .catch(() => setThinkingTexts(["Thinking…"]));

      const know_more = gradeToSend === -1 ? 1 : 0;
      
      const data = await sendChatMessage(effectiveUserId, activeSessionId, textToSend, gradeToSend, lang, know_more);

      if ((!activeSessionId) && data.sessionId) {
        setSessionId(data.sessionId);
        if (!email) localStorage.setItem('dyno_guest_session_id', data.sessionId);
        loadHistoryList();
      }

      if (data.history) {
        const sortedHistory = data.history.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        const newUiMessages = [];
        sortedHistory.forEach(h => newUiMessages.push(...mapHistoryToUi(h)));
        
        setMessages(newUiMessages);

        const lastHistoryItem = sortedHistory[sortedHistory.length - 1];
        if (lastHistoryItem.flyToPosition && autoFlyCount < 2 && !skipAutoFly) {
          handleFlyTo({
            lat: lastHistoryItem.flyToPosition.lat,
            lng: lastHistoryItem.flyToPosition.lng,
            location: lastHistoryItem.flyToPosition.location,
            time: lastHistoryItem.flyToPosition.time,
            zoom: lastHistoryItem.flyToPosition.zoom,
            markers: lastHistoryItem.flyToPosition.markers
          });
          setAutoFlyCount(prev => prev + 1);
        }
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err?.message || err?.response?.data?.message || err?.response?.data || "";
      if (typeof errorMessage === 'string' && errorMessage.includes("Guest limit of 10 messages")) {
        setGuestLimitReached(true);
        toast.error("Free limit reached! Please login to continue.", { autoClose: 5000 });
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: "You've reached your free limit of 10 messages! Please **[Login](/myProjects)** to continue our conversation." 
        }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error contacting server. Please try again." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading || thinkingTexts.length === 0) return;
    const id = setInterval(() => {
      setThinkingIndex(i => (i >= thinkingTexts.length - 1 ? 0 : i + 1));
    }, 3000); 
    return () => clearInterval(id);
  }, [loading, thinkingTexts]);

  useEffect(() => {
    const handleKnowMoreTrigger = (e) => {
      const { query } = e.detail || {};
      if (query) {
        if (window.innerWidth < 768) setMobileMenuOpen(false);
        sendMessage(query, -1 , false, true, false); 
      }
    };
    window.addEventListener('trigger-know-more', handleKnowMoreTrigger);
    return () => window.removeEventListener('trigger-know-more', handleKnowMoreTrigger);
  }, [sendMessage]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (!isCtrlK || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      if (isListeningRef.current) stopRecording();
      else startRecording();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  return (
    <>
      <style>{`
        .custom-scrollbar-sidebar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-sidebar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb { background-color: #25d366; border-radius: 10px; }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb:hover { background-color: #128c7e; }
        .custom-scrollbar-chat::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar-chat::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb { background-color: #006D5B; border-radius: 10px; }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb:hover { background-color: #004f42; }
      `}</style>

      <div className="flex h-full w-full relative rounded-[25px] overflow-hidden font-sans bg-[#f1ebe3] text-[#111b21]">

        {/* --- SIDEBAR (Desktop) --- */}
        {email && (<div
          className={`hidden md:flex flex-col shrink-0 border-r border-[#004f42] transition-all duration-300 overflow-hidden bg-[#075e54] text-white`}
          style={{ width: sidebarOpen ? "250px" : "0px" }}
        >
          <div className="p-4">
            <button onClick={startNewChat} className={`flex items-center gap-2.5 bg-[#006D5B] hover:bg-[#128c7e] text-white border-none rounded-full w-full shadow-md transition-colors duration-200 font-bold ${isLandscapeMobile ? 'py-2 px-3 text-xs' : 'py-3 px-4 text-sm'}`}>
              <span className="text-lg">+</span> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 custom-scrollbar-sidebar">
            <div className="text-[11px] uppercase text-[#e9edef]/70 py-2.5 px-1.5 font-bold tracking-wide">Recent</div>
            {chatHistoryList.map(chat => {
              const isActive = sessionId === chat.id;
              return (
                <div key={chat.id} onClick={() => { loadOldChat(chat.id); setSidebarOpen(false) }} className={`group flex items-center justify-between gap-2.5 mb-1 rounded-full cursor-pointer transition-all duration-200 ${isLandscapeMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-[13px]'} ${isActive ? "bg-[#006D5B] text-white border-b-3 border-[#044a3a]/50 translate-y-px" : "text-[#e9edef] hover:bg-[#006D5B] hover:text-white border-b-4 border-transparent hover:border-[#044a3a]/30"}`}>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <svg width={isLandscapeMobile ? "12" : "14"} height={isLandscapeMobile ? "12" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button onClick={(e) => deleteChatDirectly(e, chat.id)} className={`p-1 border-none bg-transparent cursor-pointer transition-opacity duration-200 ${isActive ? "text-[#ff6b6b] opacity-100" : "text-[#aebac1] opacity-0 group-hover:opacity-100 hover:text-[#ff6b6b]"}`} title="Delete Chat">
                    <svg width={isLandscapeMobile ? "12" : "14"} height={isLandscapeMobile ? "12" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              )
            })}
          </div>

          <div className={`bg-[#006D5B] rounded-full border-t-2 border-[#075e54]/70 ${isLandscapeMobile ? 'px-4 py-2' : 'px-6 py-3'}`}>
            <div className={`text-[#e9edef] ${isLandscapeMobile ? 'text-[10px]' : 'text-xs'}`}>
              {email ? email : `Guest User (${guestPromptsLeft} left)`}
            </div>
          </div>
        </div>)}

        {/* --- MOBILE OVERLAY --- */}
        {email && mobileMenuOpen && (
          <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className={`w-[85%] max-w-[300px] h-full bg-[#006D5B] text-white shadow-2xl flex flex-col ${isLandscapeMobile ? 'p-3' : 'p-5'}`} onClick={(e) => e.stopPropagation()}>
              <button onClick={startNewChat} className={`w-full border-none rounded-full font-medium text-white bg-[#006D5B] hover:bg-[#128c7e] ${isLandscapeMobile ? 'mb-3 p-2.5 text-sm' : 'mb-5 p-4 text-base'}`}>+ New Chat</button>
              <div className="mt-2.5 flex-1 overflow-y-auto custom-scrollbar-sidebar">
                <div className="text-xs uppercase text-[#e9edef]/70 mb-2.5 font-bold">Recent Chats</div>
                {chatHistoryList.map(chat => (
                  <div key={chat.id} onClick={() => loadOldChat(chat.id)} className={`border-b border-[#075e54] cursor-pointer flex items-center justify-between gap-2.5 ${isLandscapeMobile ? 'p-2 text-xs' : 'p-3.5 text-[15px]'} ${sessionId === chat.id ? "text-white font-semibold bg-[#075e54]" : "text-[#e9edef]"}`}>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <button onClick={(e) => deleteChatDirectly(e, chat.id)} className="border-none bg-transparent text-[#ef4444] cursor-pointer p-2">
                      <svg width={isLandscapeMobile ? "14" : "16"} height={isLandscapeMobile ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTENT --- */}
        <div className={`flex-1 flex flex-col h-full relative bg-[#faf9f5]`}>

          {/* Top Bar */}
          <div className={`px-4 py-3 flex items-center justify-between ${isLandscapeMobile ? 'min-h-[40px]' : 'min-h-[60px]'}`}>
            <div className="flex items-center">
              {email && (
                <button onClick={() => { if (window.innerWidth < 768) setMobileMenuOpen(true); else setSidebarOpen(!sidebarOpen); }} className="bg-transparent border-none cursor-pointer p-2.5 mr-2 text-[#54656f] hover:bg-black/5 rounded-full flex items-center justify-center transition-colors">
                  <svg width={isLandscapeMobile ? "18" : "24"} height={isLandscapeMobile ? "18" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
              )}
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto flex flex-col px-2.5 custom-scrollbar-chat ${isLandscapeMobile ? 'pb-2' : ''}`}>
            <div className={`w-full max-w-3xl mx-auto flex flex-col ${isLandscapeMobile ? 'py-2 gap-3' : 'py-5 pb-10 gap-6'}`}>

              {messages.length === 0 && (
                <div className="mt-[15%] text-center px-5">
                  <div className={`font-bold text-[#333] mb-2 ${isLandscapeMobile ? 'text-lg' : 'text-2xl'}`}>Dyno here!!</div>
                  <div className={`text-[#666] ${isLandscapeMobile ? 'text-sm' : 'text-base'}`}>Ask about history, geography, or specific empires.</div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex-initial max-w-[85%] min-w-0 ${isLandscapeMobile ? 'p-2 px-3' : 'p-3 px-4.5'} rounded-t-2xl ${msg.role === "user" ? "bg-[#d9fdd3] text-[#111b21] rounded-bl-2xl shadow-md" : "bg-transparent text-[#111b21] rounded-br-2xl shadow-none"}`}>

                    <div className={`${isLandscapeMobile ? 'text-sm leading-snug' : 'text-base leading-relaxed'}`}>
                      <ReactMarkdown
                        children={msg.content}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="mb-2.5 pl-6 list-disc" {...props} />,
                          ol: ({ node, ...props }) => <ol className="mb-2.5 pl-6 list-decimal" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1.5" {...props} />,
                          h1: ({ node, ...props }) => <h1 className={`${isLandscapeMobile ? 'text-lg' : 'text-xl'} font-bold mt-4 mb-2`} {...props} />,
                          h2: ({ node, ...props }) => <h2 className={`${isLandscapeMobile ? 'text-base' : 'text-lg'} font-bold mt-3.5 mb-2`} {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-1.5" {...props} />,
                          table: ({ node, ...props }) => <div className="overflow-x-auto mb-4 border border-gray-200 rounded"><table className="w-full text-sm border-collapse" {...props} /></div>,
                          thead: ({ node, ...props }) => <thead className="bg-gray-100 border-b-2 border-gray-200" {...props} />,
                          th: ({ node, ...props }) => <th className="p-3 text-left font-semibold border border-gray-200" {...props} />,
                          td: ({ node, ...props }) => <td className="p-3 border border-gray-200 align-top" {...props} />,
                          code: ({ node, inline, className, children, ...props }) => inline ? <code className="px-1 py-0.5 rounded text-[90%] font-mono bg-black/5" {...props}>{children}</code> : <code className="block bg-[#f0f2f5] text-[#111b21] p-3 rounded-lg overflow-x-auto mb-2.5 font-mono text-[13px]" {...props}>{children}</code>
                        }}
                      />
                    </div>

                    {((msg.citations && msg.citations.length > 0) || msg.empire_match) && (
                      <div className={`flex flex-wrap gap-3 mt-3 ${isLandscapeMobile ? 'gap-2 mt-2' : 'gap-3 mt-3'}`}>
                        {msg.citations && msg.citations.length > 0 && (
                          <button onClick={() => setActiveCitations(msg.citations)} className={`bg-[#f0f2f5] border border-[#e9edef] hover:bg-[#d9dce0] rounded-full text-[#111b21] flex items-center font-medium transition-colors shadow-sm ${isLandscapeMobile ? 'px-2.5 py-1.5 text-[11px] gap-1.5' : 'px-3.5 py-2 text-[13px] gap-2'}`}>
                            <svg width={isLandscapeMobile ? "12" : "14"} height={isLandscapeMobile ? "12" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                            View Sources ({msg.citations.length})
                          </button>
                        )}
                        {msg.empire_match && (
                          <button onClick={() => handleFlyTo(msg.empire_match)} className={`bg-[#f0f2f5] border border-[#e9edef] hover:bg-[#d9dce0] rounded-full text-[#111b21] flex items-center font-medium transition-colors shadow-sm ${isLandscapeMobile ? 'px-2.5 py-1.5 text-[11px] gap-1.5' : 'px-3.5 py-2 text-[13px] gap-2'}`}>
                            <svg width={isLandscapeMobile ? "12" : "14"} height={isLandscapeMobile ? "12" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                            Fly to Location
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex flex-col w-full pl-6 mt-4 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {thinkingTexts.map((text, idx) => {
                      if (idx > thinkingIndex) return null;
                      return (
                        <motion.div key={`${text}-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className={`flex items-start gap-4 relative ${isLandscapeMobile ? 'min-h-[25px]' : 'min-h-[40px]'}`}>
                          <div className="flex flex-col items-center self-stretch w-3 shrink-0">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="w-2.5 h-2.5 rounded-full bg-black z-10 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.2)]" />
                            {idx < thinkingIndex && <motion.div initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ duration: 0.8, ease: "easeInOut" }} className="w-[1.5px] bg-gradient-to-b from-black to-black/5 -mt-1" />}
                          </div>
                          <motion.div initial={{ opacity: 0, x: -12, filter: "blur(4px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ delay: 0.2, duration: 0.6 }} className={isLandscapeMobile ? 'pb-2' : 'pb-4'}>
                            <span className={`${isLandscapeMobile ? 'text-xs' : 'text-sm'} text-[#54656f] italic font-medium tracking-tight`}>{text}</span>
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="flex items-center gap-4 h-6 ml-0.5">
                     <div className="w-2.5 flex justify-center"><div className="w-1.5 h-1.5 bg-[#075e54] rounded-full" /></div>
                  </motion.div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-px" />
            </div>
          </div>

          {/* Input Area */}
          <div className={`w-full flex justify-center bg-[#faf9f5] shrink-0 border-t border-[#d1d7db] ${isLandscapeMobile ? 'p-2' : 'p-4'}`}>
            <div className="w-full max-w-3xl relative">

              {!email && (
                <div className="w-full text-center text-[13px] text-[#54656f] mb-2 font-medium">
                  Free prompts remaining: <span className="font-bold text-[#006D5B]">{guestPromptsLeft}/10</span>. 
                  <button onClick={() => navigate('/myProjects')} className="text-[#006D5B] hover:underline ml-1 cursor-pointer bg-transparent border-none">
                    Login for unlimited access
                  </button>
                </div>
              )}

              <div className={`mb-3 flex flex-wrap ${isLandscapeMobile ? 'gap-1.5 mb-1.5' : 'gap-2.5 mb-3'}`}>
                <select value={selectedGrade === 0 ? "no_grade" : selectedGrade === null ? "all_grades" : selectedGrade} onChange={(e) => { const val = e.target.value; setSelectedGrade(val === "no_grade" ? 0 : val === "all_grades" ? null : val); }} className={`rounded-full border border-[#e9edef] bg-white text-[#111b21] outline-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors ${isLandscapeMobile ? 'py-1 px-2 text-xs min-h-[30px]' : 'py-2.5 px-4 text-sm min-h-[40px]'}`}>
                  <option value="no_grade">No Grade</option>
                  <option value="all_grades">All Grades</option>
                  {[6, 7, 8, 9, 10, 11, 12].map(g => <option key={g} value={`${g}th Grade`}>{g}th Grade</option>)}
                </select>
                <select value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)} className={`rounded-full border border-[#e9edef] bg-white text-[#111b21] outline-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors ${isLandscapeMobile ? 'py-1 px-2 text-xs min-h-[30px]' : 'py-2.5 px-3 text-sm min-h-[40px]'}`}>
                  <option value="en-IN">English (India)</option>
                  <option value="kn-IN">Kannada</option>
                </select>
              </div>

              <div className={`relative w-full rounded-3xl overflow-hidden bg-white shadow-sm`}>
                {listening && <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[80%] h-[70px] blur-[10px] z-0 pointer-events-none animate-[pulse_2s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_bottom,rgba(37,211,102,0.8)_0%,transparent_100%)]" />}
                {!input && !listening && (
                  <div className={`absolute top-0 left-0 h-full flex items-center pointer-events-none z-0 ${isLandscapeMobile ? 'px-3' : 'px-4'}`}>
                    <AnimatePresence mode="wait">
                      <motion.span key={placeholderIndex} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className={`text-[#8696a0] truncate ${isLandscapeMobile ? 'text-sm' : 'text-base'}`}>
                        {placeholders[placeholderIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
                <input type="text" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }} placeholder={listening ? "Listening..." : ""} className={`w-full border-none outline-none bg-transparent text-[#111b21] relative z-10 placeholder-[#8696a0] ${isLandscapeMobile ? 'text-sm px-3 py-2 pr-[80px]' : 'text-base px-4 py-3.5 pr-[110px]'}`} />

                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex gap-1.5">
                  {browserSupportsSpeechRecognition && (
                    <button onClick={handleMicClick} title="Speech to Text" className={`rounded-full flex items-center justify-center transition-all duration-200 border-b-2 border-black/10 ${isLandscapeMobile ? 'w-8 h-8' : 'w-10 h-10'} ${listening ? "bg-[#25d366] text-white hover:bg-[#128c7e] shadow-[0_0_10px_rgba(37,211,102,0.3)]" : "bg-zinc-100/50 text-[#54656f] hover:bg-[#f0f1e3]"}`}>
                      {listening ? <svg width={isLandscapeMobile ? "14" : "20"} height={isLandscapeMobile ? "14" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" /></svg> : <svg width={isLandscapeMobile ? "14" : "20"} height={isLandscapeMobile ? "14" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}
                    </button>
                  )}
                  <button onClick={() => sendMessage()} disabled={!input.trim() || loading || (!email && guestPromptsLeft <= 0)} className={`rounded-full flex items-center justify-center transition-all duration-200 border-b-2 border-black/10 ${isLandscapeMobile ? 'w-8 h-8' : 'w-10 h-10'} ${input.trim() && !loading && (email || guestPromptsLeft > 0) ? "bg-[#075e54] text-white hover:bg-[#006D5B] cursor-pointer" : "bg-transparent text-[#aebac1] cursor-not-allowed"}`}>
                    <svg width={isLandscapeMobile ? "14" : "18"} height={isLandscapeMobile ? "14" : "18"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {activeCitations && (
            <div className={`fixed right-5 w-[calc(100%-40px)] bg-white text-[#111b21] shadow-2xl rounded-xl z-50 max-h-[50%] flex flex-col border border-gray-200 ${isLandscapeMobile ? 'top-[50px] max-w-[250px]' : 'top-[70px] max-w-[300px]'}`}>
              <div className={`border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl ${isLandscapeMobile ? 'p-2' : 'p-4'}`}>
                <span className={`font-semibold ${isLandscapeMobile ? 'text-xs' : 'text-sm'}`}>References</span>
                <button onClick={() => setActiveCitations(null)} className="border-none bg-transparent cursor-pointer p-2 text-2xl text-[#54656f] leading-[0.5] hover:text-[#111b21]">&times;</button>
              </div>
              <div className={`overflow-y-auto custom-scrollbar-chat ${isLandscapeMobile ? 'p-2' : 'p-4'}`}>
                {activeCitations.map((c, i) => (
                  <div key={i} className={`mb-2.5 bg-[#f0f2f5] rounded-lg text-[#111b21] leading-snug ${isLandscapeMobile ? 'p-2 text-[11px]' : 'p-3 text-[13px]'}`}>
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