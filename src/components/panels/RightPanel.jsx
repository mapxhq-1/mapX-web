import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import RightPanelData from "./RightPanelData";
import { motion, AnimatePresence } from "framer-motion";

// --- Design Tokens ---
const STYLES = {
  glassPanel: "bg-[#18181b]/95 backdrop-blur-2xl border border-white/5",
  glassPopup: "bg-[#18181b] backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]",
  activeButton: "bg-zinc-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border-t border-white/10 hover:bg-zinc-700 transition-all duration-200 active:scale-95",
  actionButton: "h-12 w-full rounded-full flex items-center justify-center gap-2 font-medium transition-all active:scale-95",
  etchedLine: "border-b border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]",
  inputField: "flex items-center rounded-xl bg-black/40 border border-white/5 px-4 py-2 w-full",
  textMuted: "text-zinc-400",
  textHighContrast: "text-white",
  iconHover: "h-10 w-10 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer",
};

// --- Animation Variants ---
const sidebarVariants = {
  open: { 
    width: 320, 
    opacity: 1, 
    transition: { type: "spring", stiffness: 300, damping: 30 } 
  },
  closed: { 
    width: 60, // Matched closer to the 60px design
    opacity: 1, 
    transition: { type: "spring", stiffness: 300, damping: 30 } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.2 } 
  }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, x: 10 },
  visible: { opacity: 1, scale: 1, x: 0, transition: { type: "spring", duration: 0.4 } },
  exit: { opacity: 0, scale: 0.9, x: 10, transition: { duration: 0.2 } }
};

function Open({ setIsOpen, project }) {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
  
  const [activeModal, setActiveModal] = useState(null); // 'save' | 'share' | null
  const modalRef = useRef(null);

  const [projName, setProjName] = useState(project.projectName);
  const [originalProjName, setOriginalProjName] = useState(project.projectName);
  
  const { ownerEmail } = useSelector((state) => state.project);
  const { id } = useParams();
  const isOwner = project.ownerEmail == ownerEmail;
  const shareLink = `${window.location.origin}/clone/${id}`;

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
      variants={sidebarVariants}
      initial="closed"
      animate="open"
      exit="exit"
    >
      <AnimatePresence>
        {activeModal && (
          <motion.div
            key="modal"
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute top right-[102%] w-[420px] rounded-3xl p-6 flex flex-col gap-5 ${STYLES.glassPopup} z-[60]`}
          >
            <div className="flex justify-between items-center">
               <h3 className="text-white text-lg font-medium">
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
                <div className="flex flex-col gap-2">
                  <label className={`text-sm ${STYLES.textMuted}`}>Project Name</label>
                  <div className={STYLES.inputField}>
                    <input
                      type="text"
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      className="flex-1 bg-transparent text-white outline-none placeholder-zinc-600"
                    />
                  </div>
                </div>
                <button onClick={handleNameChange} className={`${STYLES.actionButton} ${STYLES.activeButton}`}>
                  <span>Confirm Save</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className={`text-sm ${STYLES.textMuted}`}>Share Link</label>
                  <div className={STYLES.inputField}>
                    <input type="text" readOnly value={shareLink} className="flex-1 bg-transparent text-zinc-300 outline-none text-sm truncate" />
                  </div>
                </div>
                <button 
                  onClick={handleCopyLink} 
                  className={`${STYLES.actionButton} bg-[#9EFAA5] text-black border-t border-white/40 shadow-[0_2px_10px_rgba(158,250,165,0.2)] hover:brightness-110`}
                >
                  <span>Copy Link</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-full h-full flex flex-col justify-between ${STYLES.glassPanel} rounded-4xl shadow-2xl overflow-hidden`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          
          <div className={`px-6 py-6 flex justify-between items-center ${STYLES.etchedLine}`}>
            <div
              className={STYLES.iconHover}
              onClick={() => setIsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24" className="text-zinc-400">
                <g fill="none" stroke="currentColor" strokeWidth={0.5}>
                  <rect width={20} height={18} x={2} y={3} rx={3} strokeLinecap="round" strokeLinejoin="round"></rect>
                  <path d="M15 3v18"></path>
                </g>
              </svg>
            </div>
            {isOwner && (
              <div className="flex gap-3">
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveModal('save'); }} 
                  className={`flex-1 h-10 w-10 cursor-pointer rounded-full flex items-center justify-center gap-3 ${STYLES.activeButton}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </div>

                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveModal('share'); }} 
                  className={`flex-1 h-10 w-10 cursor-pointer rounded-full flex items-center justify-center gap-3 bg-[#9EFAA5] text-black border-t border-white/40 shadow-[0_2px_10px_rgba(158,250,165,0.3)] hover:brightness-110 transition-all active:scale-95`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 pb-6">
            <div className=" px-4 mb-6">
                <label className={`text-xs uppercase tracking-wider font-semibold ${STYLES.textMuted}`}>Current Project</label>
                <h2 className={`text-xl font-medium mt-1 truncate ${STYLES.textHighContrast}`}>{originalProjName}</h2>
            </div>

            

            <div className={`w-full mb-6 ${STYLES.etchedLine}`}></div>
            {/* FULL WIDTH DATA: Removed padding (p-4 -> p-0) and overflow-hidden to let children touch edges */}
            <div className="px-4 overflow-hidden shadow-inner">
              <RightPanelData />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Closed({ setIsOpen }) {
  // Using the styling you provided, applied to the motion component
  const glassStyle = "bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased";

  return (
    <motion.div 
      className={`h-[calc(100vh-0.5rem)] mr-1 rounded-l-3xl overflow-hidden flex flex-col items-center justify-start pt-[25px] ${glassStyle}`}
      variants={sidebarVariants}
      initial="open"
      animate="closed"
      exit="exit"
    >
      <div 
        onClick={() => setIsOpen(true)}
        className="cursor-pointer z-10 p-2" // z-10 ensures clickability over the pseudo-elements
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 20 20">
            <path fill="#fff" d="M7.5 3v14h9.25A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3ZM3.25 3H6v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3"></path>
        </svg>
      </div>
    </motion.div>
  );
}

const RightPanel = ({ project }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="fixed right-0 top-0 h-full z-50 flex items-center">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <Open key="open" setIsOpen={setIsOpen} project={project} />
        ) : (
          <Closed key="closed" setIsOpen={setIsOpen} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RightPanel;