import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { closeHyperlink } from "../../../store/mapSlice";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { createHyperlink, updateHyperlink } from "../../api/hyperlink";
// import your API functions like createHyperlink, updateHyperlink

const HyperlinkModel = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.map.hyperlinkOpen);
  const currentHyperlink = useSelector((state) => state.map.currentHyperlink);
  console.log(currentHyperlink);
  const { id: projectId } = useParams();
  const email = useSelector((state) => state.project.ownerEmail);
  const year = useSelector((state) => state.map.year);

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");

  const isUpdate = currentHyperlink?.id && currentHyperlink.id !== "new";

  useEffect(() => {
    console.log(currentHyperlink)
    if (isUpdate) {
      setTitle(currentHyperlink?.title || "");
      setLink(currentHyperlink?.hyperlinkUrl || "");
    } else {
      setTitle("");
      setLink("");
    }
  }, [isOpen, currentHyperlink?.id, isUpdate]);

  const handleSave = async () => {
    if (!link.trim()) {
      toast.error("Please enter a link");
      return;
    }

    try {

      if (isUpdate) {
        // 🔹 Replace with your updateHyperlink API
        await updateHyperlink(currentHyperlink.id, email, link, year, "CE")
        toast.success("Hyperlink updated successfully");
        setTimeout(() => {
          window.mapxHyperlinksloadHyperlinksByContext({ projectIdParam: projectId, year, era: "CE" });
        }, 500);
      } else {
        if (!title.trim()) {
          toast.error("Please enter a title");
          return;
        }
        // 🔹 Replace with your createHyperlink API
        await createHyperlink(projectId, email, title, year, "CE", currentHyperlink.coordinates.lat, currentHyperlink.coordinates.lng, link);
        toast.success("Hyperlink saved successfully");
        setTimeout(() => {
          window.mapxHyperlinksloadHyperlinksByContext({ projectIdParam: projectId, year, era: "CE" });
        }, 500);
      }
      dispatch(closeHyperlink());
      setTitle("");
      setLink("");
    } catch (e) {
      console.log(e)
      toast.error("Failed to save hyperlink");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[400px] min-h-[260px] rounded-lg shadow-xl flex flex-col items-center p-4 bg-white/80 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)]">

        <button
          onClick={() => dispatch(closeHyperlink())}
          className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
        >
          x
        </button>

        <h2 className="text-lg font-semibold mb-4">
          {isUpdate ? "Update Hyperlink" : "Add Hyperlink"}
        </h2>

        {isUpdate ? (
          <div className="w-[300px] mb-3 px-3 py-2 border rounded bg-gray-100 text-gray-600">
            {title || "Untitled"}
          </div>
        ) : (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            className="w-[300px] mb-3 px-3 py-2 border rounded focus:outline-none focus:ring"
          />
        )}

        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Enter hyperlink (https://...)"
          className="w-[300px] mb-4 px-3 py-2 border rounded focus:outline-none focus:ring"
        />

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
        >
          {isUpdate ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
};

export default HyperlinkModel;
