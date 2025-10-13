import React, { useEffect, useState } from 'react'
import { NavLink,useLocation } from "react-router-dom";
import { setHeading } from '../../../store/projectSlice';
import Profile from "./Profile"
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector,useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getUserProfile,getProfilePhoto } from '../../api/auth';
import { setEmail,setUserToken } from '../../../store/projectSlice';


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
    const BASE_URL = import.meta.env.VITE_URL_PROJECT+  "/project-management-service";
    const {ownerEmail} = useSelector((state)=>state.project);
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState("https://wallpapers.com/images/high/placeholder-profile-icon-8qmjk1094ijhbem9.png");
    const userId = useSelector((state)=>state.project.userToken);
    const email = useSelector((state)=>state.project.ownerEmail);
    const [profileOpen,setProfileOpen]= useState(false);
    const dispatch = useDispatch();
    const location = useLocation();

    async function createNewProj(){
    try{
      const res = await axios.post(BASE_URL+'/create-new-project',{
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
  function handleLogout(){
    localStorage.removeItem('ownerEmail');
    localStorage.removeItem('userToken');
    localStorage.removeItem('bearerToken');
    dispatch(setEmail(''));
    dispatch(setUserToken(''));
    window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
  }

    function handleClick(head){
        dispatch(setHeading(head))
    }
    const fetchProfile = async () => {

        if (!userId) return;
        try {
            const profile = await getUserProfile(userId);
            setUserData(profile);
            if (profile?.picture) {
                try {
                    setTimeout(async () => {
                        const response = await getProfilePhoto(email, profile.picture);
                        const imageUrl = URL.createObjectURL(response.data);
                    setProfilePictureUrl(imageUrl);
                    }, 100);

                    
                } catch (imgError) {
                    console.error("Failed to fetch profile image:", imgError);
                    setProfilePictureUrl("https://wallpapers.com/images/high/placeholder-profile-icon-8qmjk1094ijhbem9.png");
                }
            } else {
                setProfilePictureUrl("https://wallpapers.com/images/high/placeholder-profile-icon-8qmjk1094ijhbem9.png");
            }

        } catch (error) {
            console.log(error);
            toast.error("Failed to load profile data.");
        }
    };
    useEffect(()=>{
        fetchProfile();
        if(location.pathname.includes("/myprojects")){
            dispatch(setHeading("My projects"))
        }else if(location.pathname.includes("/recents")){
            dispatch(setHeading("Recents"))
        }else if(location.pathname.includes("/sharedProjects")){
            dispatch(setHeading("Shared Projects"))
        }else if(location.pathname.includes("/allProjects")){
            dispatch(setHeading("All Projects"))
        }
    },[location.pathname,dispatch,userId])
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
                        <a href='https://cal.com/sankalp-sadekar-mapx' target='_blank'>
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
                    <div onClick={handleLogout} className='relative flex flex-row items-center gap-2 text-sm py-[20px] pl-[40px] px-5 cursor-pointer text-white 
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
                    <img className='h-[50px] w-[50px] object-cover rounded-full' src={profilePictureUrl} alt="" />
                    <div className='pl-2'>
                        <p className='font-semibold text-left'>{userData?userData.first_name+" "+userData.last_name:"Loading"}</p>
                        <p className='font-light text-sm text-zinc-400 text-left'>{email}</p>
                    </div>
                </button>
              {profileOpen && (
  <Profile 
    setProfileOpen={setProfileOpen} 
    userId={userId} 
    email={email} 
    profilePictureUrl={profilePictureUrl}
    userData={userData}
    fetchProfile={fetchProfile}
  />
)}
            </div>
        </div>
    </div>
  )
}

export default Sidebar