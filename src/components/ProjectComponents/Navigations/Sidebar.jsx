import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';
import CreditWidget from './CreditWidget';

import { setHeading, setEmail, setUserToken } from '../../../store/projectSlice';
import { getUserProfile, getProfilePhoto } from '../../api/auth';
import { saveFeedback } from '../../api/project';

import Profile from "./Profile";
import {Youtube} from 'lucide-react'
// Assets
import plus from '../../../assets/icons/Plus.png';
import time from '../../../assets/icons/time.png';
import presentation from '../../../assets/icons/presentation.png';
import map from '../../../assets/icons/map.png';
import folder from '../../../assets/icons/folder.png';
import account from '../../../assets/icons/account.png';
import logout from '../../../assets/icons/logout.png';

// Custom drawing functions for confetti
const drawLongStrip = (ctx) => {
    ctx.beginPath();
    ctx.rect(-40, -2.5, 80, 5);
    ctx.fill();
};
const drawChunkyRect = (ctx) => {
    ctx.beginPath();
    ctx.rect(-9, -6, 18, 12);
    ctx.fill();
};

const Sidebar = () => {
    const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
    const { ownerEmail } = useSelector((state) => state.project);
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState("https://wallpapers.com/images/high/placeholder-profile-icon-8qmjk1094ijhbem9.png");
    const userId = useSelector((state) => state.project.userToken);
    const email = useSelector((state) => state.project.ownerEmail);
    const [profileOpen, setProfileOpen] = useState(false);
    
    // Mobile Sidebar Toggle
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    // --- Mobile Landscape Detection ---
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const checkMobileLandscape = () => {
            const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || navigator.vendor || window.opera;
            const isMobileDevice = /android|iPad|iPhone|iPod/i.test(userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
            const isLandscape = window.innerWidth > window.innerHeight;
            const isShort = window.innerHeight < 500;
            setIsCompact(isMobileDevice && isLandscape && isShort);
        };

        checkMobileLandscape();
        window.addEventListener('resize', checkMobileLandscape);
        return () => window.removeEventListener('resize', checkMobileLandscape);
    }, []);

    const [feedback, setFeedback] = useState("");
    const dispatch = useDispatch();
    const location = useLocation();

    const btnRef = useRef(null);
    const [spot, setSpot] = useState({ x: 0, y: 0 });
    const [isHover, setIsHover] = useState(false);
  
    const handleMove = (e) => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSpot({ x, y });
    };

    const getNavItemClass = (isActive) => {
        const base = "group relative flex items-center gap-3 rounded-full select-none cursor-pointer mb-1 transition-all duration-200 ease-in-out";
        const sizeClasses = isCompact 
            ? "px-3 py-1 mx-2" 
            : "px-5 py-3 mx-4";
            
        const activeStyle = `bg-zinc-800 border-t-2 border-white/10 border-b-0 border-r border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.3)] text-white font-medium`;
        const inactiveStyle = `text-zinc-400 border border-transparent hover:bg-black/30 hover:text-zinc-200 hover:border-t-white/10 hover:shadow-lg`;
        
        return isActive 
            ? `${base} ${sizeClasses} ${activeStyle}` 
            : `${base} ${sizeClasses} ${inactiveStyle}`;
    };

    async function createNewProj() {
        try {
            const token = localStorage.getItem('bearerToken');
            const res = await axios.post(BASE_URL + '/create-new-project', {
                ownerEmail: ownerEmail,
                projectName: "New project"
            }, {
                headers: { 'client_name': 'mapx', "Authorization": `Bearer ${token}` }
            })
            toast.success('New project created!!');
            setIsMobileOpen(false); 
            navigate("/map/" + res.data.projectId);
        } catch (err) {
            toast.error(err.response?.data?.message || "Error creating project")
        }
    }

    function handleLogout() {
        localStorage.removeItem('ownerEmail');
        localStorage.removeItem('userToken');
        localStorage.removeItem('bearerToken');
        dispatch(setEmail(''));
        dispatch(setUserToken(''));
        window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
    }

    function handleClick(head) {
        dispatch(setHeading(head));
        setIsMobileOpen(false); 
    }

    const handleFeedbackSubmit = async () => {
        if (!feedback.trim()) return;
        try {
            const userId = localStorage.getItem("ownerEmail"); 
            if (!userId) { toast.error("User not logged in"); return; }
            await saveFeedback({ userId, feedback });
            toast.success("Thanks for the feedback!");
            setFeedback("");
            const myConfetti = confetti.create(null, { resize: true, useWorker: false });
            const origin = { x: 0.08, y: 0.7 };
            const colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"];
            myConfetti({ particleCount: 30, spread: 50, startVelocity: 20, origin, scalar: 0.8, shapes: ["circle", "square", drawChunkyRect], colors, gravity: 1.5, drift: 0.5, ticks: 150 });
            setTimeout(() => {
                myConfetti({ particleCount: 8, spread: 70, startVelocity: 35, origin, scalar: 1.2, shapes: [drawLongStrip], colors, gravity: 2, drift: 1, flat: true, wobble: 15, ticks: 250 });
            }, 100);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to submit feedback");
        }
    };

    const fetchProfile = async () => {
        if (!userId) return;
        try {
            const profile = await getUserProfile(userId);
            setUserData(profile);
            if (profile?.picture) {
                setTimeout(async () => {
                    try {
                        const response = await getProfilePhoto(email, profile.picture);
                        setProfilePictureUrl(URL.createObjectURL(response.data));
                    } catch (e) {
                        setProfilePictureUrl("https://wallpapers.com/images/high/placeholder-profile-icon-8qmjk1094ijhbem9.png");
                    }
                }, 100);
            }
        } catch (error) { console.log("Error loading profile", error); }
    };

    useEffect(() => {
        fetchProfile();
        if (location.pathname.includes("/myprojects")) dispatch(setHeading("My projects"));
        else if (location.pathname.includes("/recents")) dispatch(setHeading("Recents"));
        else if (location.pathname.includes("/sharedProjects")) dispatch(setHeading("Shared Projects"));
        else if (location.pathname.includes("/allProjects")) dispatch(setHeading("All Projects"));
    }, [location.pathname, dispatch, userId]);

    // --- Dynamic Styles ---
    const sidebarWidth = isCompact ? "w-[200px]" : "w-[300px]";
    const containerLayout = isCompact ? "flex-col overflow-y-auto" : "flex-col justify-between"; 
    
    const topSectionClasses = isCompact 
        ? "pt-2 pb-1" 
        : "flex-1 overflow-y-auto custom-scrollbar pt-8 pb-4";

    const iconSize = isCompact ? "w-2.5 h-2.5" : "w-4 h-4"; 
    const textSize = isCompact ? "text-[10px]" : "text-sm";
    
    const headerSize = isCompact ? "text-base mb-1" : "text-2xl mb-8";
    const headerPadding = isCompact ? "px-4" : "px-8";
    const feedbackHeight = isCompact ? "h-10" : "h-24";

    return (
        <>
        {/* --- INJECTED CUSTOM SCROLLBAR CSS --- */}
<style>{`
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #52525b transparent;
    }
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #52525b;
        border-radius: 10px;
    }
    /* The Nuclear Option for Scrollbar Arrows */
    .custom-scrollbar::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
    }
    /* Also target specific arrow pseudo-elements just in case */
    .custom-scrollbar::-webkit-scrollbar-button:start:decrement,
    .custom-scrollbar::-webkit-scrollbar-button:end:increment {
        display: none !important;
    }
`}</style>
            {/* --- MOBILE TRIGGER --- */}
            <button 
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-6 left-4 z-[60] p-2 bg-zinc-900 rounded-full border border-white/10 text-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* --- MOBILE OVERLAY --- */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* --- SIDEBAR CONTAINER --- */}
            <div className={`
                fixed lg:relative z-[80] h-full
                transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className={`${sidebarWidth} bg-[#18181b] h-full flex ${containerLayout} border-r border-black shadow-2xl rounded-r-4xl tracking-wide transition-all duration-300`}>
                    
                    {/* TOP SECTION */}
                    <div className={topSectionClasses}>
                        
                        {/* Header */}
                        <div className={`${headerPadding} ${headerSize} flex justify-between items-center transition-all`}>
                            <span
                                className="text-white tracking-[-0.05em] text-2xl font-semibold"
                                style={{ fontFamily: 'General Sans, sans-serif' }}
                            >
                                Magic Maps
                            </span>
                            <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-zinc-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex flex-col">
                            <div
                                ref={btnRef}
                                onMouseEnter={() => setIsHover(true)}
                                onMouseLeave={() => setIsHover(false)}
                                onMouseMove={handleMove}
                                style={{ "--mx": `${spot.x}px`, "--my": `${spot.y}px` }}
                                onClick={createNewProj}
                                className={`${getNavItemClass(false)} overflow-hidden`}
                            >
                                <span className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${isHover ? "opacity-100" : "opacity-0"}`}
                                    style={{ background: `radial-gradient(120px circle at var(--mx) var(--my), rgba(178, 255, 137, 0.25), rgba(178, 255, 137, 0.12) 35%, rgba(0, 0, 0, 0) 70%)`, filter: "blur(10px)" }}
                                />
                                <div className="relative z-10 flex items-center gap-3">
                                    <img className={`${iconSize} opacity-60 transition-all`} src={plus} alt="Add" />
                                    <span className={`font-medium ${textSize}`}>New Project</span>
                                </div>
                            </div>

                            <NavLink onClick={() => handleClick("Recents")} to='/recents' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className={`${iconSize} opacity-60 transition-all`} src={time} alt="Recents" />
                                <span className={`font-medium ${textSize}`}>Recents</span>
                            </NavLink>

                            <NavLink onClick={() => handleClick("My Projects")} to='/myProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className={`${iconSize} opacity-60 transition-all`} src={presentation} alt="My Projects" />
                                <span className={`font-medium ${textSize}`}>My Projects</span>
                            </NavLink>

                            <NavLink onClick={() => handleClick("Shared Projects")} to='/sharedProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className={`${iconSize} opacity-60 transition-all`} src={map} alt="Shared" />
                                <span className={`font-medium ${textSize}`}>Shared Projects</span>
                            </NavLink>

                            <NavLink onClick={() => handleClick("All Projects")} to='/allProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className={`${iconSize} opacity-60 transition-all`} src={folder} alt="All" />
                                <span className={`font-medium ${textSize}`}>All Projects</span>
                            </NavLink>
                        </div>

                        <div className={`border-t-2 border-black ${isCompact ? 'my-2' : 'my-4'}`} />

                        {/* Support */}
                        <div>
                            <p className={`${headerPadding} mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600`}>Support</p>
                            {/* <a href='https://help.happydyno.com' target='_blank' rel="noreferrer">
                                <div className={getNavItemClass(false)}>
                                    <Youtube size={18}/>
                                    <span className={`font-medium ${textSize}`}>How to use - Videos</span>
                                </div>
                            </a> */}
                        </div>
                        

                        {/* Feedback — separate card with inset depth effect */}
                        <div className={`mt-2 px-2`}>
                            <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-[#141416] shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.4)]">
                                <div className="px-3 pt-3 pb-1">
                                    <div className="rounded-lg shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(0,0,0,0.6)] bg-black/50 border border-black/70">
                                        <textarea 
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            className={`w-full ${feedbackHeight} bg-transparent text-zinc-300 text-[12px] rounded-lg p-2.5 outline-none resize-none placeholder:text-zinc-400 transition-all`}
                                            placeholder="Tell us what you think — Lets make Dyno cool 😎"
                                        />
                                    </div>
                                </div>
                                <div className="px-3 pb-3 pt-2">
                                    <button
                                        onClick={handleFeedbackSubmit}
                                        className="w-full py-1.5 rounded-lg text-[10px] font-semibold uppercase bg-black/60 text-zinc-400 border border-zinc-800/80 hover:bg-zinc-200 hover:text-black transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                                    >
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                        <div className="px-2 mt-2 mx-2.5">
                            <CreditWidget />
                        </div>

                    {/* BOTTOM SECTION (Profile) */}
                    <div className={`${isCompact ? 'pb-2 px-2 pt-1' : 'pb-4 px-4 pt-2.5'}`}>
                        <div className={`bg-black/30 rounded-[24px] ${isCompact ? 'p-2' : 'p-4'} border border-zinc-900`}>
                            <div className={`flex items-center gap-3 ${isCompact ? 'mb-2' : 'mb-4'} pl-1`}>
                                <img className={`${isCompact ? 'h-6 w-6' : 'h-10 w-10'} object-cover rounded-full ring-2 ring-zinc-800`} src={profilePictureUrl} alt="Profile" />
                                <div className='flex flex-col overflow-hidden'>
                                    <p className={`font-semibold ${textSize} text-zinc-300 truncate`}>{userData ? userData.first_name : "User"}</p>
                                    <p className='text-[10px] text-zinc-500 truncate'>{email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className={`flex-1 flex items-center justify-center gap-2 ${isCompact ? 'py-1' : 'py-2'} rounded-full text-xs font-medium transition-all ${profileOpen ? 'bg-zinc-700 text-white' : 'bg-black text-zinc-500'}`}
                                >
                                    <img className={`w-3.5 h-3.5 ${profileOpen ? 'invert' : 'opacity-60'}`} src={account} alt="" />
                                    Settings
                                </button>
                                <button onClick={handleLogout} className="h-8 w-8 flex items-center justify-center rounded-full bg-black text-zinc-500 hover:text-red-400">
                                    <img className='w-3.5 h-3.5 opacity-70' src={logout} alt="Logout" />
                                </button>
                            </div>
                        </div>

                        {profileOpen && (
                            <div className={`absolute z-[90] ${
                                isCompact 
                                ? 'top-1/2 -translate-y-1/2 left-[210px]' 
                                : 'bottom-4 left-[310px]'
                            }`}>
                                <Profile setProfileOpen={setProfileOpen} userId={userId} email={email} profilePictureUrl={profilePictureUrl} userData={userData} fetchProfile={fetchProfile} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Sidebar;