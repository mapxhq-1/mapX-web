import  { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import NewProjectCard from "./NewProjectCard";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { sharedProjApiCall,myProjApiCall } from "../../../store/projectSlice";
import GalaxyCanvas from "../../common/GalaxyCanvas";

const ProjectGrid = () => {
  const dispatch = useDispatch();
  const {ownerEmail,sharedProj, myProj, loadingMy, loadingShared, errorMy, errorShared, option, search, heading} = useSelector((state)=>state.project)

  const [sortedData, setSortedData] = useState([]);
  
  useEffect(()=>{
    if(ownerEmail){
      dispatch(myProjApiCall())
      dispatch(sharedProjApiCall())
    }
  },[dispatch,ownerEmail])

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
  
  // CRITICAL FIX: Filter out invalid entries and ensure valid dates
  newData = newData.filter(item => {
    if (!item || typeof item.projectName !== 'string') return false;
    
    // Ensure updatedAt is a valid string
    if (!item.updatedAt || typeof item.updatedAt !== 'string') {
      console.warn('Invalid updatedAt for project:', item);
      return false;
    }
    
    return true;
  });
  
  if (heading === "Recents" || option === "Date") {
    newData = newData.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  } else {
    newData = newData.sort((a, b) => 
      a.projectName.localeCompare(b.projectName)
    );
  }
  setSortedData(newData);
}, [option, sharedProj, myProj, heading]);

  if (loadingMy || loadingShared) 
    return (
      <>
        <div className="relative w-full h-screen overflow-hidden">
          {/* Galaxy background */}
          <GalaxyCanvas />
          <div className="relative grid gap-10 justify-center p-10 z-10">
            <h1 className="ml-30 text-xl text-green-500">
              Awesome Projects loading...
            </h1>
          </div>
        </div>
      </>
    );
  if (errorShared) {
    return (
      <>
        <div className="relative w-full h-vh overflow-hidden">
          {/* Galaxy background */}
          <GalaxyCanvas />
          <div className="relative grid gap-10 justify-center p-10 z-10">
            <h1 className="ml-30 text-xl text-red-500">{errorShared}</h1>
          </div>
        </div>
      </>
    );
  }
  if (errorMy) {
    return (
      <>
        <div className="relative w-full h-vh overflow-hidden">
          {/* Galaxy background */}
          <GalaxyCanvas />
          <div className="relative grid gap-10 justify-center p-10 z-10">
            <h1 className="ml-30 text-xl text-red-500">{errorMy}</h1>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="relative w-full h-full overflow-y-auto">
      {/* Galaxy background */}
      <GalaxyCanvas />

      {/* Grid above background */}
      <div className="relative grid grid-cols-4 auto-rows-min gap-10 justify-center p-10 z-10">
        <NewProjectCard />
        {sortedData.length == 0 ? (
          <div className="text-red-500 ">
            <p>No projects found</p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedData
              .filter((dat) =>
                dat.projectName.toLowerCase().includes(search.toLowerCase())
              )
              .map((data, ind) => (
                <motion.div
                  key={ind}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProjectCard data={data} key={data.id}/>
                </motion.div>
              ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ProjectGrid;
