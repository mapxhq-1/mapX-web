import React, { useEffect, useState } from 'react'
import { NavLink,useLocation } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { setHeading } from '../../../store/projectSlice';
import Profile from "./Profile"
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import plus from '../../../assets/icons/Plus.png';
import time from '../../../assets/icons/time.png';
import presentation from '../../../assets/icons/presentation.png';
import map from '../../../assets/icons/map.png';
import folder from '../../../assets/icons/folder.png';
import calander from '../../../assets/icons/calander.png';
import account from '../../../assets/icons/account.png';
import logout from '../../../assets/icons/logout.png';

import timeB from '../../../assets/icons/timeB.png';
import presentationB from '../../../assets/icons/presentationB.png';
import mapB from '../../../assets/icons/mapB.png';
import folderB from '../../../assets/icons/folderB.png';
import accountB from '../../../assets/icons/accountB.png';

const Sidebar = () => {
    const {ownerEmail} = useSelector((state)=>state.project);
    const navigate = useNavigate();
    async function createNewProj(){
    try{
      const res = await axios.post('project-management-service/create-new-project',{
        ownerEmail : ownerEmail,
        projectName : "New project"
      }, {
        headers: {
          'client_name': 'mapx'
        }
      })
      toast.success('New project created!!')
      navigate("/map/"+res.data.projectId )
    }catch(err){
      toast.error(err.response.data.message)
    }
  }
//  const fullState = useSelector((state) => state);
    

    const userId = useSelector(state.project.userToken);
    const email = useSelector(state.project.ownerEmail);
    const [profileOpen,setProfileOpen]= useState(false);
    const dispatch = useDispatch();
    const location = useLocation();
    function handleClick(head){
        dispatch(setHeading(head))
    }
    useEffect(()=>{
        if(location.pathname.includes("/myprojects")){
            dispatch(setHeading("My projects"))
        }else if(location.pathname.includes("/recents")){
            dispatch(setHeading("Recents"))
        }else if(location.pathname.includes("/sharedProjects")){
            dispatch(setHeading("Shared Projects"))
        }else if(location.pathname.includes("/allProjects")){
            dispatch(setHeading("All Projects"))
        }
    },[location.pathname,dispatch])
  return (
    <div>
        <div className='w-[300px] bg-[#1F1F1F] h-full text-white  border-1 border-t-0 border-zinc-600'>
            <div className="project pt-5">
                <div className="projectSettings">
                    <nav>
                        <div
                            onClick={createNewProj}
                            className={
                                `relative flex flex-row items-center gap-2 text-md px-[40px] py-[20px] rounded-lg cursor-pointer
                                transition-all duration-500 ease-in-out select-none text-white hover:bg-white/10  hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]
                                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`
                            }
                            >
                            <>
                                <img className="max-h-[20px] max-w-[20px]" src={plus} alt="" />
                                <p className="pl-[15px]">New Project</p>
                            </>
                        </div>



                        <NavLink onClick={()=>handleClick("Recents")} to='/recents' className={({ isActive }) =>
                                    `relative flex flex-row items-center gap-2 text-md px-[40px] py-[20px] rounded-lg
                                    transition-all duration-500 ease-in-out select-none
                                    ${isActive && !profileOpen ? "bg-[#D5EDFF] text-[#1403FF]" : "text-white"} 

                                    ${!isActive && !profileOpen && "hover:bg-white/10  hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]"} 

                                    before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                    after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`
                                }>
                                {({isActive})=>(
                                <>
                                    <img className='max-h-[20px] max-w-[20px]' src={isActive?timeB:time} alt="" />
                                    <p className='pl-[15px]'>Recents</p>
                                </>
                                )}
                        </NavLink>
                        <NavLink onClick={()=>handleClick("My Projects")} to='/myProjects' className={({ isActive }) =>
                                    `relative flex flex-row items-center gap-2 text-md px-[40px] py-[20px] rounded-lg
                                    transition-all duration-500 ease-in-out select-none
                                    ${isActive && !profileOpen ? "bg-[#D5EDFF] text-[#1403FF]" : "text-white"} 

                                    ${!isActive && !profileOpen && "hover:bg-white/10  hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]"} 

                                    before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                    after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`
                                }>
                                {({isActive})=>(
                                <>
                                    <img className='max-h-[20px] max-w-[20px]' src={isActive?presentationB:presentation} alt="" />
                                    <p className='pl-[15px]'>My Projects</p>
                                </>
                                )}
                        </NavLink>
                        <NavLink onClick={()=>handleClick("Shared Projects")} to='/sharedProjects' className={({ isActive }) =>
                                    `relative flex flex-row items-center gap-2 text-md px-[40px] py-[20px] rounded-lg
                                    transition-all duration-500 ease-in-out select-none
                                    ${isActive && !profileOpen ? "bg-[#D5EDFF] text-[#1403FF]" : "text-white"} 

                                    ${!isActive && !profileOpen && "hover:bg-white/10  hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]"} 

                                    before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                    after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`
                                }>
                                {({isActive})=>(
                                <>
                                    <img className='max-h-[20px] max-w-[20px]' src={isActive?mapB:map} alt="" />
                                    <p className='pl-[15px]'>Shared Projects</p>
                                </>
                            )}
                        </NavLink>
                        <NavLink onClick={()=>handleClick("All Projects")} to='/allProjects' className={({ isActive }) =>
                                    `relative flex flex-row items-center gap-2 text-md px-[40px] py-[20px] rounded-lg
                                    transition-all duration-500 ease-in-out select-none
                                    ${isActive && !profileOpen ? "bg-[#D5EDFF] text-[#1403FF]" : "text-white"} 

                                    ${!isActive && !profileOpen && "hover:bg-white/10  hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]"} 

                                    before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                    after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`
                                }>
                                {({isActive})=>(
                                <>
                                    <img className='max-h-[20px] max-w-[20px]' src={isActive?folderB:folder} alt="" />
                                    <p className='pl-[15px]'>All Projects</p>
                                </>
                                )}
                        </NavLink>
                        
                    </nav>
                </div>
                <div className="help ">
                    <p className='px-[40px] py-[20px] text-lg font-light text-[#1B76D0]'>Help</p>
                    <nav>
                        <a href='https://cal.com/sankalp-sadekar-mapx'>
                            <div className='relative flex flex-row items-center gap-2 text-sm pl-[40px] py-[25px] px-5 cursor-pointer text-white 
                                rounded-lg transition-all duration-500 ease-in-out select-none
                                hover:bg-white/10  hover:backdrop-blur-md
                                hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]
                                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30'>
                                <img className='max-h-[20px] max-w-[20px]' src={`${calander}`} alt="" />
                                <p className='pl-[15px]'>Schedule a call</p>
                            </div>
                        </a>
                    </nav>
                </div>
            </div>
            <hr/>
            <div className="setting ">
                <p className='text-lg px-[40px] py-[19px] font-light text-[#1B76D0]'>Settings</p>
                <nav>
                    <button className='cursor-pointer w-full' onClick={()=>setProfileOpen(!profileOpen)}>
                        <div className={`relative flex flex-row items-center gap-2 text-sm py-[20px] pl-[40px] px-5 cursor-pointer text-white 
                                rounded-lg transition-all duration-500 ease-in-out select-none
                                hover:bg-white/10  hover:backdrop-blur-md
                                hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]
                                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30
                                ${profileOpen?"bg-[#D5EDFF] text-[#1403FF]" : "text-white"}
                                ${profileOpen && "hover:bg-white/10  hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]"} 
                            `}>
                            <img className='max-h-[20px] max-w-[20px]' src={profileOpen?accountB:account} alt="" />
                            <p className='pl-[15px]'>Account Settings</p>
                        </div>
                    </button>
                    <div className='relative flex flex-row items-center gap-2 text-sm py-[20px] pl-[40px] px-5 cursor-pointer text-white 
                                rounded-lg transition-all duration-500 ease-in-out select-none
                                hover:bg-white/10  hover:backdrop-blur-md
                                hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]
                                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30'>
                        <img className='max-h-[20px] max-w-[20px]' src={`${logout}`} alt="" />
                        <p className='pl-[15px]'>logout</p>
                    </div>
                </nav>
            </div>
            <div>
                <button className='pl-4 p-2 flex'>
                    <img className='h-[50px] w-[50px] object-cover rounded-full' src="https://i.pinimg.com/originals/5b/d3/d8/5bd3d84ec587abcd897e556237e46c6e.jpg" alt="" />
                    <div className='pl-2'>
                        <p className='font-semibold'>Sankalp Sadekar</p>
                        <p className='font-light text-sm text-zinc-400'>sankalpsadekar1@gmail.com</p>
                    </div>
                </button>
              {profileOpen && (
  <Profile 
    setProfileOpen={setProfileOpen} 
    userId={userId} 
    email={email} 
  />
)}
            </div>
        </div>
    </div>
  )
}

export default Sidebar