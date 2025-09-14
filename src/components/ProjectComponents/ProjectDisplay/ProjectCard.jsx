import {useEffect, useRef, useState} from 'react'
import { useSelector,useDispatch } from 'react-redux';
import axios from 'axios';
import {toast} from 'react-toastify'
import {myProjApiCall,sharedProjApiCall} from "../../../store/projectSlice"
import { useNavigate } from 'react-router-dom';
const ProjectCard = ({data}) => {
  const [menu,setMenu] = useState(false);
  const [isPrivate,setIsPrivate] = useState(false);
  const menuref = useRef(null);
  const {ownerEmail} = useSelector((state)=>state.project);
  const isOwner = (data.ownerEmail==ownerEmail);
  const [copy,setCopy] =  useState(false);
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
    setCopy(false);
  }

  async function handleRename(){
    try{
      const res=await axios.patch('/project-management-service/update-project',{
        projectName : projname,
        ownerEmail : ownerEmail,
        projectId : data.id,
      })
      toast.success("Renamed successfully!!")
    }catch(err){
    toast.error(err.response.data.message)
    setProjname(data.projectName);
    }
    setAllFalse();
  }

  async function handlePrivate(e){
    e.stopPropagation();
    try{
      const res = await axios.patch('/project-management-service/update-project',{
        accessorList : [],
        ownerEmail : ownerEmail,
        projectId : data.id,
      })
      toast.success("Your project is now private!!");
    }catch(err){
      toast.error(err.response.data.message);
    }
    setAllFalse();
  }

  async function handleDelete(e){
    e.stopPropagation();
    try{
      const res = await axios.delete('/project-management-service/delete-project/'+data.id,{
        params:{
          ownerEmail:ownerEmail
        }
      })
      toast.success("Project deleted!!");
      dispatch(myProjApiCall())
      dispatch(sharedProjApiCall())
    }catch(err){
      toast.error(err.response.data.message);
    }
    setAllFalse();
  }

  useEffect(()=>{
    setProjname(data.projectName);
    setIsPrivate(data.accessorList?.length==0);
    function Event(event){
      if(menuref.current && !menuref.current.contains(event.target))setMenu(false);
    }
    document.addEventListener("mousedown",Event);
    return ()=>{
      document.removeEventListener("mousedown",Event);
    }
  },[]);
  return (
    <div className='max-w-[269px] hover:scale-105 duration-700 ease-in-out cursor-pointer shrink-0 relative' onClick={()=>navigate('/map/'+data.id)}>
        <div className='relative'>
          {!menu && <div onClick={(e)=>{e.stopPropagation();setMenu(true)}} className='absolute right-1.5 top-1.5 p-1 bg-zinc-100 rounded-full hover:scale-115 duration-300 ease-in-out'>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#000" d="M7 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C7.79 3 7.86 3 8 3s.209 0 .267.008a.85.85 0 0 1 .725.725C9 3.79 9 3.86 9 4s0 .209-.008.267a.85.85 0 0 1-.725.725C8.21 5 8.14 5 8 5s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C7 4.21 7 4.14 7 4m0 4c0-.14 0-.209.008-.267a.85.85 0 0 1 .725-.725C7.79 7 7.86 7 8 7s.209 0 .267.008a.85.85 0 0 1 .725.725C9 7.79 9 7.86 9 8s0 .209-.008.267a.85.85 0 0 1-.725.725C8.21 9 8.14 9 8 9s-.209 0-.267-.008a.85.85 0 0 1-.725-.725C7 8.21 7 8.14 7 8m0 4c0-.139 0-.209.008-.267a.85.85 0 0 1 .724-.724c.059-.008.128-.008.267-.008s.21 0 .267.008a.85.85 0 0 1 .724.724c.008.058.008.128.008.267s0 .209-.008.267a.85.85 0 0 1-.724.724c-.058.008-.128.008-.267.008s-.209 0-.267-.008a.85.85 0 0 1-.724-.724C7 12.209 7 12.139 7 12"/></svg>
          </div>}
          {menu && 
          <>
          {isOwner && 
            <div ref={menuref} className='absolute right-1.5 top-1.5 bg-zinc-100 rounded-lg'>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setPublicBt(true)}} className=' rounded-lg px-1 py-0.5 flex items-center place-content-between text-sm hover:scale-105 hover:bg-blue-100 '>
              <p>{isPrivate?"Private":"Public"}</p>
              {isPrivate && <svg xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 24 24"><path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M8 10V7c0-2.21 1.79-4 4-4s4 1.79 4 4v3m-4 5a1 1 0 1 0 0-2a1 1 0 0 0 0 2m0 0v3m-5.4-8h10.8c.88 0 1.6.72 1.6 1.6v7c0 1.32-1.08 2.4-2.4 2.4H7.4C6.08 21 5 19.92 5 18.6v-7c0-.88.72-1.6 1.6-1.6"/></svg>}
              {!isPrivate && <svg xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 24 24"><path fill="#000" d="M1 17.2q0-.85.438-1.562T2.6 14.55q1.55-.775 3.15-1.162T9 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T17 17.2v.8q0 .825-.587 1.413T15 20H3q-.825 0-1.412-.587T1 18zM18.45 20q.275-.45.413-.962T19 18v-1q0-1.1-.612-2.113T16.65 13.15q1.275.15 2.4.513t2.1.887q.9.5 1.375 1.112T23 17v1q0 .825-.587 1.413T21 20zM9 12q-1.65 0-2.825-1.175T5 8t1.175-2.825T9 4t2.825 1.175T13 8t-1.175 2.825T9 12m10-4q0 1.65-1.175 2.825T15 12q-.275 0-.7-.062t-.7-.138q.675-.8 1.038-1.775T15 8t-.362-2.025T13.6 4.2q.35-.125.7-.163T15 4q1.65 0 2.825 1.175T19 8"/></svg>}
            </div>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setEditBt(true)}} className='px-1 rounded-lg py-0.5 flex place-content-between items-center text-sm hover:scale-105 hover:bg-blue-100 '>
                <p>Rename</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"><path fill="#000" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"/></svg>
              </div>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setCopy(true)}} className='px-1 rounded-lg py-0.5 flex  items-center place-content-between text-sm hover:scale-105 hover:bg-blue-100 '>
                <p>Share</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"><path fill="#000" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81c1.66 0 3-1.34 3-3s-1.34-3-3-3s-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65c0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92"/></svg>
              </div>
              <div onClick={(e)=>{e.stopPropagation();setAllFalse();setDeleteBt(true)}} className='px-1 rounded-lg py-0.5 flex items-center place-content-between text-sm hover:scale-105 hover:bg-red-300 text-red-600'>
                <p>Delete</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"><path fill="#f00" d="M10 5h4a2 2 0 1 0-4 0M8.5 5a3.5 3.5 0 1 1 7 0h5.75a.75.75 0 0 1 0 1.5h-1.32l-1.17 12.111A3.75 3.75 0 0 1 15.026 22H8.974a3.75 3.75 0 0 1-3.733-3.389L4.07 6.5H2.75a.75.75 0 0 1 0-1.5zm2 4.75a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0zM14.25 9a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75m-7.516 9.467a2.25 2.25 0 0 0 2.24 2.033h6.052a2.25 2.25 0 0 0 2.24-2.033L18.424 6.5H5.576z"/></svg>
              </div>
             </div>
            }
              {!isOwner && 
              <div ref={menuref} className='absolute right-1.5 top-1.5 bg-zinc-100 rounded-lg'>
                <div className='px-1 rounded-lg py-0.5 flex  items-center place-content-between text-sm hover:scale-105 hover:bg-blue-100 '>
                  <p>Private</p>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 24 24"><path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M8 10V7c0-2.21 1.79-4 4-4s4 1.79 4 4v3m-4 5a1 1 0 1 0 0-2a1 1 0 0 0 0 2m0 0v3m-5.4-8h10.8c.88 0 1.6.72 1.6 1.6v7c0 1.32-1.08 2.4-2.4 2.4H7.4C6.08 21 5 19.92 5 18.6v-7c0-.88.72-1.6 1.6-1.6"/></svg>
                </div>
                </div>
              }
            </>
          }
          <img className='w-[269px] h-[196px] object-cover rounded-lg border-1 border-zinc-600' src="https://media.sciencephoto.com/c0/27/58/65/c0275865-800px-wm.jpg" alt="" />
        </div>
        <div className='flex place-content-between items-center'>
            <h1 className='font-semibold text-white'>{projname}</h1>
            <p className='text-sm text-zinc-400'>{getDate(data.updatedAt)}</p>
        </div>

        {editBt && <div className='w-[95%] bg-zinc-800 text-white rounded-md absolute top-[103px] right-1.5 p-1 cursor-default' onClick={(e) => e.stopPropagation()}>
          <div className='flex justify-around items-center py-3'>
            <p>Rename the project</p>
            <svg onClick={(e)=>{e.stopPropagation();setEditBt(false)}} xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeDasharray={16} strokeDashoffset={16} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M7 7l10 10"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="16;0"></animate></path><path d="M17 7l-10 10"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="16;0"></animate></path></g></svg>
          </div>
          <div className='flex p-1 justify-between items-center'>
            <input  type="text" className='bg-white text-black rounded-md text-sm p-1' value={projname} onChange={(e)=>setProjname(e.target.value)}/>
            <button onClick={handleRename} className='rounded-md bg-blue-500 flex text-white px-1.5 py-0.5 text-sm cursor-pointer'>Rename</button>
          </div>
        </div> }

        {publicBt && <div onClick={(e) => e.stopPropagation()} className='w-[95%] bg-zinc-800 text-white rounded-md absolute top-[103px] right-1.5 p-1 cursor-default'>
          <div className='flex justify-around items-center py-3'>
            <p>{isPrivate ? "Project is private":"Set it to private"}</p>
            <svg onClick={(e)=>{e.stopPropagation();setPublicBt(false)}} xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeDasharray={16} strokeDashoffset={16} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M7 7l10 10"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="16;0"></animate></path><path d="M17 7l-10 10"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="16;0"></animate></path></g></svg>
          </div>
            {!isPrivate&&<div onClick={handlePrivate} className='rounded-full bg-red-200 flex text-[#ff2f03] px-1.5 py-0.5 items-center gap-1 justify-around cursor-pointer'>
              <p>Remove public access</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#ff2f03" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path strokeDasharray={20} strokeDashoffset={20} d="M3 21v-1c0 -2.21 1.79 -4 4 -4h4c2.21 0 4 1.79 4 4v1"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"></animate></path><path strokeDasharray={20} strokeDashoffset={20} d="M9 13c-1.66 0 -3 -1.34 -3 -3c0 -1.66 1.34 -3 3 -3c1.66 0 3 1.34 3 3c0 1.66 -1.34 3 -3 3Z"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.2s" values="20;0"></animate></path><path strokeDasharray={10} strokeDashoffset={10} d="M15 3l6 6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.5s" dur="0.2s" values="10;0"></animate></path><path strokeDasharray={10} strokeDashoffset={10} d="M21 3l-6 6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" values="10;0"></animate></path></g></svg>
            </div>}
        </div> }

        {copy && <div onClick={(e) => e.stopPropagation()} className='w-[95%] bg-zinc-800 text-white rounded-md absolute top-[103px] right-1.5 p-1 cursor-default'>
          <div className='flex justify-around items-center py-3'>
            <p>Copy the link</p>
            <svg onClick={(e)=>{e.stopPropagation();setCopy(false)}} xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeDasharray={16} strokeDashoffset={16} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M7 7l10 10"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="16;0"></animate></path><path d="M17 7l-10 10"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="16;0"></animate></path></g></svg>
          </div>
          <div className='rounded-full border-1 border-zinc-300 flex p-1 justify-between items-center'>
            <p className='text-sm'>mapx.com/share...</p>
            <div className='rounded-full bg-zinc-200 flex text-black px-1.5 py-0.5 cursor-pointer'>
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><path fill="none" stroke="#000" strokeDasharray={28} strokeDashoffset={28} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6l2 -2c1 -1 3 -1 4 0l1 1c1 1 1 3 0 4l-5 5c-1 1 -3 1 -4 0M11 18l-2 2c-1 1 -3 1 -4 0l-1 -1c-1 -1 -1 -3 0 -4l5 -5c1 -1 3 -1 4 0"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="28;0"></animate></path></svg>
              <p className='text-sm'>Copy</p>
            </div>
          </div>
        </div> }
        
        {deleteBt && <div onClick={(e) => e.stopPropagation()} className='w-[95%] bg-red-300  text-black rounded-md absolute top-[103px] right-1.5 p-1 cursor-default'>
          <div className='flex justify-around items-center py-3'>
            <p className=''>Caution : All the data will be lost</p>
            <svg onClick={(e)=>{e.stopPropagation();setDeleteBt(false)}} xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#000" strokeDasharray={16} strokeDashoffset={16} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M7 7l10 10"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="16;0"></animate></path><path d="M17 7l-10 10"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="16;0"></animate></path></g></svg>
          </div>
          <div className='rounded-full  flex p-1 justify-between items-center'>
            <div onClick={handleDelete} className='rounded-full bg-red-600 flex text-white px-1.5 py-0.5 items-center gap-2 cursor-pointer'>
              <p>Delete</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path strokeDasharray={64} strokeDashoffset={64} d="M13 3l6 6v12h-14v-18h8"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"></animate></path><path strokeDasharray={14} strokeDashoffset={14} strokeWidth={1.5} d="M12.5 3v5.5h6.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" values="14;0"></animate></path><path strokeDasharray={10} strokeDashoffset={10} d="M9 11l6 6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.9s" dur="0.2s" values="10;0"></animate></path><path strokeDasharray={10} strokeDashoffset={10} d="M15 11l-6 6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.1s" dur="0.2s" values="10;0"></animate></path></g><path fill="#fff" fillOpacity={0} d="M5 3H12.5V8.5H19V21H5V3Z"><animate fill="freeze" attributeName="fill-opacity" begin="1.4s" dur="0.15s" values="0;0.3"></animate></path></svg>
            </div>
            <div onClick={(e)=>{e.stopPropagation();setDeleteBt(false)}} className='rounded-full bg-green-500 flex text-white px-1.5 py-0.5 items-center gap-2 cursor-pointer'>
              <p>Cancel</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path fill="#fff" fillOpacity={0} strokeDasharray={64} strokeDashoffset={64} d="M5.64 5.64c3.51 -3.51 9.21 -3.51 12.73 0c3.51 3.51 3.51 9.21 0 12.73c-3.51 3.51 -9.21 3.51 -12.73 0c-3.51 -3.51 -3.51 -9.21 -0 -12.73Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.15s" values="0;0.3"></animate><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"></animate></path><path strokeDasharray={20} strokeDashoffset={20} d="M6 6l12 12"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="20;0"></animate></path></g></svg>
            </div>
          </div>
        </div> }
    </div>
  )
}

export default ProjectCard