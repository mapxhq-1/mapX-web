import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { closeImages } from "../../../store/mapSlice";
import { uploadNewImage, updateImage, deleteImage } from "../../api/image";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useQueryClient } from '@tanstack/react-query'
import { getEraForYear, getAbsoluteYear } from "../../../utils/era";
import cancel_icon from '../../../assets/icons/cancel_icon.png';

const ImageModel = () => {
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const fileInputRef = useRef();
  const isOpen = useSelector((state) => state.map.imageOpen);
  const currentImage = useSelector((state) => state.map.currentImage);

  const { id: projectId } = useParams();
  const year = useSelector((state) => state.map.year);
  const email = useSelector((state) => state.project.ownerEmail);

  const isUpdate = currentImage?.id && currentImage.id !== "new";

  // --- COMPACT MODE DETECTION ---
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
  const modalSize = isCompact ? "w-[300px] h-[320px] p-3" : "w-[400px] h-[500px] p-5";
  const previewSize = isCompact ? "w-[220px] h-[130px] mb-2" : "w-[300px] h-[250px] mb-4";
  const inputSize = isCompact ? "w-[220px] mb-2 py-1 px-2 text-xs" : "w-[300px] mb-3 px-3 py-2";
  const buttonPadding = isCompact ? "px-3 py-1 text-xs" : "px-4 py-2";
  const titleSize = isCompact ? "text-base mb-2" : "text-xl mb-4";

  useEffect(() => {
    if (isUpdate && currentImage) {
      setPreview(currentImage.imageUrl || null);
      setCaption(currentImage.caption || "");
    } else {
      setCaption("");
      setPreview(null);
    }
    setSelectedFile(null);
  }, [isOpen, currentImage?.id, isUpdate, currentImage?.imageUrl, currentImage?.caption]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadOrUpdate = async () => {
    if (!selectedFile && !isUpdate) { // Allow update without new file (just caption)
      toast.error("Please select a new image file");
      return;
    }

    try {
      const selectedEra = getEraForYear(year);
      const apiYear = getAbsoluteYear(year);
      if (isUpdate) {
        await updateImage(
          currentImage.id,
          email,
          selectedFile,
          caption,
          apiYear,
          selectedEra
        );
        toast.success("Image updated successfully");
        queryClient.invalidateQueries(["images"]);
      } else {
        await uploadNewImage(
          projectId,
          email,
          Number(currentImage.coordinates.lat),
          Number(currentImage.coordinates.lng),
          selectedFile,
          caption,
          apiYear,
          selectedEra
        );
        toast.success("Image uploaded successfully");
        queryClient.invalidateQueries(["images"]);
      }

      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      dispatch(closeImages());

      setTimeout(() => {
        if (window.mapxImagesLoadByContext) {
          window.mapxImagesLoadByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        } else if (window.mapxImagesloadImagesByContext) {
          window.mapxImagesloadImagesByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        }
      }, 500);
    } catch (e) {
      toast.error("Action failed: " + (e.response?.data?.message || e.message));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteImage(currentImage.id, email);
      toast.success("Image deleted successfully");
      setShowConfirm(false);
      dispatch(closeImages());
      queryClient.invalidateQueries(["images"]);
      setTimeout(() => {
        if (window.mapxImagesLoadByContext) {
          window.mapxImagesLoadByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        } else if (window.mapxImagesloadImagesByContext) {
          window.mapxImagesloadImagesByContext({ projectIdParam: projectId, year: getAbsoluteYear(year), era: getEraForYear(year) });
        }
      }, 500);
    } catch (e) {
      toast.error("Failed to delete image");
      setShowConfirm(false);
      console.log(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent bg-opacity-50" onClick={(e) => {
      if (e.target === e.currentTarget) dispatch(closeImages());
    }}>
      {/* Main Glass Modal */}
      <div
        className={`relative ${modalSize} rounded-2xl shadow-xl flex flex-col items-center
        bg-black/10 border border-white/30 backdrop-blur-md 
        shadow-[inset_0_1px_0px_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.3)]`}
      >
        {/* Cancel Button */}
        <button
          onClick={() => { try { window.mapxImagesRemoveDraftMarkers && window.mapxImagesRemoveDraftMarkers(); } catch (_) {}; dispatch(closeImages()); }}
          className={`absolute top-3 right-3 bg-gray-500/80 hover:bg-gray-600 text-white rounded-full flex items-center justify-center ${isCompact ? "w-6 h-6" : "w-8 h-8"}`}
        >
          <img src={cancel_icon} alt="Cancel" width={isCompact ? 12 : 16} height={isCompact ? 12 : 16} />
        </button>

        <h2 className={`font-semibold text-black ${titleSize}`}>
          {isUpdate ? "Update Image" : "Upload Image"}
        </h2>

        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className={`${previewSize} object-contain border border-white/40 rounded-lg bg-black/20`}
          />
        ) : (
          <div className={`${previewSize} flex items-center justify-center border border-dashed border-white/40 text-black rounded-lg text-xs`}>
            No image selected
          </div>
        )}

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Enter caption"
          className={`${inputSize} border border-white/40 rounded bg-white/20 text-black placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300`}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current.click()}
          className={`${buttonPadding} mb-2 rounded-lg bg-blue-500/80 hover:bg-blue-600 text-white shadow-md`}
        >
          Choose File
        </button>

        <div className="flex gap-3 mt-1">
          <button
            onClick={handleUploadOrUpdate}
            className={`${buttonPadding} rounded-lg bg-green-500/80 hover:bg-green-600 text-white shadow-md`}
          >
            {isUpdate ? "Update" : "Upload"}
          </button>

          {isUpdate && (
            <button
              onClick={() => setShowConfirm(true)}
              className={`${buttonPadding} rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-md`}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Glass Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-transparent bg-opacity-50 z-[10000]">
          <div
            className={`w-[320px] rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 
            shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_4px_20px_rgba(0,0,0,0.4)] text-center ${isCompact ? "p-3" : "p-5"}`}
          >
            <h2 className={`font-semibold text-black ${isCompact ? "text-base mb-2" : "text-lg mb-3"}`}>
              Delete this image?
            </h2>
            <p className={`text-black ${isCompact ? "text-xs mb-3" : "mb-5"}`}>This action cannot be undone.</p>

            <div className="flex justify-around">
              <button
                onClick={() => setShowConfirm(false)}
                className={`${buttonPadding} rounded-lg bg-gray-400/40 hover:bg-gray-300/50 text-white`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={`${buttonPadding} rounded-lg bg-red-500/80 hover:bg-red-600 text-white shadow-md`}
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

export default ImageModel;