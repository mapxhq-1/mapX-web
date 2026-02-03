import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';

import { setHeading, setEmail, setUserToken } from '../../../store/projectSlice';
import { getUserProfile, getProfilePhoto } from '../../api/auth';
import { saveFeedback } from '../../api/project';

import Profile from "./Profile";

// Assets
import plus from '../../../assets/icons/Plus.png';
import time from '../../../assets/icons/time.png';
import presentation from '../../../assets/icons/presentation.png';
import map from '../../../assets/icons/map.png';
import folder from '../../../assets/icons/folder.png';
import calander from '../../../assets/icons/calander.png';
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
    
    // Mobile toggle state
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
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
        const base = "group relative flex items-center gap-3 px-5 py-3 mx-4 rounded-full select-none cursor-pointer mb-1 transition-all duration-200 ease-in-out";
        const activeStyle = `bg-zinc-800 border-t-2 border-white/10 border-b-0 border-r border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.3)] text-white font-medium`;
        const inactiveStyle = `text-zinc-400 border border-transparent hover:bg-black/30 hover:text-zinc-200 hover:border-t-white/10 hover:shadow-lg`;
        return isActive ? `${base} ${activeStyle}` : `${base} ${inactiveStyle}`;
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
            setIsMobileOpen(false); // Close sidebar on mobile after action
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
        setIsMobileOpen(false); // Close sidebar on mobile when a link is clicked
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

    return (
        <>
            {/* --- MOBILE TRIGGER BUTTON --- */}
            <button 
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden fixed top-6 left-4 z-[60] p-2 bg-zinc-900 rounded-full border border-white/10 text-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* --- MOBILE OVERLAY --- */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* --- SIDEBAR CONTAINER --- */}
            <div className={`
                fixed md:relative z-[80] h-full
                transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className='w-[300px] bg-[#18181b] h-full flex flex-col justify-between border-r border-black shadow-2xl rounded-r-4xl tracking-wide'>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar pt-8 pb-4">
                        
                        {/* Header & Close button for mobile */}
                        <div className="px-8 mb-8 flex justify-between items-center">
                            <h1 className="text-2xl text-zinc-100 tracking-wide drop-shadow-md" style={{ fontFamily: '"Potta One", cursive' }}>
                                Happy Dyno
                            </h1>
                            <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-zinc-500">
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
                                    <img className="w-4 h-4 opacity-60" src={plus} alt="Add" />
                                    <span className="font-medium text-sm">New Project</span>
                                </div>
                            </div>

                            <NavLink onClick={() => handleClick("Recents")} to='/recents' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className='w-4 h-4 opacity-60' src={time} alt="Recents" />
                                <span className="font-medium text-sm">Recents</span>
                            </NavLink>

                            <NavLink onClick={() => handleClick("My Projects")} to='/myProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className='w-4 h-4 opacity-60' src={presentation} alt="My Projects" />
                                <span className="font-medium text-sm">My Projects</span>
                            </NavLink>

                            <NavLink onClick={() => handleClick("Shared Projects")} to='/sharedProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className='w-4 h-4 opacity-60' src={map} alt="Shared" />
                                <span className="font-medium text-sm">Shared Projects</span>
                            </NavLink>

                            <NavLink onClick={() => handleClick("All Projects")} to='/allProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                                <img className='w-4 h-4 opacity-60' src={folder} alt="All" />
                                <span className="font-medium text-sm">All Projects</span>
                            </NavLink>
                        </div>

                        <div className="my-4 border-t-2 border-black" />

                        {/* Support */}
                        <div>
                            <p className='px-9 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600'>Support</p>
                            <a href='https://cal.com/sankalp-sadekar-mapx' target='_blank' rel="noreferrer">
                                <div className={getNavItemClass(false)}>
                                    <img className='w-4 h-4 opacity-60' src={calander} alt="Schedule" />
                                    <span className="font-medium text-sm">Schedule Call</span>
                                </div>
                            </a>
                        </div>

                        {/* Feedback */}
                        <div className="mt-4 px-9">
                            <textarea 
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full h-25 bg-black/20 text-zinc-300 text-[12px] rounded-lg p-2 outline-none resize-none border border-white/5 placeholder:text-zinc-600"
                                placeholder="Let’s make Dyno cool! 🦕"
                            />
                            <button onClick={handleFeedbackSubmit} className="mt-1 w-full py-2 rounded-lg text-[10px] font-semibold uppercase bg-black text-zinc-500 border border-zinc-800 hover:bg-zinc-200 hover:text-black">
                                Submit
                            </button>
                        </div>
                    </div>

                    {/* Bottom Profile Widget */}
                    <div className="p-4">
                        <div className="bg-black/30 rounded-[24px] p-4 border border-zinc-900">
                            <div className="flex items-center gap-3 mb-4 pl-1">
                                <img className='h-10 w-10 object-cover rounded-full ring-2 ring-zinc-800' src={profilePictureUrl} alt="Profile" />
                                <div className='flex flex-col overflow-hidden'>
                                    <p className='font-semibold text-sm text-zinc-300 truncate'>{userData ? userData.first_name : "User"}</p>
                                    <p className='text-[10px] text-zinc-500 truncate'>{email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium transition-all ${profileOpen ? 'bg-zinc-700 text-white' : 'bg-black text-zinc-500'}`}
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
                            <div className="absolute bottom-4 left-[310px] z-[90]">
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