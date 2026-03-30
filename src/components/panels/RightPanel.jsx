import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom"; // <-- Added useNavigate
import { toast } from "react-toastify";
import RightPanelData from "./RightPanelData";
import { motion, AnimatePresence } from "framer-motion";

// --- Design Tokens ---
const STYLES = {
  glassPanel: "bg-[#18181b]/95 backdrop-blur-2xl border border-white/5",
  glassPopup: "bg-[#18181b] backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]",
  activeButton: "bg-zinc-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border-t border-white/10 hover:bg-zinc-700 transition-all duration-200 active:scale-95",
  textMuted: "text-zinc-400",
  textHighContrast: "text-white",
  iconHover: "rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer",
};

function Open({ setIsOpen, project, isDemo }) { // <-- Added isDemo prop
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
  
  const [activeModal, setActiveModal] = useState(null); // 'save' | 'share' | null
  const modalRef = useRef(null);

  const [projName, setProjName] = useState(project.projectName || "Demo Project"); // Fallback for demo
  const [originalProjName, setOriginalProjName] = useState(project.projectName || "Demo Project");
  
  const { ownerEmail } = useSelector((state) => state.project);
  const { id } = useParams();
  const navigate = useNavigate(); // <-- For demo login redirect
  
  // If in demo mode, they are never the owner.
  const isOwner = !isDemo && project.ownerEmail == ownerEmail;
  const shareLink = `${window.location.origin}/clone/${id}`;

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
    panelWidth: isCompact ? 210 : 320,
    padding: isCompact ? "px-4 py-2" : "px-6 py-6",
    gap: isCompact ? "gap-2" : "gap-3",
    iconSize: isCompact ? "w-6 h-6" : "w-10 h-10",
    svgSize: isCompact ? 14 : 20, // Main close icon
    innerSvgSize: isCompact ? 10 : 14, // Save/Share icons
    titleSize: isCompact ? "text-[10px]" : "text-xl",
    labelSize: isCompact ? "text-[8px]" : "text-xs",
    modalWidth: isCompact ? "w-[260px]" : "w-[420px]",
    modalPadding: isCompact ? "p-3 gap-3" : "p-6 gap-5",
    inputHeight: isCompact ? "py-1 px-2 text-[10px]" : "px-4 py-2 text-base",
    actionBtnHeight: isCompact ? "h-7 text-[10px]" : "h-12 text-base",
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (activeModal === 'save') setProjName(originalProjName);
        setActiveModal(null);
      }
    };
    if(activeModal) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeModal, originalProjName]);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard!");
      setActiveModal(null);
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  async function handleNameChange() {
    try {
      const token = localStorage.getItem("bearerToken");
      await axios.patch(
        BASE_URL + "/update-project",
        { ownerEmail, projectName: projName, projectId: id },
        { headers: { client_name: "mapx", Authorization: `Bearer ${token}` } }
      );
      toast.success("Project name updated!");
      setOriginalProjName(projName);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating name");
      setProjName(project.projectName);
    }
    setActiveModal(null);
  }

  return (
    <motion.div 
      className="relative h-[calc(100vh-0.5rem)] m-1 z-50"
      initial={{ width: 60, opacity: 0 }}
      animate={{ width: styles.panelWidth, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <AnimatePresence>
        {activeModal && !isDemo && ( // Prevent modals entirely in demo mode
          <motion.div
            key="modal"
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={`absolute top right-[102%] ${styles.modalWidth} rounded-3xl ${styles.modalPadding} flex flex-col ${STYLES.glassPopup} z-[60]`}
          >
            <div className="flex justify-between items-center">
               <h3 className={`text-white font-medium ${isCompact ? "text-xs" : "text-lg"}`}>
                 {activeModal === 'save' ? 'Edit Project' : 'Share Project'}
               </h3>
               <div 
                 onClick={(e) => { e.stopPropagation(); setActiveModal(null); }} 
                 className="cursor-pointer text-zinc-500 hover:text-white transition-colors p-1"
               >
                 ✕
               </div>
            </div>

            {activeModal === 'save' ? (
              <>
                <div className={`flex flex-col ${isCompact ? "gap-1" : "gap-2"}`}>
                  <label className={`${isCompact ? "text-[9px]" : "text-sm"} ${STYLES.textMuted}`}>Project Name</label>
                  <div className={`flex items-center rounded-xl bg-black/40 border border-white/5 w-full ${styles.inputHeight}`}>
                    <input
                      type="text"
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      className="flex-1 bg-transparent text-white outline-none placeholder-zinc-600"
                    />
                  </div>
                </div>
                <button onClick={handleNameChange} className={`${styles.actionBtnHeight} w-full rounded-full flex items-center justify-center gap-2 font-medium transition-all active:scale-95 ${STYLES.activeButton}`}>
                  <span>Confirm Save</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width={isCompact ? 10 : 18} height={isCompact ? 10 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </button>
              </>
            ) : (
              <>
                <div className={`flex flex-col ${isCompact ? "gap-1" : "gap-2"}`}>
                  <label className={`${isCompact ? "text-[9px]" : "text-sm"} ${STYLES.textMuted}`}>Share Link</label>
                  <div className={`flex items-center rounded-xl bg-black/40 border border-white/5 w-full ${styles.inputHeight}`}>
                    <input type="text" readOnly value={shareLink} className="flex-1 bg-transparent text-zinc-300 outline-none truncate" />
                  </div>
                </div>
                <button 
                  onClick={handleCopyLink} 
                  className={`${styles.actionBtnHeight} w-full rounded-full flex items-center justify-center gap-2 font-medium transition-all active:scale-95 bg-[#9EFAA5] text-black border-t border-white/40 shadow-[0_2px_10px_rgba(158,250,165,0.2)] hover:brightness-110`}
                >
                  <span>Copy Link</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width={isCompact ? 10 : 18} height={isCompact ? 10 : 18} viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-full h-full flex flex-col justify-between ${STYLES.glassPanel} ${isCompact?"rounded-2xl":"rounded-4xl"} shadow-2xl overflow-hidden`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          
          {/* TOP HEADER ROW */}
          <div className={`${styles.padding} flex justify-between items-center `}>
            {/* Close Button */}
            <div
              className={`${STYLES.iconHover} ${styles.iconSize}`}
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={styles.svgSize} height={styles.svgSize} viewBox="0 0 24 24" className="text-zinc-400">
                <g fill="none" stroke="currentColor" strokeWidth={0.5}>
                  <rect width={20} height={18} x={2} y={3} rx={3} strokeLinecap="round" strokeLinejoin="round"></rect>
                  <path d="M15 3v18"></path>
                </g>
              </svg>
            </div>
            
            {/* ACTION BUTTONS (Conditional based on Auth/Demo status) */}
            {isDemo ? (
               // --- NEW DEMO LOGIN BUTTON ---
               <button
                 onClick={() => navigate('/myProjects')}
                 className={`flex-1 ml-3 px-3 py-1.5 rounded-full flex items-center justify-center gap-2 text-black font-semibold bg-[#9EFAA5] border-t border-white/40 shadow-[0_2px_10px_rgba(158,250,165,0.2)] hover:brightness-110 transition-all active:scale-95 ${isCompact ? "text-[9px] h-7" : "text-xs h-10"}`}
               >
                 <span>Login to unlock features</span>
               </button>
            ) : isOwner ? (
               // --- EXISTING OWNER BUTTONS ---
              <div className={`flex ${styles.gap}`}>
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveModal('save'); }} 
                  className={`flex-1 ${styles.iconSize} cursor-pointer rounded-full flex items-center justify-center gap-3 ${STYLES.activeButton}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={styles.innerSvgSize} height={styles.innerSvgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </div>

                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveModal('share'); }} 
                  className={`flex-1 ${styles.iconSize} cursor-pointer rounded-full flex items-center justify-center gap-3 bg-[#9EFAA5] text-black border-t border-white/40 shadow-[0_2px_10px_rgba(158,250,165,0.3)] hover:brightness-110 transition-all active:scale-95`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={styles.innerSvgSize} height={styles.innerSvgSize} viewBox="0 0 24 24"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                </div>
              </div>
            ) : null}
          </div>
            <div className={`px-6 flex items-center justify-between border-b border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]`}></div>

          <div className={`${isCompact ? "pt-1 pb-2" : "pt-3 pb-6"}`}>
            <div className={`px-4 ${isCompact ? "mb-2" : "mb-6"}`}>
                <label className={`${styles.labelSize} uppercase tracking-wider font-semibold ${STYLES.textMuted}`}>Current Project</label>
                <h2 className={`${styles.titleSize} font-medium mt-1 truncate ${STYLES.textHighContrast}`}>{originalProjName}</h2>
            </div>

            <div className={`px-6 mb-3 flex items-center justify-between border-b border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]`}></div>
            
            <div className="px-4 overflow-hidden shadow-inner">
              <RightPanelData isDemo={isDemo} /> {/* Passed isDemo down in case RightPanelData needs it */}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Closed({ setIsOpen, isDemo }) { // <-- Added isDemo here too just in case
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    if (window.innerHeight < 600 && window.innerWidth > window.innerHeight) setIsCompact(true);
  }, []);

  const glassStyle = "bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased";

  return (
    <motion.div 
      className={`h-[calc(100vh-0.5rem)] mr-1 rounded-l-3xl overflow-hidden flex flex-col items-center justify-start pt-[25px] ${glassStyle}`}
      initial={{ width: 60 }}
      animate={{ width: isCompact ? 50 : 60 }}
      exit={{ opacity: 0 }}
    >
      <div 
        onClick={() => setIsOpen(true)}
        className="cursor-pointer z-10 p-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={isCompact ? 20 : 30} height={isCompact ? 20 : 30} viewBox="0 0 20 20">
            <path fill="#fff" d="M7.5 3v14h9.25A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3ZM3.25 3H6v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3"></path>
        </svg>
      </div>
    </motion.div>
  );
}

const RightPanel = ({ project, isDemo }) => { // <-- Accept isDemo at the root component
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="fixed right-0 top-0 h-full z-50 flex items-center">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <Open key="open" setIsOpen={setIsOpen} project={project} isDemo={isDemo} />
        ) : (
          <Closed key="closed" setIsOpen={setIsOpen} isDemo={isDemo} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RightPanel;