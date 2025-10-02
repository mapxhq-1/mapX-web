import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { closeImages } from "../../../store/mapSlice";
import { uploadNewImage, updateImage } from "../../api/image";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

const ImageModel = () => {
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef();
  const isOpen = useSelector((state) => state.map.imageOpen);
  const currentImage = useSelector((state) => state.map.currentImage);

  const { id: projectId } = useParams();
  const year = useSelector((state) => state.map.year);
  const email = useSelector((state) => state.project.ownerEmail);

  // Determine if this is an update or new upload
  const isUpdate = currentImage?.id && currentImage.id !== "new";

  // Initialize caption from currentImage when editing
  useEffect(() => {
    if (isUpdate && currentImage?.caption) {
      setPreview(currentImage.imageUrl);
      setCaption(currentImage.caption);
    } else {
      setCaption("");
    }
    setSelectedFile(null);

  }, [isOpen, currentImage?.id, isUpdate, currentImage?.caption]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }
    try {
      await uploadNewImage(
        projectId,
        email,
        Number(currentImage.coordinates.lat),
        Number(currentImage.coordinates.lng),
        selectedFile,
        caption,
        year,
        "CE"
      );
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      dispatch(closeImages());
      toast.success("Image uploaded successfully");

      setTimeout(() => {
        window.mapxImagesloadImagesByContext({ projectIdParam: projectId, year, era: "CE" });
      }, 500);
    } catch (e) {
      toast.error("Upload failed: " + e.response?.data?.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateImage(
        currentImage.id,
        email,
        selectedFile,// Optional: only if user selected a new file
        caption,
        year,
        "CE"
      );
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      dispatch(closeImages());
      toast.success("Image updated successfully");
      console.log(window.mapxImagesloadImagesByContext)
      setTimeout(() => {
        window.mapxImagesloadImagesByContext({ projectIdParam: projectId, year, era: "CE" });
      }, 500);
    } catch (e) {
      toast.error("Update failed: " + e.response?.data?.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-40">
      <div className="relative w-[400px] h-[460px]  rounded-lg shadow-xl flex flex-col items-center p-4 bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)]">
        <button
          onClick={() => dispatch(closeImages())}
          className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
        >
          x
        </button>

        <h2 className="text-lg font-semibold mb-4">
          {isUpdate ? "Update Image" : "Upload Image"}
        </h2>

        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="w-[300px] h-[250px] object-contain border mb-4"
          />
        ) : isUpdate && currentImage?.url ? (
          <img
            src={currentImage.url}
            alt="Current"
            className="w-[300px] h-[250px] object-contain border mb-4"
          />
        ) : (
          <div className="w-[300px] h-[250px] flex items-center justify-center border border-dashed text-gray-400 mb-4">
            No image selected
          </div>
        )}

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Enter caption"
          className="w-[300px] mb-3 px-3 py-2 border rounded focus:outline-none focus:ring"
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
          className="px-4 py-2 mb-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          {isUpdate ? "Change File (Optional)" : "Choose File"}
        </button>

        <button
          onClick={isUpdate ? handleUpdate : handleUpload}
          disabled={isUpdate ? false : !selectedFile}
          className={`px-4 py-2 rounded-lg text-white ${isUpdate || selectedFile
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400 cursor-not-allowed"
            }`}
        >
          {isUpdate ? "Update" : "Upload"}
        </button>
      </div>
    </div>
  );
};

export default ImageModel;