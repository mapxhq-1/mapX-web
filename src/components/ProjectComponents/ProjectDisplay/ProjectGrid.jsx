import { useEffect, useState, useMemo } from "react";
import ProjectCard from "./ProjectCard";
import NewProjectCard from "./NewProjectCard";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { sharedProjApiCall, myProjApiCall, setEmail, setUserToken } from "../../../store/projectSlice";
import GalaxyCanvas from "../../common/GalaxyCanvas";

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      when: "beforeChildren",
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 12 }
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

const ProjectGrid = () => {
  const dispatch = useDispatch();
  const { ownerEmail, sharedProj, myProj, loadingMy, loadingShared, errorMy, errorShared, option, search, heading } = useSelector((state) => state.project);

  const [sortedData, setSortedData] = useState([]);

  useEffect(() => {
    if (ownerEmail) {
      dispatch(myProjApiCall());
      dispatch(sharedProjApiCall());
    }
  }, [dispatch, ownerEmail]);

  useEffect(() => {
    let newData;
    if (heading === "My Projects") {
      newData = Array.isArray(myProj) ? [...myProj] : [];
    } else if (heading === "Shared Projects") {
      newData = Array.isArray(sharedProj) ? [...sharedProj] : [];
    } else {
      newData = [
        ...(Array.isArray(sharedProj) ? sharedProj : []),
        ...(Array.isArray(myProj) ? myProj : []),
      ];
    }

    // Convert timestamps and filter invalid
    newData = newData.map((item) => ({
      ...item,
      updatedAt: typeof item.updatedAt === "number" ? new Date(item.updatedAt * 1000).toISOString() : item.updatedAt,
      createdAt: typeof item.createdAt === "number" ? new Date(item.createdAt * 1000).toISOString() : item.createdAt,
    })).filter((item) => item && typeof item.projectName === "string" && item.updatedAt);

    // Sorting
    if (heading === "Recents" || option === "Date") {
      newData = newData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else {
      newData = newData.sort((a, b) => a.projectName.localeCompare(b.projectName));
    }
    setSortedData(newData);
  }, [option, sharedProj, myProj, heading]);

  // Filter based on Search
  const filteredData = useMemo(() => {
    return sortedData.filter((dat) => dat.projectName.toLowerCase().includes(search.toLowerCase()));
  }, [sortedData, search]);

  function handleLogout() {
          localStorage.removeItem('ownerEmail');
          localStorage.removeItem('userToken');
          localStorage.removeItem('bearerToken');
          dispatch(setEmail(''));
          dispatch(setUserToken(''));
          window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
      }

  // --- Loading State ---
  if (loadingMy || loadingShared) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <GalaxyCanvas />
        </div>
        <div className="z-10 bg-black/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/5 shadow-2xl">
          <h1 className="text-xl text-emerald-400 font-light tracking-widest animate-pulse uppercase">
            Loading Projects...
          </h1>
        </div>
      </div>
    );
  }

if (errorShared || errorMy) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GalaxyCanvas />
      </div>

      <div className="z-10 w-[90%] max-w-md bg-red-950/30 backdrop-blur-xl px-8 py-7 rounded-2xl border border-red-500/20 shadow-2xl text-center">
        
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
            />
          </svg>
        </div>

        <h1 className="text-xl text-red-200 font-semibold tracking-wide mb-2">
          Session Expired
        </h1>

        <p className="text-red-300/70 text-sm mb-6">
          {errorShared || errorMy}
        </p>

        <button
          onClick={handleLogout}
          className="group w-full py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 font-medium tracking-wide transition-all duration-300 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98]"
        >
          <span className="flex items-center justify-center gap-2">
            Logout & Re-Login

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7"
              />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="relative w-full h-full">
      
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <GalaxyCanvas />
      </div>

      {sortedData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
             <NewProjectCard />
          </div>
      ) : (
        /* 1. Added flex & justify-center to the scroll container 
           2. Set a max-width on the motion.div to prevent cards from spreading too far on giant screens
        */
        <div className="w-full h-full overflow-y-auto overflow-x-hidden p-6 lg:p-12 flex justify-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-7xl h-fit"
          >
            <AnimatePresence mode="popLayout">
              {filteredData.length > 0 ? (
                filteredData.map((data) => (
                  <motion.div
                    key={data.id || data._id} 
                    layout 
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    /* Ensure the wrapper takes full track width */
                    className="w-full flex justify-center"
                  >
                    <ProjectCard data={data} />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="col-span-full flex flex-col items-center mt-20"
                >
                  <p className="text-zinc-500 text-lg font-light">No matches found for "{search}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProjectGrid;