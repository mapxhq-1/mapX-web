import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { closeHyperlink } from "../../../store/mapSlice";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createHyperlink, updateHyperlink, deleteHyperlink } from "../../api/hyperlink";

const HyperlinkModel = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.map.hyperlinkOpen);
  const currentHyperlink = useSelector((state) => state.map.currentHyperlink);
  const { id: projectId } = useParams();
  const email = useSelector((state) => state.project.ownerEmail);
  const year = useSelector((state) => state.map.year);

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

  // Save or update hyperlink
  const handleSave = async () => {
    if (!link.trim()) {
      toast.error("Please enter a link");
      return;
    }

    try {
      if (isUpdate) {
        await updateHyperlink(currentHyperlink.id, email, link, year, "CE");
        toast.success("Hyperlink updated successfully");
      } else {
        if (!title.trim()) {
          toast.error("Please enter a title");
          return;
        }
        await createHyperlink(
          projectId,
          email,
          title,
          year,
          "CE",
          currentHyperlink.coordinates.lat,
          currentHyperlink.coordinates.lng,
          link
        );
        toast.success("Hyperlink saved successfully");
      }

      setTimeout(() => {
        window.mapxHyperlinksloadHyperlinksByContext({
          projectIdParam: projectId,
          year,
          era: "CE",
        });
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
      setTimeout(() => {
        window.mapxHyperlinksloadHyperlinksByContext({
          projectIdParam: projectId,
          year,
          era: "CE",
        });
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Main Glass Card */}
      <div className="relative w-[400px] min-h-[280px] rounded-2xl shadow-xl flex flex-col items-center p-5
        bg-white/10 border border-white/30 backdrop-blur-md 
        shadow-[inset_0_1px_0px_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.3)]">

        {/* Close button */}
        <button
          onClick={() => dispatch(closeHyperlink())}
          className="absolute top-3 right-3 z-10 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">
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
            className="w-[300px] mb-3 px-3 py-2 border border-white/40 bg-white/20 rounded text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        )}

        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Enter hyperlink (https://...)"
          className="w-[300px] mb-5 px-3 py-2 border border-white/40 bg-white/20 rounded text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[10000]">
          <div className="w-[320px] p-5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30
            shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_4px_20px_rgba(0,0,0,0.4)] text-center">

            <h2 className="text-lg font-semibold text-white mb-3">
              Delete this hyperlink?
            </h2>
            <p className="text-gray-300 mb-5">This action cannot be undone.</p>

            <div className="flex justify-around">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-400/40 hover:bg-gray-300/50 text-white"
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
  );
};

export default HyperlinkModel;
