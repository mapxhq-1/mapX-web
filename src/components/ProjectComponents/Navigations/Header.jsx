import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowUpDown, Check, Plus } from 'lucide-react';
import { setSearch, setOption } from '../../../store/projectSlice';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";
  const { ownerEmail } = useSelector((state) => state.project);
  const navigate = useNavigate();
  
  const { search, option } = useSelector((state) => state.project);
  const dispatch = useDispatch();
  const [sort, setSort] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false); 
  const dropDown = useRef(null);

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

  async function createNewProj() {
    try {
      const token = localStorage.getItem('bearerToken');
      const res = await axios.post(BASE_URL + '/create-new-project', {
        ownerEmail: ownerEmail,
        projectName: "New project"
      }, {
        headers: { 'client_name': 'mapx', "Authorization": `Bearer ${token}` }
      })
      toast.success('New project created!!')
      navigate("/map/" + res.data.projectId)
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating project")
    }
  }

  const handleSortButton = (givenOption) => {
    dispatch(setOption(givenOption));
    setSort(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropDown.current && !dropDown.current.contains(event.target)) {
        setSort(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const stackedStyle = `
    bg-zinc-900 hover:bg-zinc-800
    border-t-2 border-white/10 border-b-0 border-r-1
    shadow-[0_2px_10px_rgba(0,0,0,0.3)]
    text-zinc-400 hover:text-zinc-200
    transition-all duration-300 ease-in-out
  `;

  return (
    // UPDATED: 'md:flex-row' -> 'lg:flex-row', 'pl-14 md:pl-6' -> 'pl-14 lg:pl-6'
    // This keeps the column layout and larger left padding (for the hamburger) on mobile landscape.
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-6 pl-14 lg:pl-6 py-4 w-full z-10 relative ml-0.5 rounded-b-2xl gap-4 lg:gap-0">
      
      {/* --- LEFT SIDE: New Project --- */}
      {/* UPDATED: 'md:w-auto' -> 'lg:w-auto' */}
      <div className="w-full lg:w-auto">
        <button
          ref={btnRef}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          onMouseMove={handleMove}
          style={{ "--mx": `${spot.x}px`, "--my": `${spot.y}px` }}
          onClick={createNewProj}
          className="
            relative group overflow-hidden rounded-full
            px-4 lg:px-6 py-2 lg:py-2.5 
            border border-white/10
            bg-gradient-to-b from-white/10 to-white/5
            text-white transition-all duration-300
            shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_10px_rgba(0,0,0,0.55)]
            hover:-translate-y-[1px]
            active:scale-[0.98]
            focus:outline-none
          "
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${isHover ? "opacity-100" : "opacity-0"}`}
                                    style={{ background: `radial-gradient(120px circle at var(--mx) var(--my), rgba(178, 255, 137, 0.40), rgba(178, 255, 137, 0.30) 35%, rgba(0, 0, 0, 0) 70%)`, filter: "blur(10px)" }}
                                />
            <Plus size={16} className="opacity-90" />
            {/* UPDATED: 'md:text-sm' -> 'lg:text-sm' */}
            <span className="text-[10px] lg:text-sm font-semibold tracking-widest uppercase truncate">
              New Project
            </span>
          </span>
        </button>
      </div>

      {/* --- RIGHT SIDE: Sort & Search (Side-by-Side) --- */}
      {/* UPDATED: 'md:w-auto' -> 'lg:w-auto' */}
      <div className="flex flex-row items-center gap-2 w-full lg:w-auto">
        
        {/* Sort Dropdown */}
        <div 
          className={`relative transition-all duration-300 ease-in-out
            ${isSearchFocused 
              // UPDATED: 'sm:' breakpoints -> 'lg:'
              ? 'w-[48px] flex-none lg:w-auto lg:flex-none' 
              : 'flex-1 lg:flex-none lg:w-[180px]' 
            }`} 
          ref={dropDown}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSort(!sort)}
            // UPDATED: 'sm:px-5', 'sm:justify-start' -> 'lg:px-5', 'lg:justify-start'
            className={`w-full flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-5 py-2.5 rounded-full ${stackedStyle} ${sort ? 'text-zinc-200 bg-zinc-800' : ''}`}
          >
            <ArrowUpDown size={16} className="opacity-80 shrink-0" />
            {/* UPDATED: 'sm:text-sm', 'sm:inline' -> 'lg:text-sm', 'lg:inline' */}
            <span className={`text-xs lg:text-sm font-normal whitespace-nowrap ${isSearchFocused ? 'hidden lg:inline' : 'inline'}`}>
              Sort: <span className="font-medium text-zinc-300">{option}</span>
            </span>
          </motion.button>

          <AnimatePresence>
            {sort && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 5, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 w-48 p-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col gap-1"
              >
                {['Alphabetical', 'Date'].map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSortButton(item)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 rounded-full text-sm transition-all duration-200 ${option === item ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    {item}
                    {option === item && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Bar */}
        <div 
          className={`relative group transition-all duration-300 ease-in-out
            ${isSearchFocused 
              // UPDATED: 'sm:' breakpoints -> 'lg:'
              ? 'flex-[3] lg:flex-none lg:w-[240px]' 
              : 'flex-1 lg:flex-none lg:w-[180px]' 
            }`}
        >
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Search size={16} className="text-zinc-400 group-hover:text-zinc-200" />
          </div>
          
          <input 
            type="text" 
            value={search}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => dispatch(setSearch(e.target.value))} 
            className={`
              pl-10 pr-5 py-2.5 rounded-full text-xs lg:text-sm font-normal w-full
              ${stackedStyle}
              placeholder:text-zinc-600
              focus:outline-none focus:text-white focus:bg-zinc-800
            `}
            placeholder="Search..." 
          />
        </div>

      </div>
    </div>
  );
}

export default Header;