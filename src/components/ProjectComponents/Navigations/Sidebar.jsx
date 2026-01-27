import React, { useEffect, useState } from 'react';
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

const drawLongStrip = (ctx) => {
    ctx.beginPath();
    // slightly thinner (height 5) and MUCH longer (width 80)
    // x = -40, y = -2.5 ensures it spins around its center
    ctx.rect(-40, -2.5, 80, 5); 
    ctx.fill();
};
  
// 2. Chunky Rectangle
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
    
    // State for feedback
    const [feedback, setFeedback] = useState("");

    const dispatch = useDispatch();
    const location = useLocation();

    // --- Styling Logic ---

    const getNavItemClass = (isActive) => {
        const base = "group relative flex items-center gap-3 px-5 py-3 mx-4 rounded-full select-none cursor-pointer mb-1 transition-all duration-200 ease-in-out";
        
        // SELECTED STATE
        const activeStyle = `
            bg-zinc-800
            border-t-2 border-white/10 border-b-0 border-r border-white/5
            shadow-[0_2px_10px_rgba(0,0,0,0.3)] 
            text-white font-medium
        `;

        // DEFAULT STATE
        const inactiveStyle = `
            text-zinc-400 
            border border-transparent
            hover:bg-black/30 hover:text-zinc-200 hover:border-t-white/10 hover:shadow-lg
        `;

        if (isActive) {
            return `${base} ${activeStyle}`;
        }
        
        return `${base} ${inactiveStyle}`;
    };

    async function createNewProj() {
        try {
            const token = localStorage.getItem('bearerToken');
            const res = await axios.post(BASE_URL + '/create-new-project', {
                ownerEmail: ownerEmail,
                projectName: "New project"
            }, {
                headers: {
                    'client_name': 'mapx', "Authorization": `Bearer ${token}`
                }
            })
            toast.success('New project created!!')
            navigate("/map/" + res.data.projectId)
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
        dispatch(setHeading(head))
    }

    const handleFeedbackSubmit = async () => {
        if (!feedback.trim()) return;

        try {
            const userId = localStorage.getItem("ownerEmail"); 

            if (!userId) {
            toast.error("User not logged in");
            return;
            }

            await saveFeedback({
            userId,
            feedback,
            });

            toast.success("Thanks for the feedback!");
            setFeedback("");

            // 🎉 Confetti stays exactly the same
            const myConfetti = confetti.create(null, {
            resize: true,
            useWorker: false,
            });

            const origin = { x: 0.08, y: 0.7 };
            const colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"];

            myConfetti({
            particleCount: 30,
            spread: 50,
            startVelocity: 20,
            origin,
            scalar: 0.8,
            shapes: ["circle", "square", drawChunkyRect],
            colors,
            gravity: 1.5,
            drift: 0.5,
            ticks: 150,
            });

            setTimeout(() => {
            myConfetti({
                particleCount: 8,
                spread: 70,
                startVelocity: 35,
                origin,
                scalar: 1.2,
                shapes: [drawLongStrip],
                colors,
                gravity: 2,
                drift: 1,
                flat: true,
                wobble: 15,
                ticks: 250,
            });
            }, 100);

        } catch (err) {
            console.error(err);
            toast.error(
            err.response?.data?.message || "Failed to submit feedback"
            );
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
        } catch (error) {
            console.log("Error loading profile", error);
        }
    };

    useEffect(() => {
        fetchProfile();
        if (location.pathname.includes("/myprojects")) dispatch(setHeading("My projects"));
        else if (location.pathname.includes("/recents")) dispatch(setHeading("Recents"));
        else if (location.pathname.includes("/sharedProjects")) dispatch(setHeading("Shared Projects"));
        else if (location.pathname.includes("/allProjects")) dispatch(setHeading("All Projects"));
    }, [location.pathname, dispatch, userId]);

    return (
        <div className='z-1 h-full'>
            {/* Sidebar Background: Zinc-900 */}
            <div className='w-[300px] bg-[#18181b]/90 h-full flex flex-col justify-between border-r border-black shadow-2xl rounded-4xl tracking-wide'>
                
                <div className="flex-1 overflow-y-auto no-scrollbar pt-8 pb-4">
                    
                    {/* Header */}
                    <div className="px-8 mb-8">
                        <h1 className="text-2xl text-zinc-100 tracking-wide drop-shadow-md" style={{ fontFamily: '"Potta One", cursive' }}>
                            Happy Dyno
                        </h1>
                    </div>

                    {/* Navigation Items */}
                    <div className="flex flex-col">
                        <div
                            onClick={createNewProj}
                            className={getNavItemClass(false)}
                        >
                            <img className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" src={plus} alt="Add" />
                            <span className="font-medium text-sm">New Project</span>
                        </div>

                        <NavLink onClick={() => handleClick("Recents")} to='/recents' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                            <img className='w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity' src={time} alt="Recents" />
                            <span className="font-medium text-sm">Recents</span>
                        </NavLink>

                        <NavLink onClick={() => handleClick("My Projects")} to='/myProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                            <img className='w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity' src={presentation} alt="My Projects" />
                            <span className="font-medium text-sm">My Projects</span>
                        </NavLink>

                        <NavLink onClick={() => handleClick("Shared Projects")} to='/sharedProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                            <img className='w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity' src={map} alt="Shared" />
                            <span className="font-medium text-sm">Shared Projects</span>
                        </NavLink>

                        <NavLink onClick={() => handleClick("All Projects")} to='/allProjects' className={({ isActive }) => getNavItemClass(isActive && !profileOpen)}>
                            <img className='w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity' src={folder} alt="All" />
                            <span className="font-medium text-sm">All Projects</span>
                        </NavLink>
                    </div>

                    <div className="my-4 border-t-2 border-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />

                    {/* Support */}
                    <div>
                        <p className='px-9 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600'>Support</p>
                        <a href='https://cal.com/sankalp-sadekar-mapx' target='_blank' rel="noreferrer">
                            <div className={getNavItemClass(false)}>
                                <img className='w-4 h-4 opacity-60 group-hover:opacity-100' src={calander} alt="Schedule" />
                                <span className="font-medium text-sm">Schedule Call</span>
                            </div>
                        </a>
                    </div>

                    {/* NEW FEEDBACK SECTION */}
                    <div className="mt-4 px-9">
                        <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full h-25 bg-black/20 text-zinc-300 text-[12px] rounded-lg p-2 outline-none resize-none border border-white/5 focus:border-white/10 transition-colors placeholder:text-zinc-600"
                            placeholder="Let’s make Dyno cool — share your thoughts! 🦕"
                            rows="3"
                        />
                        <button 
                            onClick={handleFeedbackSubmit}
                            className="mt-1 w-full py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200
                                     bg-black text-zinc-500 border border-zinc-800
                                     hover:bg-zinc-200 hover:text-black hover:border-zinc-200"
                        >
                            Submit
                        </button>
                    </div>

                </div>

                {/* Bottom Profile Widget */}
                <div className="p-4">
                    <div className="bg-black/30 rounded-[24px] p-4 border border-zinc-900 shadow-inner">
                        <div className="flex items-center gap-3 mb-4 pl-1">
                            <img className='h-10 w-10 object-cover rounded-full ring-2 ring-zinc-800' src={profilePictureUrl} alt="Profile" />
                            <div className='flex flex-col overflow-hidden'>
                                <p className='font-semibold text-sm text-zinc-300 truncate'>
                                    {userData ? userData.first_name : "User"}
                                </p>
                                <p className='text-[10px] text-zinc-500 truncate'>
                                    {email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setProfileOpen(!profileOpen)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium transition-all duration-200
                                ${profileOpen 
                                    ? 'bg-zinc-700 text-white border-t border-white/10 shadow-lg' 
                                    : 'bg-black text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                                }`}
                            >
                                <img className={`w-3.5 h-3.5 ${profileOpen ? 'invert' : 'opacity-60'} hover:opacity-100`} src={account} alt="" />
                                Settings
                            </button>

                            <button 
                                onClick={handleLogout}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-black text-zinc-500 hover:bg-red-900/20 hover:text-red-400 transition-all"
                                title="Logout"
                            >
                                <img className='w-3.5 h-3.5 opacity-70' src={logout} alt="Logout" />
                            </button>
                        </div>
                    </div>

                    {profileOpen && (
                        <div className="absolute bottom-4 left-[310px] z-50">
                            <Profile 
                                setProfileOpen={setProfileOpen} 
                                userId={userId} 
                                email={email} 
                                profilePictureUrl={profilePictureUrl}
                                userData={userData}
                                fetchProfile={fetchProfile}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Sidebar;