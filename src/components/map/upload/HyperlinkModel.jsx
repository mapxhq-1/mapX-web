import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { closeHyperlink, setHyperlinkMode } from "../../../store/mapSlice";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createHyperlink, updateHyperlink, deleteHyperlink } from "../../api/hyperlink";
import { useQueryClient } from '@tanstack/react-query'
import { getEraForYear, getAbsoluteYear } from "../../../utils/era";


const HyperlinkModel = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.map.hyperlinkOpen);
  const currentHyperlink = useSelector((state) => state.map.currentHyperlink);
  const hyperlinkMode = useSelector((state) => state.map.hyperlinkMode);
  const { id: projectId } = useParams();
  const email = useSelector((state) => state.project.ownerEmail);
  const year = useSelector((state) => state.map.year);
  const queryClient = useQueryClient();
  const modalRef = useRef(null);

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  
  // --- ROBUST LAYOUT DETECTION ---
  const [layoutMode, setLayoutMode] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      if (w < 768 && h > w) {
        setLayoutMode('mobile-portrait'); 
      } else if (h < 600) {
        setLayoutMode('mobile-landscape'); 
      } else {
        setLayoutMode('desktop'); 
      }
    };

    handleResize(); 
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- DYNAMIC STYLES ---
  const isMobile = layoutMode !== 'desktop';
  
  // Modal Container: h-auto allows it to shrink to fit content
  const modalClass = layoutMode === 'mobile-landscape'
    ? "w-[400px] max-w-[95vw] max-h-[90vh] p-3" 
    : isMobile 
      ? "w-[90vw] max-h-[85vh] p-4" 
      : "w-[500px] max-h-[80vh] p-5";

  // Typography & Spacing
  const titleSize = isMobile ? "text-base mb-2" : "text-xl mb-4";
  const inputClass = isMobile ? "mb-2 px-2 py-1 text-xs" : "mb-3 px-3 py-2 text-base";
  const btnClass = isMobile ? "px-3 py-1 text-xs" : "px-4 py-2 text-base";
  // Reduced preview height slightly for landscape to save space
  const previewHeight = layoutMode === 'mobile-landscape' ? "h-[180px]" : "h-[200px]";

  const isUpdate = currentHyperlink?.id && currentHyperlink.id !== "new";

  useEffect(() => {
    if (isUpdate) {
      setTitle(currentHyperlink?.title || "");
      setLink(currentHyperlink?.hyperlinkUrl || "");
    } else {
      setTitle("");
      setLink("");
    }
  }, [isOpen, currentHyperlink?.id, isUpdate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        try { window.mapxHyperlinksRemoveDraftMarkers && window.mapxHyperlinksRemoveDraftMarkers(); } catch (_) {};
        dispatch(closeHyperlink());
      }
    };

    if (isOpen) document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, dispatch]);


  // Save or update hyperlink
  const handleSave = async () => {
    if (!link.trim()) {
      toast.error("Please enter a link");
      return;
    }

    try {
      const selectedEra = getEraForYear(year);
      const apiYear = getAbsoluteYear(year);
      if (isUpdate) {
        try {
          await updateHyperlink(
            currentHyperlink.id,
            email,
            link,
            apiYear,
            selectedEra,
            title,
            currentHyperlink?.coordinates?.lat,
            currentHyperlink?.coordinates?.lng
          );
          toast.success("Hyperlink updated successfully");
          queryClient.invalidateQueries(["hyperlink"]);
        } catch (err) {
          // Frontend-only fallback for environments where PATCH is blocked by CORS
          const status = err?.response?.status;
          const msg = err?.response?.data;
          const isCorsBlocked = status === 403 || (typeof msg === 'string' && msg.includes('CORS'));
          if (isCorsBlocked) {
            try {
              await createHyperlink(
                projectId,
                email,
                title,
                apiYear,
                selectedEra,
                currentHyperlink.coordinates.lat,
                currentHyperlink.coordinates.lng,
                link
              );
              await deleteHyperlink(currentHyperlink.id, email);
              toast.success("Hyperlink updated successfully");
              queryClient.invalidateQueries(["hyperlink"]);
            } catch (fallbackErr) {
              console.log(fallbackErr);
              throw fallbackErr;
            }
          } else {
            throw err;
          }
        }
      } else {
        if (!title.trim()) {
          toast.error("Please enter a title");
          return;
        }
        await createHyperlink(
          projectId,
          email,
          title,
          apiYear,
          selectedEra,
          currentHyperlink.coordinates.lat,
          currentHyperlink.coordinates.lng,
          link
        );
        queryClient.invalidateQueries(["hyperlink"]);
        toast.success("Hyperlink saved successfully");
      }

      setTimeout(() => {
        if (window.mapxHyperlinksLoadByContext) {
          window.mapxHyperlinksLoadByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        } else if (window.mapxHyperlinksloadHyperlinksByContext) {
          window.mapxHyperlinksloadHyperlinksByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        }
      }, 500);

      dispatch(closeHyperlink());
      setTitle("");
      setLink("");
    } catch (e) {
      console.log(e);
      toast.error("Failed to save hyperlink");
    }
  };

  // Delete hyperlink
  const handleDelete = async () => {
    try {
      await deleteHyperlink(currentHyperlink.id, email);
      toast.success("Hyperlink deleted");
      setShowConfirm(false);
      queryClient.invalidateQueries(["hyperlink"]);
      setTimeout(() => {
        if (window.mapxHyperlinksLoadByContext) {
          window.mapxHyperlinksLoadByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        } else if (window.mapxHyperlinksloadHyperlinksByContext) {
          window.mapxHyperlinksloadHyperlinksByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        }
      }, 500);
      dispatch(closeHyperlink());
    } catch (e) {
      console.log(e);
      setShowConfirm(false);
      toast.error("Failed to delete hyperlink ");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent bg-opacity-50">
      {/* Main Glass Card */}
      <div ref={modalRef} className={`relative rounded-2xl shadow-xl flex flex-col items-center 
        bg-black/10 border border-white/30 backdrop-blur-md 
        shadow-[inset_0_1px_0px_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.3)] overflow-y-auto custom-scrollbar
        h-auto ${modalClass}`}>

        {/* Close button */}
        <button
          onClick={() => { try { window.mapxHyperlinksRemoveDraftMarkers && window.mapxHyperlinksRemoveDraftMarkers(); } catch (_) {}; dispatch(closeHyperlink()); }}
          className={`absolute z-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600
            ${isMobile ? "top-2 right-2 w-6 h-6 text-xs" : "top-3 right-3 w-8 h-8 text-base"}
          `}
        >
          ×
        </button>

        {hyperlinkMode === 'view' ? (
          <>
            {/* PREVIEW MODE */}
            <h2 className={`font-semibold text-black text-center shrink-0 ${titleSize}`}>
              {currentHyperlink?.title || "Hyperlink Preview"}
            </h2>
            
            <div className="w-full flex flex-col items-center">
              {currentHyperlink?.hyperlinkUrl && (
                // Removed min-h-[250px] to fix empty space
                <div className={`bg-white/10 rounded-lg w-full ${isMobile ? "p-2" : "p-4"}`}>
                  
                  {/* Small URL display at top */}
                  <div className="mb-2 text-center w-full">
                    <a 
                      href={currentHyperlink.hyperlinkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`text-blue-600 underline break-all hover:text-blue-500 block ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {currentHyperlink.hyperlinkUrl}
                    </a>
                  </div>
                  
                  {/* Preview content */}
                  <div className={`w-full flex items-center justify-center ${previewHeight}`}>
                    {currentHyperlink.hyperlinkUrl.includes('youtube.com') || currentHyperlink.hyperlinkUrl.includes('youtu.be') ? (
                      // YouTube embed
                      <iframe
                        src={currentHyperlink.hyperlinkUrl.includes('embed') ? currentHyperlink.hyperlinkUrl : 
                              currentHyperlink.hyperlinkUrl.replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/, 'https://www.youtube.com/embed/$1')}
                        className="w-full h-full border-0 rounded"
                        title="YouTube Video Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      // Regular iframe for other websites
                      <iframe
                        src={currentHyperlink.hyperlinkUrl}
                        className="w-full h-full border-0 rounded"
                        title="Hyperlink Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Changed mt-auto to mt-4 to sit directly below content */}
            <div className="flex gap-2 mt-4 shrink-0">
              <button
                onClick={() => dispatch(setHyperlinkMode('edit'))}
                className={`rounded-lg bg-blue-500/80 hover:bg-blue-600 text-white shadow-md ${btnClass}`}
              >
                Edit
              </button>
              <button
                onClick={() => dispatch(closeHyperlink())}
                className={`rounded-lg bg-gray-500/80 hover:bg-gray-600 text-white shadow-md ${btnClass}`}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {/* EDIT MODE */}
            <h2 className={`font-semibold text-black text-center shrink-0 ${titleSize}`}>
              {isUpdate ? "Update Hyperlink" : "Add Hyperlink"}
            </h2>

            <div className="w-full flex flex-col items-center">
                {isUpdate ? (
                <div className={`w-full border border-white/30 rounded bg-white/20 text-gray-700 flex items-center ${inputClass}`}>
                    {title || "Untitled"}
                </div>
                ) : (
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter title"
                    className={`w-full border border-white/40 bg-white/20 rounded text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 ${inputClass}`}
                />
                )}

                <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Enter hyperlink (https://...)"
                className={`w-full border border-white/40 bg-white/20 rounded text-black placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 ${inputClass} mb-4`}
                />
            </div>

            {/* Changed mt-auto to mt-2 for compact layout */}
            <div className="flex gap-2 mt-2 shrink-0">
              <button
                onClick={handleSave}
                className={`rounded-lg bg-green-500/80 hover:bg-green-600 text-white shadow-md ${btnClass}`}
              >
                {isUpdate ? "Update" : "Save"}
              </button>

              {isUpdate && (
                <button
                  onClick={() => setShowConfirm(true)}
                  className={`rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-md ${btnClass}`}
                >
                  Delete
                </button>
              )}
              
              {isUpdate && (
                <button
                  onClick={() => dispatch(setHyperlinkMode('view'))}
                  className={`rounded-lg bg-gray-500/80 hover:bg-gray-600 text-white shadow-md ${btnClass}`}
                >
                  Preview
                </button>
              )}
            </div>
          </>
        )}
        
        {/* Delete Confirmation Modal (scoped to this card only) */}
        {showConfirm && (
          <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-sm rounded-2xl">
            <div className={`bg-white/90 border border-white/50 backdrop-blur-sm shadow-xl text-center rounded-2xl
               ${isMobile ? "w-[85%] p-3" : "w-[320px] p-5"}
            `}>
              <h2 className={`font-semibold text-black ${isMobile ? "text-sm mb-2" : "text-lg mb-3"}`}>Delete this hyperlink?</h2>
              <p className={`text-gray-700 ${isMobile ? "text-xs mb-3" : "text-base mb-5"}`}>This action cannot be undone.</p>
              
              <div className="flex justify-around">
                <button
                  onClick={() => setShowConfirm(false)}
                  className={`rounded-lg bg-gray-400/40 hover:bg-gray-300/50 text-white ${btnClass}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className={`rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-md ${btnClass}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HyperlinkModel;