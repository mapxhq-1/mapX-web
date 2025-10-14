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
          window.mapxHyperlinksLoadByContext({ projectIdParam: projectId, year: Math.abs(year), era: (year < 0 ? 'BCE' : 'CE') });
        } else if (window.mapxHyperlinksloadHyperlinksByContext) {
          window.mapxHyperlinksloadHyperlinksByContext({ projectIdParam: projectId, year: Math.abs(year), era: (year < 0 ? 'BCE' : 'CE') });
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
          window.mapxHyperlinksLoadByContext({ projectIdParam: projectId, year: Math.abs(year), era: (year < 0 ? 'BCE' : 'CE') });
        } else if (window.mapxHyperlinksloadHyperlinksByContext) {
          window.mapxHyperlinksloadHyperlinksByContext({ projectIdParam: projectId, year: Math.abs(year), era: (year < 0 ? 'BCE' : 'CE') });
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
      <div ref={modalRef} className="relative w-[500px] min-h-[400px] rounded-2xl shadow-xl flex flex-col items-center p-5
        bg-black/10 border border-white/30 backdrop-blur-md 
        shadow-[inset_0_1px_0px_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.3)]">

        {/* Close button */}
        <button
          onClick={() => { try { window.mapxHyperlinksRemoveDraftMarkers && window.mapxHyperlinksRemoveDraftMarkers(); } catch (_) {}; dispatch(closeHyperlink()); }}
          className="absolute top-3 right-3 z-10 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
        >
          ×
        </button>

        {hyperlinkMode === 'view' ? (
          <>
            {/* PREVIEW MODE */}
            <h2 className="text-xl font-semibold text-black mb-4">
              {currentHyperlink?.title || "Hyperlink Preview"}
            </h2>
            
            <div className="w-full max-w-[450px] mb-4">
              {currentHyperlink?.hyperlinkUrl && (
                <div className="bg-white/10 rounded-lg p-4 min-h-[250px]">
                  {/* Small URL display at top */}
                  <div className="mb-3">
                    <a 
                      href={currentHyperlink.hyperlinkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 underline text-sm break-all hover:text-blue-300 block"
                    >
                      {currentHyperlink.hyperlinkUrl}
                    </a>
                  </div>
                  
                  {/* Preview content */}
                  <div className="w-full h-[200px] flex items-center justify-center">
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

            <div className="flex gap-3">
              <button
                onClick={() => dispatch(setHyperlinkMode('edit'))}
                className="px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-600 text-white shadow-md"
              >
                Edit
              </button>
              <button
                onClick={() => dispatch(closeHyperlink())}
                className="px-4 py-2 rounded-lg bg-gray-500/80 hover:bg-gray-600 text-white shadow-md"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {/* EDIT MODE */}
            <h2 className="text-xl font-semibold text-black mb-4">
              {isUpdate ? "Update Hyperlink" : "Add Hyperlink"}
            </h2>

            {isUpdate ? (
              <div className="w-[300px] mb-3 px-3 py-2 border border-white/30 rounded bg-white/20 text-gray-200">
                {title || "Untitled"}
              </div>
            ) : (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title"
                className="w-[300px] mb-3 px-3 py-2 border border-white/40 bg-white/20 rounded text-black placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            )}

            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enter hyperlink (https://...)"
              className="w-[300px] mb-5 px-3 py-2 border border-white/40 bg-white/20 rounded text-black placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-green-500/80 hover:bg-green-600 text-white shadow-md"
              >
                {isUpdate ? "Update" : "Save"}
              </button>

              {isUpdate && (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-md"
                >
                  Delete
                </button>
              )}
              
              {isUpdate && (
                <button
                  onClick={() => dispatch(setHyperlinkMode('view'))}
                  className="px-4 py-2 rounded-lg bg-white-500/80 hover:bg-gray-600 text-white shadow-md"
                >
                  Preview
                </button>
              )}
            </div>
          </>
        )}
        {/* Delete Confirmation Modal (scoped to this card only) */}
        {showConfirm && (
          <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="w-[320px] p-5 rounded-2xl bg-white border border-gray-200 bg-white/90 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] transition-all duration-300
              text-center">
              <h2 className="text-lg font-semibold text-black mb-3">Delete this hyperlink?</h2>
              <p className="text-gray-700 mb-5">This action cannot be undone.</p>
              <div className="flex justify-around">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-400/40 hover:bg-green-300/50 text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-md"
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
