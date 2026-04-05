import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { myProjApiCall, sharedProjApiCall } from "../../../store/projectSlice";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const ProjectCard = ({ data }) => {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
  const [menu, setMenu] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const menuref = useRef(null);
  const { ownerEmail } = useSelector((state) => state.project);
  const isOwner = data?.ownerEmail === ownerEmail;
  const [deleteBt, setDeleteBt] = useState(false);
  const [editBt, setEditBt] = useState(false);
  const [shareBt, setShareBt] = useState(false);
  const [projname, setProjname] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function getDate(timestamp) {
    if (!timestamp) return "";
    const t = String(timestamp);
    return t.includes("T") ? t.split("T")[0] : t;
  }

  function setAllFalse() {
    setDeleteBt(false);
    setEditBt(false);
    setShareBt(false);
  }

  const handleCopyShareLink = (e) => {
    e?.stopPropagation?.();
    try {
      const shareLink = `${window.location.origin}/share/${data.id}`;
      navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied to clipboard!");
      setMenu(false);
      setShareBt(false);
    } catch (err) {
      toast.error("Could not copy link.");
      console.error("Share error:", err);
    }
  };

  async function handlePrivate(e) {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("bearerToken");
      await axios.patch(
        BASE_URL + "/update-project",
        {
          accessorList: [],
          ownerEmail: ownerEmail,
          projectId: data.id,
        },
        {
          headers: {
            client_name: "mapx",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Your project is now private!!");
      setIsPrivate(true);
      dispatch(myProjApiCall());
      dispatch(sharedProjApiCall());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error updating project");
    }
    setAllFalse();
  }

  async function handleRename() {
    try {
      const token = localStorage.getItem("bearerToken");
      await axios.patch(
        BASE_URL + "/update-project",
        {
          projectName: projname,
          ownerEmail: ownerEmail,
          projectId: data.id,
        },
        {
          headers: {
            client_name: "mapx",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Renamed successfully!!");
      dispatch(myProjApiCall());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Rename failed");
      setProjname(data.projectName);
    }
    setAllFalse();
  }

  async function handleDelete(e) {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("bearerToken");
      await axios.delete(BASE_URL + "/delete-project/" + data.id, {
        params: {
          ownerEmail: ownerEmail,
        },
        headers: {
          client_name: "mapx",
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Project deleted!!");
      dispatch(myProjApiCall());
      dispatch(sharedProjApiCall());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
    setAllFalse();
  }

  useEffect(() => {
    setProjname(data.projectName);
    setIsPrivate((data.accessorList?.length || 0) === 0);

    function handleOutsideClick(event) {
      if (menuref.current && !menuref.current.contains(event.target)) {
        setMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [data]);

  const menuVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }
  };

  const isActive = menu || deleteBt || editBt || shareBt;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      // SCALING LOGIC UPDATED:
      // We use 'lg:' (1024px) instead of 'md:' (768px).
      // This ensures mobile landscape (usually ~800-900px) stays on the small version.
      className={`relative flex flex-col bg-[#18181b] shadow-xl border border-zinc-800 cursor-pointer overflow-visible group 
        w-[200px] lg:w-[280px] 
        rounded-2xl lg:rounded-3xl
        ${isActive ? "z-50" : "z-0"}`}
      onClick={() => navigate("/map/" + data.id)}
    >
      {/* --- Top Preview Section --- */}
      {/* Mobile/Landscape: h-[120px] | PC (>1024px): h-[180px] */}
      <div className="relative w-full p-2 h-[120px] lg:h-[180px]">
        
        <div className="absolute top-4 left-4 z-10">
          <div className="rounded-full bg-black/35 backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-2
            px-2 py-1 lg:px-3 lg:py-1.5">

            <div
              className={`rounded-full ${
                isPrivate
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              } w-1 h-1 lg:w-1.5 lg:h-1.5`} 
            ></div>
            
            <span className="font-medium text-zinc-200 uppercase tracking-widest leading-none
              text-[8px] lg:text-[10px]">
              {isPrivate ? "Private" : "Public"}
            </span>
          </div>
        </div>

        {/* Thumbnail Image */}
        <div className="w-full h-full overflow-hidden relative shadow-inner
          rounded-xl lg:rounded-2xl">
          <img
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            src="/map.png"
            alt={data.projectName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* --- Bottom Info Section --- */}
      <div className="flex items-center justify-between
        px-3 pb-3 pt-1 lg:px-5 lg:pb-4 lg:pt-1">
        
        {/* Title & Date */}
        <div className="flex flex-col min-w-0 pr-2">
          <h1 className="font-semibold text-zinc-200 tracking-wide truncate
             text-[10px] lg:text-xs">
             {projname || "Untitled"}
          </h1>
          <p className="text-zinc-500 font-medium mt-0.5
            text-[9px] lg:text-[10px]">
            {getDate(data?.updatedAt)}
          </p>
        </div>

        {/* Menu Trigger Button */}
        {isOwner && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenu(!menu)}
              className={`flex items-center justify-center rounded-full transition-all duration-200 
                w-6 h-6 lg:w-8 lg:h-8
                ${menu ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 lg:w-5 lg:h-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {menu && (
                <motion.div
                  ref={menuref}
                  variants={menuVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-0 top-full mt-2 bg-[#27272a] border border-zinc-700 rounded-xl shadow-2xl z-[200] overflow-hidden flex flex-col py-1
                    w-36 lg:w-44"
                >
                  {/* Share Item */}
                  <div
                    onClick={() => {
                      setAllFalse();
                      setShareBt(true);
                      setMenu(false);
                    }}
                    className="flex items-center gap-3 text-zinc-300 hover:bg-zinc-700/50 hover:text-white cursor-pointer transition-colors
                      px-3 py-2 lg:px-4 lg:py-2.5 text-[10px] lg:text-xs"
                  >
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    <span>Share Project</span>
                  </div>

                  {/* Rename Item */}
                  <div
                    onClick={() => {
                      setAllFalse();
                      setEditBt(true);
                      setMenu(false);
                    }}
                    className="flex items-center gap-3 text-zinc-300 hover:bg-zinc-700/50 hover:text-white cursor-pointer transition-colors
                      px-3 py-2 lg:px-4 lg:py-2.5 text-[10px] lg:text-xs"
                  >
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    <span>Rename</span>
                  </div>

                  {/* Private Item */}
                  {!isPrivate && (
                    <div
                      onClick={(e) => {
                          handlePrivate(e);
                          setMenu(false);
                      }}
                      className="flex items-center gap-3 text-zinc-300 hover:bg-zinc-700/50 hover:text-white cursor-pointer transition-colors
                        px-3 py-2 lg:px-4 lg:py-2.5 text-[10px] lg:text-xs"
                    >
                      <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span>Make Private</span>
                    </div>
                  )}

                  <div className="h-[1px] bg-zinc-700 my-1 mx-2" />

                  {/* Delete Item */}
                  <div
                    onClick={() => {
                      setAllFalse();
                      setDeleteBt(true);
                      setMenu(false);
                    }}
                    className="flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer transition-colors
                      px-3 py-2 lg:px-4 lg:py-2.5 text-[10px] lg:text-xs"
                  >
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    <span>Delete</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* --- Action Popovers --- */}
      <AnimatePresence>
        {/* Share Popover */}
        {shareBt && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-2 bottom-16 bg-[#27272a] border border-zinc-700 rounded-xl shadow-2xl z-40 text-zinc-200 cursor-default
              p-3 lg:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-white uppercase tracking-wider
                text-[10px] lg:text-xs">Share Project</h3>
              <button onClick={() => setShareBt(false)} className="text-zinc-400 hover:text-white">&times;</button>
            </div>
            
            <div className="bg-black/30 rounded-lg p-2 max-h-32 overflow-y-auto mb-3 border border-white/5
               text-[10px] lg:text-xs">
                {data.accessorList?.length > 0 ? (
                  <ul className="space-y-1">
                    {data.accessorList.map((email) => <li key={email} className="truncate text-zinc-400">{email}</li>)}
                  </ul>
                ) : (
                  <p className="text-zinc-500 italic">No accessors yet.</p>
                )}
            </div>
            <button
              onClick={handleCopyShareLink}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors
                 py-1.5 lg:py-2 text-[10px] lg:text-xs"
            >
              Copy Link
            </button>
          </motion.div>
        )}

        {/* Rename Popover */}
        {editBt && (
           <motion.div 
           initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
           className="absolute inset-x-2 bottom-16 bg-[#27272a] border border-zinc-700 rounded-xl shadow-2xl z-40 text-zinc-200 cursor-default
             p-3 lg:p-4"
           onClick={(e) => e.stopPropagation()}
         >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-white uppercase tracking-wider
                text-[10px] lg:text-xs">Rename Project</h3>
              <button onClick={() => setEditBt(false)} className="text-zinc-400 hover:text-white">&times;</button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="bg-black/30 border border-zinc-600 text-white rounded-lg w-full focus:outline-none focus:border-indigo-500 transition-colors
                   text-[10px] lg:text-xs p-1.5 lg:p-2"
                value={projname}
                onChange={(e) => setProjname(e.target.value)}
                autoFocus
              />
              <button onClick={handleRename} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium
                 px-2 lg:px-3 text-[10px] lg:text-xs">Save</button>
            </div>
          </motion.div>
        )}

        {/* Delete Confirmation */}
        {deleteBt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center cursor-default
              rounded-2xl lg:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-red-500/20 rounded-full flex items-center justify-center mb-3
              w-8 h-8 lg:w-10 lg:h-10">
              <svg className="text-red-200 w-4 h-4 lg:w-5 lg:h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-white font-bold mb-1
              text-xs lg:text-sm">Delete Project?</h3>
            <p className="text-red-200 mb-4
              text-[9px] lg:text-[10px]">This action cannot be undone.</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteBt(false); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors
                  py-1.5 lg:py-2 text-[10px] lg:text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors
                  py-1.5 lg:py-2 text-[10px] lg:text-xs"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProjectCard;