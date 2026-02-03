import "regenerator-runtime/runtime";
import { useState, useRef, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setYear, setFlyToPosition, setMarkers } from "../../store/mapSlice";
import { yearFromDbFormat } from "../../utils/era";
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { motion, AnimatePresence } from "framer-motion";

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

  async function fetchThinkingText(query) {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 60,
          messages: [
            {
              role: "user",
              content: `You are generating background “thinking” status text for an AI assistant.
The assistant answers questions ONLY about history, geography, etc.
Generate exactly 5 short thinking status messages (2-6 words).
User query: "${query}"`
            }
          ]
        })
      }
    );

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices[0].message.content
      .split("\n")
      .map(t => t.replace(/^[-•]/, "").trim())
      .filter(Boolean);
  }

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
  const [thinkingTexts, setThinkingTexts] = useState([]);
  const [thinkingIndex, setThinkingIndex] = useState(0);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (email) loadHistoryList();
  }, [email]);

  // --- SYNC VOICE TRANSCRIPT ---
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
      const sortedChats = chats.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setChatHistoryList(sortedChats.map(c => ({
        id: c.sessionId,
        title: c.chatTitle || "New Chat"
      })));
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
    }
  };

  const mapHistoryToUi = (historyItem) => {
    const uiMsgs = [];
    let userContent = historyItem.userInput || "";
    const identifier = "//////";
    const hasIdentifier = userContent.includes(identifier);
    
    if (hasIdentifier) {
      userContent = userContent.split(identifier)[0].trim();
    }

    uiMsgs.push({ role: "user", content: userContent, timestamp: historyItem.timestamp });

    let empireData = null;
    if (!hasIdentifier && historyItem.flyToPosition?.lat) {
      empireData = { ...historyItem.flyToPosition, name: historyItem.flyToPosition.location || "Location" };
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
        const sortedHistory = data.history.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        const uiMessages = [];
        sortedHistory.forEach(h => uiMessages.push(...mapHistoryToUi(h)));
        setMessages(uiMessages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toSignedYear = (yVal, eraVal) => {
    const converted = yearFromDbFormat(yVal, eraVal);
    return Number.isFinite(converted) ? converted : null;
  };

  const handleFlyTo = (empireMatch) => {
    if (!empireMatch) return;
    const { lat, lng, time, markers, zoom } = empireMatch;
    if (window.mapxFlyTo) window.mapxFlyTo({ lng, lat, zoom: zoom || 4 });
    
    dispatch(setFlyToPosition({ lat, lng }));
    dispatch(setMarkers(markers));

    if (time) {
      let y = typeof time === 'object' ? toSignedYear(time.year, time.era) : toSignedYear(time);
      if (y !== null) dispatch(setYear(y));
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput("");
    resetTranscript();
    setAutoFlyCount(0);
    setSidebarOpen(false);
    if (window.innerWidth < 768) setMobileMenuOpen(false);
  };

  const handleMicClick = async () => {
    if (listening) await SpeechRecognition.abortListening();
    else SpeechRecognition.startListening({ continuous: true, language: voiceLanguage });
  };

  const sendMessage = async (overrideInput = null, overrideGrade = null, forceNewSession = false, skipAutoFly = false, isHidden = false) => {
    const textToSend = overrideInput || input;
    const gradeToSend = overrideGrade !== null ? overrideGrade : selectedGrade;
    const activeSessionId = forceNewSession ? null : sessionId;

    if (!textToSend.trim() || loading) return;
    if (listening) await SpeechRecognition.abortListening();
    if (!overrideInput) { setInput(""); resetTranscript(); }

    setLoading(true);

    let displayContent = textToSend;
    const identifier = "//////";
    if (textToSend.includes(identifier)) displayContent = textToSend.split(identifier)[0].trim();

    const userMessage = { role: "user", content: displayContent };
    if (!isHidden) {
      forceNewSession ? setMessages([userMessage]) : setMessages(prev => [...prev, userMessage]);
    }

    try {
      const lang = voiceLanguage === "kn-IN" ? "kn" : "";
      setThinkingTexts([]);
      setThinkingIndex(0);
      fetchThinkingText(displayContent).then(t => setThinkingTexts(t.length ? t : ["Thinking…"])).catch(() => setThinkingTexts(["Thinking…"]));

      const data = await sendChatMessage(email, activeSessionId, textToSend, gradeToSend, lang);

      if (!activeSessionId && data.sessionId) {
        setSessionId(data.sessionId);
        loadHistoryList();
      }

      if (data.history) {
        const sortedHistory = data.history.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        const newUiMessages = [];
        sortedHistory.forEach(h => newUiMessages.push(...mapHistoryToUi(h)));
        setMessages(newUiMessages);

        const lastItem = sortedHistory[sortedHistory.length - 1];
        if (lastItem.flyToPosition && autoFlyCount < 2 && !skipAutoFly) {
          handleFlyTo(lastItem.flyToPosition);
          setAutoFlyCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Error contacting server." }]);
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

  // --- STYLES & MARKDOWN ---
  const styles = {
    // Top Bar
    topBarPadding: isCompact ? "px-2 py-1.5" : "px-4 py-3",
    topBarMinHeight: isCompact ? "min-h-[40px]" : "min-h-[60px]",
    topBarTitleSize: isCompact ? "text-xs" : "text-base",
    
    // Sidebar
    sidebarWidth: isCompact ? "180px" : "250px",
    sidebarPadding: isCompact ? "p-2" : "p-4",
    sidebarItemPadding: isCompact ? "px-2 py-1.5" : "px-3 py-2.5",
    sidebarFontSize: isCompact ? "text-[11px]" : "text-[13px]",
    newChatBtnPadding: isCompact ? "py-2 px-3 text-xs" : "py-3 px-4 text-sm",
    
    // Chat List
    chatContainerPadding: isCompact ? "py-2 pb-16" : "py-5 pb-10",
    messagePadding: isCompact ? "p-2 px-3" : "p-3 px-4.5",
    messageFontSize: isCompact ? "text-[12px] leading-snug" : "text-base leading-relaxed",
    
    // Input Area
    inputAreaPadding: isCompact ? "p-2" : "p-4",
    dropdownHeight: isCompact ? "py-1 px-2 text-xs min-h-[28px]" : "py-2.5 px-4 text-sm min-h-[40px]",
    inputFieldPadding: isCompact ? "px-3 py-2 pr-[80px] text-xs" : "px-4 py-3.5 pr-[110px] text-base",
    
    // Action Buttons
    actionBtnSize: isCompact ? "w-8 h-8" : "w-10 h-10",
    actionIconSize: isCompact ? 16 : 20,
    
    // Misc
    citationBtnSize: isCompact ? "px-2 py-1 text-[10px]" : "px-3.5 py-2 text-[13px]",
  };

  // Dynamic Markdown Components
  const markdownComponents = useMemo(() => ({
    p: ({ node, ...props }) => <p className={`${isCompact ? "mb-1.5" : "mb-2.5"} last:mb-0`} {...props} />,
    ul: ({ node, ...props }) => <ul className={`${isCompact ? "mb-1.5 pl-4" : "mb-2.5 pl-6"} list-disc`} {...props} />,
    ol: ({ node, ...props }) => <ol className={`${isCompact ? "mb-1.5 pl-4" : "mb-2.5 pl-6"} list-decimal`} {...props} />,
    li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
    h1: ({ node, ...props }) => <h1 className={`${isCompact ? "text-base mt-2 mb-1" : "text-xl mt-4 mb-2"} font-bold`} {...props} />,
    h2: ({ node, ...props }) => <h2 className={`${isCompact ? "text-sm mt-2 mb-1" : "text-lg mt-3.5 mb-2"} font-bold`} {...props} />,
    h3: ({ node, ...props }) => <h3 className={`${isCompact ? "text-xs mt-1 mb-0.5" : "text-base mt-3 mb-1.5"} font-bold`} {...props} />,
    code: ({ node, inline, className, children, ...props }) => inline 
        ? <code className="px-1 py-0.5 rounded text-[90%] font-mono bg-black/5" {...props}>{children}</code>
        : <code className={`block bg-[#f0f2f5] text-[#111b21] p-2 rounded-lg mb-2 font-mono ${isCompact ? "text-[11px]" : "text-[13px]"}`} {...props}>{children}</code>
  }), [isCompact]);

  return (
    <>
      <div className="flex h-full w-full relative rounded-[25px] overflow-hidden font-sans bg-[#f1ebe3] text-[#111b21]">

        {/* --- SIDEBAR (Desktop) --- */}
        <div
          className={`hidden md:flex flex-col shrink-0 border-r border-[#004f42] transition-all duration-300 overflow-hidden bg-[#075e54] text-white`}
          style={{ width: sidebarOpen ? styles.sidebarWidth : "0px" }}
        >
          <div className={styles.sidebarPadding}>
            <button
              onClick={startNewChat}
              className={`flex items-center gap-2.5 bg-[#006D5B] hover:bg-[#128c7e] text-white border-none rounded-full w-full shadow-md transition-colors duration-200 font-bold ${styles.newChatBtnPadding}`}
            >
              <span className="text-lg">+</span> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 custom-scrollbar-sidebar">
            <div className={`text-[#e9edef]/70 font-bold tracking-wide ${isCompact ? "text-[9px] py-1.5 px-1" : "text-[11px] py-2.5 px-1.5"}`}>RECENT</div>
            {chatHistoryList.map(chat => {
              const isActive = sessionId === chat.id;
              return (
                <div key={chat.id}
                  onClick={() => { loadOldChat(chat.id); setSidebarOpen(false) }}
                  className={`group flex items-center justify-between gap-2.5 mb-1 rounded-full cursor-pointer transition-all duration-200 ${styles.sidebarItemPadding} ${styles.sidebarFontSize} ${isActive
                      ? "bg-[#006D5B] text-white border-b-3 border-[#044a3a]/50 translate-y-px"
                      : "text-[#e9edef] hover:bg-[#006D5B] hover:text-white border-b-4 border-transparent hover:border-[#044a3a]/30"
                    }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <svg width={isCompact ? 12 : 14} height={isCompact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteChatDirectly(e, chat.id)}
                    className={`p-1 border-none bg-transparent cursor-pointer transition-opacity duration-200 ${isActive ? "text-[#ff6b6b] opacity-100" : "text-[#aebac1] opacity-0 group-hover:opacity-100 hover:text-[#ff6b6b]"}`}
                    title="Delete Chat"
                  >
                    <svg width={isCompact ? 12 : 14} height={isCompact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              )
            })}
          </div>

          <div className={`${isCompact ? "px-4 py-2" : "px-6 py-3"} bg-[#006D5B] rounded-full border-t-2 border-[#075e54]/70`}>
            <div className={`text-[#e9edef] truncate ${isCompact ? "text-[10px]" : "text-xs"}`}>{email || "User"}</div>
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 flex flex-col h-full relative bg-[#faf9f5]">

          {/* Top Bar */}
          <div className={`${styles.topBarPadding} flex items-center justify-between ${styles.topBarMinHeight} border-b border-[#d1d7db]`}>
            <div className="flex items-center">
              <button
                onClick={() => { if (window.innerWidth < 768) setMobileMenuOpen(true); else setSidebarOpen(!sidebarOpen); }}
                className="bg-transparent border-none cursor-pointer p-2 text-[#54656f] hover:bg-black/5 rounded-full transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
              <span className={`font-bold ml-2 text-[#54656f] ${styles.topBarTitleSize}`}>Dyno Chat</span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto flex flex-col px-2.5 custom-scrollbar-chat">
            <div className={`w-full max-w-3xl mx-auto flex flex-col gap-4 ${styles.chatContainerPadding}`}>

              {messages.length === 0 && (
                <div className={`mt-[10%] text-center px-5 ${isCompact ? "text-xs" : "text-base"}`}>
                  <div className="font-bold text-[#333] mb-1">Dyno here!!</div>
                  <div className="text-[#666]">Ask about history & geography.</div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`
                      flex-initial max-w-[90%] min-w-0 rounded-t-2xl 
                      ${styles.messagePadding}
                      ${msg.role === "user" ? "bg-[#d9fdd3] text-[#111b21] rounded-bl-2xl shadow-sm" : "bg-white text-[#111b21] rounded-br-2xl shadow-sm"}
                    `}>

                    <div className={styles.messageFontSize}>
                      <ReactMarkdown children={msg.content} remarkPlugins={[remarkGfm]} components={markdownComponents} />
                    </div>

                    {((msg.citations && msg.citations.length > 0) || msg.empire_match) && (
                      <div className={`flex flex-wrap gap-2 ${isCompact ? "mt-1.5" : "mt-3"}`}>
                        {msg.citations?.length > 0 && (
                          <button onClick={() => setActiveCitations(msg.citations)} className={`bg-[#f0f2f5] border border-[#e9edef] hover:bg-[#d9dce0] rounded-full flex items-center gap-1 font-medium transition-colors ${styles.citationBtnSize}`}>
                            Src ({msg.citations.length})
                          </button>
                        )}
                        {msg.empire_match && (
                          <button onClick={() => handleFlyTo(msg.empire_match)} className={`bg-[#e7fce3] border border-[#c9ebb9] hover:bg-[#d4f8cd] text-[#0b4f04] rounded-full flex items-center gap-1 font-medium transition-colors ${styles.citationBtnSize}`}>
                            Fly to Map
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className={`pl-4 mt-2 ${isCompact ? "text-[10px]" : "text-sm"} text-[#54656f] italic`}>
                   {thinkingTexts[thinkingIndex] || "Thinking..."}
                </div>
              )}
              <div ref={messagesEndRef} className="h-px" />
            </div>
          </div>

          {/* Input Area */}
          <div className={`w-full flex justify-center bg-[#faf9f5] shrink-0 border-t border-[#d1d7db] ${styles.inputAreaPadding}`}>
            <div className="w-full max-w-3xl relative">

              {/* SETTINGS BAR */}
              <div className="mb-2 flex gap-2 flex-wrap">
                <select
                  value={selectedGrade || "no_grade"}
                  onChange={(e) => setSelectedGrade(e.target.value === "no_grade" ? 0 : e.target.value === "all_grades" ? null : e.target.value)}
                  className={`rounded-full border border-[#e9edef] bg-white text-[#111b21] outline-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors ${styles.dropdownHeight}`}
                >
                  <option value="no_grade">No Grade</option>
                  <option value="all_grades">All</option>
                  {[6, 7, 8, 9, 10, 11, 12].map((g) => <option key={g} value={`${g}th Grade`}>{g}th</option>)}
                </select>

                <select
                  value={voiceLanguage}
                  onChange={(e) => setVoiceLanguage(e.target.value)}
                  className={`rounded-full border border-[#e9edef] bg-white text-[#111b21] outline-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors ${styles.dropdownHeight}`}
                >
                  <option value="en-IN">Eng</option>
                  <option value="kn-IN">Kan</option>
                </select>
              </div>

              {/* INPUT CONTAINER */}
              <div className="relative w-full overflow-hidden bg-white shadow-sm border border-[#e9edef] rounded-3xl">
                
                {listening && <div className="absolute bottom-0 left-0 w-full h-full bg-green-50/50 animate-pulse pointer-events-none" />}

                <input
                  type="text"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={listening ? "Listening..." : "Ask Dyno..."}
                  className={`w-full border-none outline-none bg-transparent text-[#111b21] relative z-10 placeholder-[#8696a0] ${styles.inputFieldPadding}`}
                />

                <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex gap-1">
                  {browserSupportsSpeechRecognition && (
                    <button
                      onClick={handleMicClick}
                      className={`${styles.actionBtnSize} rounded-full flex items-center justify-center transition-all ${listening ? "bg-[#25d366] text-white" : "bg-transparent text-[#54656f] hover:bg-black/5"}`}
                    >
                      {listening ? <div className="w-2 h-2 bg-white rounded-sm animate-pulse"/> : <svg width={styles.actionIconSize} height={styles.actionIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}
                    </button>
                  )}

                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className={`${styles.actionBtnSize} rounded-full flex items-center justify-center transition-all ${input.trim() ? "bg-[#075e54] text-white" : "text-[#aebac1]"}`}
                  >
                    <svg width={styles.actionIconSize} height={styles.actionIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Citations Popup */}
          {activeCitations && (
            <div className={`fixed right-5 top-[50px] w-[250px] bg-white text-[#111b21] shadow-2xl rounded-xl z-50 border border-gray-200 ${isCompact ? "text-[10px]" : "text-xs"}`}>
              <div className="p-2 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                <span className="font-bold">References</span>
                <button onClick={() => setActiveCitations(null)} className="text-lg leading-none text-gray-500 hover:text-black">&times;</button>
              </div>
              <div className="p-2 max-h-[200px] overflow-y-auto">
                {activeCitations.map((c, i) => (
                  <div key={i} className="mb-1 p-2 bg-[#f0f2f5] rounded">
                    {typeof c === "string" ? c : `Page ${c.page} • ${c.lesson}`}
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