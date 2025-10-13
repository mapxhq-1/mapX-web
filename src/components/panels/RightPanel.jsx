import React, { useEffect, useRef, useState } from "react";
import save from "../../assets/icons/save.png";
import axios from "axios";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import RightPanelData from "./RightPanelData";

function Open({ setIsOpen, project }) {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT  +  "/project-management-service";
  const [saveOpen, setSaveOpen] = useState(false);
  const saveRef = useRef(null);
  const [projName, setProjName] = useState(project.projectName);
  const [originalProjName, setOriginalProjName] = useState(project.projectName);
  const { ownerEmail } = useSelector((state) => state.project);
  const { id } = useParams();
  const isOwner = project.ownerEmail == ownerEmail;
  
   // --- NEW: Function to handle the share action ---
  const handleShare = (e) => {
    e.stopPropagation(); // Prevent any other click events
    try {
      // Construct the unique shareable link using the project ID
      const shareLink = `${window.location.origin}/clone/${id}`;
      
      // Copy the link to the user's clipboard
      navigator.clipboard.writeText(shareLink);
      
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Could not copy the link.");
      console.error("Share error:", err);
    }
  };



  useEffect(()=>{
    const handleSave = (event)=>{
      if(saveRef.current && !saveRef.current.contains(event.target)){
        setProjName(originalProjName);
        setSaveOpen(false);
      }
    }
    document.addEventListener("mousedown", handleSave);
    return ()=> document.removeEventListener("mousedown", handleSave);
  },[originalProjName, setProjName ]);

  async function handleNameChange() {
    try {
      const token = localStorage.getItem('bearerToken');
      const res = await axios.patch(
        BASE_URL+"/update-project",
        {
          ownerEmail,
          projectName: projName,
          projectId: id,
        },
        {
          headers: {
            client_name: "mapx","Authorization": `Bearer ${token}`

          },
        }
      );
      toast.success("Changed Project name!!");
      setOriginalProjName(projName);
    } catch (err) {
      toast.error(err.response.data.message);
      setProjName(project.projectName);
    }
    setSaveOpen(false);
  }
  return (
    <div className="relative">
      {saveOpen && (
        <div
          ref={saveRef}
          className="h-[150px] w-[650px] absolute top-[25%] right-[160%] rounded-3xl flex flex-col bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] "
        >
          <div className="flex  items-center w-[95%] rounded-md bg-[#4D4354] text-white px-3 py-1 m-4">
            <p className="pr-2">Project Name : </p>
            <input
              type="text"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              className=" p-2 flex-1"
            />
          </div>
          <button
            onClick={handleNameChange}
            className="flex h-[50px] w-[150px] cursor-pointer items-center justify-center self-center rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/10 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none hover:bg-white/40 transition-all duration-300  antialiased"
          >
            save
            <img className="h-[25px]" src={save} alt="" />
          </button>
        </div>
      )}
      <div className=" w-[300px] h-dvh bg-[#2A2929] text-white flex flex-col justify-between">
        <div className="Top-part pt-[20px]">
          <div className="flex justify-between items-center  px-5">
            <div
              className="cursor-pointer pt-1 pr-5"
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={30}
                height={30}
                viewBox="0 0 24 24"
              >
                <g fill="none" stroke="currentColor" strokeWidth={0.5}>
                  <rect
                    width={20}
                    height={18}
                    x={2}
                    y={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    rx={3}
                  ></rect>
                  <path d="M15 3v18"></path>
                </g>
              </svg>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="bg-zinc-600 rounded-full"
              width="20"
              height="20"
              viewBox="0 0 24 24"
            >
              <g fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="8"
                  fill="#000"
                  fillOpacity="0.25"
                  transform="matrix(-1 0 0 1 20 4)"
                />
                <path
                  stroke="#000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 10.5h.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h.5m-1-7h.01"
                  strokeWidth="1.5"
                />
              </g>
            </svg>
          </div>
          {isOwner && (
            <div className="flex p-2">
              <div
                onClick={() => {
                  setSaveOpen(true);
                }}
                className="flex h-[50px] w-1/2 p-4 mx-1 mt-4 items-center justify-center gap-6 rounded-lg cursor-pointer 
          bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
          hover:bg-white/30 transition-all duration-300 
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/10 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased"
              >
                <p>Save</p>
                <div className="rounded-lg p-0.5">
                  <img src={save} alt="" />
                </div>
              </div>
              <div 
               onClick={handleShare} // Add the handleShare function here
               className="flex h-[50px] w-1/2 mx-1 p-4 mt-4 items-center justify-center gap-6 rounded-lg cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased"
               >
                <p>Share</p>
                <div className="bg-[#9EFAA5] rounded-lg p-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                  >
                    <path
                      fill="#000"
                      d="M12.25 3a.75.75 0 1 1 0 1.5h-5A2.75 2.75 0 0 0 4.5 7.25v13.5a2.75 2.75 0 0 0 2.75 2.75h13.5a2.75 2.75 0 0 0 2.75-2.75v-5a.75.75 0 0 1 1.5 0v5A4.25 4.25 0 0 1 20.75 25H7.25A4.25 4.25 0 0 1 3 20.75V7.25A4.25 4.25 0 0 1 7.25 3zm5.179-.928a.75.75 0 0 1 .796.098l8.25 6.75a.75.75 0 0 1 .039 1.127l-8.25 7.75A.75.75 0 0 1 17 17.25v-3.74c-1.166.036-2.463.189-3.854.802c-1.584.698-3.35 2.021-5.16 4.577l-.362.527A.75.75 0 0 1 6.25 19c0-4.406 1.34-7.56 3.51-9.608C11.738 7.527 14.325 6.656 17 6.52V2.75a.75.75 0 0 1 .429-.679m1.07 5.178a.75.75 0 0 1-.75.75c-2.66 0-5.145.772-6.959 2.483c-1.413 1.334-2.474 3.292-2.87 6.046c1.56-1.823 3.12-2.93 4.621-3.59C14.532 12.06 16.349 12 17.75 12a.75.75 0 0 1 .75.75v2.766l6.363-5.978L18.5 4.332z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
          <div className=" rounded-lg p-2 mt-2 bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)]">
            <p className="mb-2 ">
              {originalProjName}
            </p>
          <RightPanelData/>
          </div>
        </div>
        <div className="Bottom-part ">
          <div>
            <div className="flex h-[60px] p-3 mb-1 items-center justify-center gap-6 rounded-lg cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Closed({ setIsOpen }) {
  return (
    <div className=" z-50 h-screen  w-[60px] flex justify-center pt-[25px] bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0  before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
      <div className=" cursor-pointer" onClick={() => setIsOpen(true)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 20 20"
        >
          <path
            fill="white"
            d="M12.5 3v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3Zm4.25 0H14v14h2.75A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3"
          />
        </svg>
      </div>
    </div>
  );
}
const RightPanel = ({ project }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {isOpen && <Open setIsOpen={setIsOpen} project={project} />}
      {!isOpen && <Closed setIsOpen={setIsOpen} />}
    </>
  );
};

export default RightPanel;