import {useEffect, useRef, useState} from 'react'
import { useSelector,useDispatch } from 'react-redux';
import axios from 'axios';
import {toast} from 'react-toastify'
import {myProjApiCall,sharedProjApiCall} from "../../../store/projectSlice"
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({data}) => {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT +  "/project-management-service";
  const [menu,setMenu] = useState(false);
  const [isPrivate,setIsPrivate] = useState(false);
  const menuref = useRef(null);
  const {ownerEmail} = useSelector((state)=>state.project);
  const isOwner = (data.ownerEmail==ownerEmail);
  const [deleteBt,setDeleteBt] = useState(false);
  const [publicBt,setPublicBt] = useState(false);
  const [editBt,setEditBt] = useState(false);
  const [projname,setProjname] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function getDate(timestramp){
    return timestramp.split("T")[0]
  }

  function setAllFalse(){
    setDeleteBt(false);
    setPublicBt(false);
    setEditBt(false);
  }

  async function handleRename(){
    try{
      const token = localStorage.getItem('bearerToken');
      await axios.patch(BASE_URL+'/update-project',{
        projectName : projname,
        ownerEmail : ownerEmail,
        projectId : data.id,
      }, {
        headers: {
          'client_name': 'mapx',"Authorization": `Bearer ${token}`
        }
      });
      toast.success("Renamed successfully!!");
      // After renaming, refresh the project list to show the new name
      dispatch(myProjApiCall());
    }catch(err){
      toast.error(err.response.data.message);
      setProjname(data.projectName); // Revert to original name on error
    }
    setAllFalse();
  }

  async function handlePrivate(e){
    e.stopPropagation();
    try{
      const token = localStorage.getItem('bearerToken');
      await axios.patch(BASE_URL+'/update-project',{
        accessorList : [],
        ownerEmail : ownerEmail,
        projectId : data.id,
      }, {
        headers: {
          'client_name': 'mapx',"Authorization": `Bearer ${token}`
        }
      });
      toast.success("Your project is now private!!");
      setIsPrivate(true); // Update UI immediately
    }catch(err){
      toast.error(err.response.data.message);
    }
    setAllFalse();
  }

  async function handleDelete(e){
    e.stopPropagation();
    try{
      const token = localStorage.getItem('bearerToken');
      await axios.delete(BASE_URL+'/delete-project/'+data.id,{
        params:{
          ownerEmail:ownerEmail
        },
        headers: {
          'client_name': 'mapx',"Authorization": `Bearer ${token}`
        }
      });
      toast.success("Project deleted!!");
      // Refresh both project lists after deletion
      dispatch(myProjApiCall());
      dispatch(sharedProjApiCall());
    }catch(err){
      toast.error(err.response.data.message);
    }
    setAllFalse();
  }

  // This is the function that handles the share action
  const handleShare = (e) => {
    e.stopPropagation(); // Prevent navigating to the map view
    try {
      // Construct the unique shareable link for cloning
      const shareLink = `${window.location.origin}/clone/${data.id}`;
      
      // Copy the link to the user's clipboard
      navigator.clipboard.writeText(shareLink);
      
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Could not copy link.");
      console.error("Share error:", err);
    }
    setMenu(false); // Close the menu after action
  };

  useEffect(()=>{
    setProjname(data.projectName);
    setIsPrivate(data.accessorList?.length==0);
    
    function handleOutsideClick(event){
      if(menuref.current && !menuref.current.contains(event.target)) {
        setMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return ()=>{
      document.removeEventListener("mousedown", handleOutsideClick);
    }
  },[data]); // Dependency array ensures this runs if 'data' prop changes

  return (
    <div className='max-w-[269px] hover:scale-105 duration-700 ease-in-out cursor-pointer shrink-0 relative' onClick={()=>navigate('/map/'+data.id)}>
        <div className='relative'>
          {!menu && isOwner && (
            <div onClick={(e)=>{e.stopPropagation(); setMenu(true)}} className='absolute right-1.5 top-1.5 p-1 bg-zinc-100 rounded-full hover:scale-115 duration-300 ease-in-out'>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#000" d="M7 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C7.79 3 7.86 3 8 3s.209 0 .267.008a.85.85 0 0 1 .725.725C9 3.79 9 3.86 9 4s0 .209-.008.267a.85.85 0 0 1-.725.725C8.21 5 8.14 5 8 5s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C7 4.21 7 4.14 7 4m0 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C7.79 7 7.86 7 8 7s.209 0 .267.008a.85.85 0 0 1 .725.725C9 7.79 9 7.86 9 8s0 .209-.008.267a.85.85 0 0 1-.725.725C8.21 9 8.14 9 8 9s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C7 8.21 7 8.14 7 8m0 4c0-.139 0-.209.008-.267a.85.85 0 0 1 .724-.724c.059-.008.128-.008.267-.008s.21 0 .267.008a.85.85 0 0 1 .724.724c.008.058.008.128.008.267s0 .209-.008.267a.85.85 0 0 1-.724.724c-.058.008-.128.008-.267-.008s-.209 0-.267-.008a.85.85 0 0 1-.724-.724C7 12.209 7 12.139 7 12"/></svg>
            </div>
          )}
          {menu && isOwner && (
            <div ref={menuref} className='absolute right-1.5 top-1.5 bg-zinc-100 rounded-lg z-10'>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setPublicBt(true)}} className='rounded-lg px-2 py-1 flex items-center justify-between text-sm hover:scale-105 hover:bg-blue-100 '>
                <p>{isPrivate ? "Make Public" : "Make Private"}</p>
                {/* Icons can be added here */}
              </div>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setEditBt(true)}} className='px-2 py-1 rounded-lg flex justify-between items-center text-sm hover:scale-105 hover:bg-blue-100 '>
                <p>Rename</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" className="ml-2"><path fill="#000" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"/></svg>
              </div>
              <div onClick={handleShare} className='px-2 py-1 rounded-lg flex items-center justify-between text-sm hover:scale-105 hover:bg-blue-100 '>
                <p>Share</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" className="ml-2"><path fill="#000" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81c1.66 0 3-1.34 3-3s-1.34-3-3-3s-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65c0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92"/></svg>
              </div>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setDeleteBt(true)}} className='px-2 py-1 rounded-lg flex items-center justify-between text-sm hover:scale-105 hover:bg-red-300 text-red-600'>
                <p>Delete</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" className="ml-2"><path fill="currentColor" d="M10 5h4a2 2 0 1 0-4 0M8.5 5a3.5 3.5 0 1 1 7 0h5.75a.75.75 0 0 1 0 1.5h-1.32l-1.17 12.111A3.75 3.75 0 0 1 15.026 22H8.974a3.75 3.75 0 0 1-3.733-3.389L4.07 6.5H2.75a.75.75 0 0 1 0-1.5zm2 4.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0zM14.25 9a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75m-7.516 9.467a2.25 2.25 0 0 0 2.24 2.033h6.052a2.25 2.25 0 0 0 2.24-2.033L18.424 6.5H5.576z"/></svg>
              </div>
             </div>
            )}
          <img className='w-[269px] h-[196px] object-cover rounded-lg border-1 border-zinc-600' src="https://media.sciencephoto.com/c0/27/58/65/c0275865-800px-wm.jpg" alt={data.projectName} />
        </div>
        <div className='flex justify-between items-center'>
            <h1 className='font-semibold text-white'>{projname}</h1>
            <p className='text-sm text-zinc-400'>{getDate(data.updatedAt)}</p>
        </div>

        {editBt && (
            <div className='w-[95%] bg-zinc-800 text-white rounded-md absolute top-[103px] right-1.5 p-2 cursor-default z-20' onClick={(e) => e.stopPropagation()}>
                <div className='flex justify-between items-center py-2'>
                    <p>Rename the project</p>
                    <button onClick={(e)=>{e.stopPropagation();setEditBt(false)}} className="text-xl">&times;</button>
                </div>
                <div className='flex p-1 justify-between items-center'>
                    <input type="text" className='bg-white text-black rounded-md text-sm p-1 w-full' value={projname} onChange={(e)=>setProjname(e.target.value)}/>
                    <button onClick={handleRename} className='rounded-md bg-blue-500 text-white px-2 py-1 text-sm ml-2'>Rename</button>
                </div>
            </div>
        )}

        {publicBt && (
            <div onClick={(e) => e.stopPropagation()} className='w-[95%] bg-zinc-800 text-white rounded-md absolute top-[103px] right-1.5 p-2 cursor-default z-20'>
                <div className='flex justify-between items-center py-2'>
                    <p>{isPrivate ? "This project is private" : "Make this project private?"}</p>
                    <button onClick={(e)=>{e.stopPropagation();setPublicBt(false)}} className="text-xl">&times;</button>
                </div>
                {!isPrivate && (
                    <button onClick={handlePrivate} className='w-full rounded-full bg-red-200 text-[#ff2f03] px-2 py-1 items-center gap-1 justify-center cursor-pointer'>
                        Remove public access
                    </button>
                )}
            </div>
        )}

        {deleteBt && (
            <div onClick={(e) => e.stopPropagation()} className='w-[95%] bg-red-300 text-black rounded-md absolute top-[103px] right-1.5 p-2 cursor-default z-20'>
                <div className='flex justify-between items-center py-2'>
                    <p>This action cannot be undone.</p>
                    <button onClick={(e)=>{e.stopPropagation();setDeleteBt(false)}} className="text-xl">&times;</button>
                </div>
                <div className='flex p-1 justify-around items-center'>
                    <button onClick={handleDelete} className='rounded-full bg-red-600 text-white px-3 py-1 items-center gap-2 cursor-pointer'>
                        Delete
                    </button>
                    <button onClick={(e)=>{e.stopPropagation();setDeleteBt(false)}} className='rounded-full bg-gray-500 text-white px-3 py-1 items-center gap-2 cursor-pointer'>
                        Cancel
                    </button>
                </div>
            </div>
        )}
    </div>
  )
}

export default ProjectCard;