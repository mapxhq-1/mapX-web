import React, { useEffect, useRef, useState } from "react";
import ProjectCard from "./ProjectCard";
import NewProjectCard from "./NewProjectCard";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { sharedProjApiCall,myProjApiCall } from "../../../store/projectSlice";
const ProjectGrid = () => {
  const dispatch = useDispatch();
  const {sharedProj, myProj, loadingMy, loadingShared, errorMy, errorShared, option, search, heading} = useSelector((state)=>state.project)

  const canvasRef = useRef(null);
  const stars = useRef([]);
  const mouse = useRef({ x: null, y: null });
  const [sortedData, setSortedData] = useState([]);

  useEffect(()=>{
    dispatch(myProjApiCall())
    dispatch(sharedProjApiCall())
  },[dispatch])

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const createStars = () =>
      Array.from({ length: 200 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.5,
        baseDx: (Math.random() - 0.5) * 0.18, // balanced drift
        baseDy: (Math.random() - 0.5) * 0.18,
        vx: 0,
        vy: 0,
        opacity: Math.random() * 0.6 + 0.4, // never too dim
        flickerSpeed: Math.random() * 0.008 + 0.002, // slower flicker
      }));

    stars.current = createStars();

    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.current.forEach((star) => {
        // Gentle twinkle
        star.opacity += star.flickerSpeed;
        if (star.opacity > 1) {
          star.opacity = 1;
          star.flickerSpeed *= -1;
        }
        if (star.opacity < 0.4) {
          star.opacity = 0.4;
          star.flickerSpeed *= -1;
        }

        // Mouse repulsion
        if (mouse.current.x && mouse.current.y) {
          const dx = star.x - mouse.current.x;
          const dy = star.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const minDist = 130;
          if (dist < minDist) {
            const force = (minDist - dist) / minDist;
            const angle = Math.atan2(dy, dx);
            star.vx += Math.cos(angle) * force * 0.1; // softer push
            star.vy += Math.sin(angle) * force * 0.1;
          }
        }

        // Constant drift
        star.vx += star.baseDx * 0.02;
        star.vy += star.baseDy * 0.02;

        // Move with damping
        star.x += star.vx;
        star.y += star.vy;
        star.vx *= 0.95;
        star.vy *= 0.95;

        // Wrap edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  useEffect(() => {
    let newData;
    if(heading === "My Projects"){
      newData = [ ...myProj];
    }else if(heading === "Shared Projects"){
      newData = [...sharedProj];
    }else{
      newData = [...sharedProj, ...myProj];
    }
    if (heading==="Recents" || option === "Date") {
      newData = newData.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } else{
      newData = newData.sort((a, b) => a.projectName.localeCompare(b.projectName));
    }
    setSortedData(newData);
  }, [option, sharedProj, myProj, heading]);

  if (
    (myProj != undefined && loadingMy) ||
    (sharedProj != undefined && loadingShared)
  )
    return (
      <>
        <div className="relative w-full h-screen overflow-hidden">
          {/* Starry background */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          <div className="relative grid gap-10 justify-center p-10 z-10">
            <h1 className="ml-30 text-xl text-green-500">
              Awsome Projects loading...
            </h1>
          </div>
        </div>
      </>
    );
  if (errorShared) {
    return (
      <>
        <div className="relative w-full h-vh overflow-hidden">
          {/* Starry background */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
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
          {/* Starry background */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          <div className="relative grid gap-10 justify-center p-10 z-10">
            <h1 className="ml-30 text-xl text-red-500">{errorMy}</h1>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="relative w-full h-vh overflow-hidden">
      {/* Starry background */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

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
                  <ProjectCard data={data} />
                </motion.div>
              ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ProjectGrid;
