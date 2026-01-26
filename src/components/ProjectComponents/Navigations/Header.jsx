import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowUpDown, Check, Plus } from 'lucide-react';
import { setSearch, setOption } from '../../../store/projectSlice';

const Header = () => {
  // --- Redux & Header Logic ---
  const { search, option } = useSelector((state) => state.project);
  const dispatch = useDispatch();
  const [sort, setSort] = useState(false);
  const dropDown = useRef(null);

  // --- New Project Button Logic (Unchanged) ---
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const stackedStyle = `
    bg-zinc-900 hover:bg-zinc-800
    border-t-2 border-white/10 border-b-0 border-r-1
    shadow-[0_2px_10px_rgba(0,0,0,0.3)]
    text-zinc-400 hover:text-zinc-200
    transition-all duration-200 ease-in-out
  `;

  return (
    <div className="flex items-center justify-between px-6 py-4 w-full z-10 relative  ml-0.5 rounded-b-2xl">
      
      {/* --- LEFT SIDE: New Project (Unchanged) --- */}
      <div>
        <button
          ref={btnRef}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          onMouseMove={handleMove}
          style={{
            "--mx": `${spot.x}px`,
            "--my": `${spot.y}px`,
          }}
          className="
            relative group overflow-hidden rounded-full
            px-6 py-2.5 
            border border-white/10
            bg-gradient-to-b from-white/10 to-white/5
            text-white
            transition-all duration-300
            shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_10px_rgba(0,0,0,0.55)]
            hover:-translate-y-[1px]
            hover:border-white/20
            hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.65)]
            active:translate-y-[0px]
            active:scale-[0.98]
            focus:outline-none
          "
        >
          {/* Spotlight Effects */}
          <span
            className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${isHover ? "opacity-100" : "opacity-0"}`}
            style={{
              background: `radial-gradient(120px circle at var(--mx) var(--my), rgba(178, 255, 137, 0.25), rgba(178, 255, 137, 0.12) 35%, rgba(0, 0, 0, 0) 70%)`,
              filter: "blur(10px)",
            }}
          />
          <span
            className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${isHover ? "opacity-100" : "opacity-0"}`}
            style={{
              background: `radial-gradient(60px circle at var(--mx) var(--my), rgba(178, 255, 137, 0.35), rgba(178, 255, 137, 0.10) 55%, rgba(0, 0, 0, 0) 75%)`,
              filter: "blur(6px)",
              mixBlendMode: "screen",
            }}
          />
          <span
            className={`pointer-events-none absolute left-0 right-0 bottom-0 h-1/2 transition-opacity duration-300 ${isHover ? "opacity-100" : "opacity-0"}`}
            style={{
              background: "linear-gradient(to top, rgba(178,255,137,0.55), rgba(178,255,137,0.18), rgba(0,0,0,0))",
              filter: "blur(18px)",
            }}
          />
          <span
            className={`pointer-events-none absolute -left-[60%] top-[-30%] h-[160%] w-[60%] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-md rotate-[18deg] transition-all ease-out ${isHover ? "opacity-100 translate-x-[260%]" : "opacity-0 translate-x-0"}`}
            style={{ transitionDuration: "650ms" }}
          />
          <span
            className={`pointer-events-none absolute inset-x-4 top-[1px] h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-opacity duration-300 ${isHover ? "opacity-70" : "opacity-40"}`}
          />

          <span className="relative z-10 flex items-center justify-center gap-2">
            <Plus size={16} className="opacity-90 group-hover:opacity-100" />
            <span className="text-sm font-semibold tracking-widest uppercase">
              New Project
            </span>
          </span>
        </button>
      </div>

      {/* --- RIGHT SIDE: Sort & Search --- */}
      <div className="flex items-center gap-4">
        
        {/* Sort Dropdown */}
        <div className="relative" ref={dropDown}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSort(!sort)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full ${stackedStyle} ${sort ? 'text-zinc-200 bg-zinc-800' : ''}`}
          >
            <ArrowUpDown size={16} className="opacity-80" />
            <span className="text-sm font-normal">
              Sort by: <span className="font-medium text-zinc-300">{option}</span>
            </span>
          </motion.button>

          <AnimatePresence>
            {sort && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 5, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                // Popup Container: zinc-900 background, Top Border Only
                className="absolute right-0 w-48 p-2 bg-zinc-900 border-t border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col gap-1"
              >
                {['Alphabetical', 'Date'].map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSortButton(item)}
                    // Items: zinc-700 for selected (lighter), zinc-800 for hover
                    className={`
                      flex w-full items-center justify-between px-4 py-2.5 rounded-full text-sm transition-all duration-200
                      ${
                        option === item
                          ? 'bg-zinc-700 text-white shadow-sm' 
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }
                    `}
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
        <div className="relative group">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Search size={16} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </div>
          
          <input 
            type="text" 
            value={search} 
            onChange={(e) => dispatch(setSearch(e.target.value))} 
            className={`
              pl-10 pr-5 py-2.5 rounded-full text-sm font-normal
              ${stackedStyle}
              placeholder:text-zinc-600
              focus:outline-none focus:text-white focus:bg-zinc-800 focus:border-t-white/20
              w-[200px] focus:w-[240px]
            `}
            placeholder="Search..." 
          />
        </div>

      </div>
    </div>
  );
}

export default Header;