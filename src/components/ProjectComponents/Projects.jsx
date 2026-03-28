// Projects.jsx
import Header from './Navigations/Header';
import Sidebar from './Navigations/Sidebar';
import { Routes, Route, Navigate } from "react-router-dom";
import ProjectGrid from './ProjectDisplay/ProjectGrid';
import CloneProjectPage from './ProjectDisplay/CloneProjectPage';
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { getUserInfo } from '../api/auth';
import { setEmail, setUserToken } from '../../store/projectSlice';
import { useDispatch } from 'react-redux';
import ShareAccept from './ProjectDisplay/ShareAccept';
import confetti from 'canvas-confetti'; // 1. Import the new exploder

const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    
    if (code) {
      getUserInfo(code)
        .then((data) => {
          const email = data.clientUserinfoResult.active_token.email;
          const token = data.clientUserinfoResult.active_token.identity;
          const bearer = data.clientUserinfoResult.active_token.token;
          
          dispatch(setUserToken(token));
          dispatch(setEmail(email));
          
          localStorage.setItem('ownerEmail', email);
          localStorage.setItem('userToken', token);
          localStorage.setItem('bearerToken', bearer);
          
          sessionStorage.setItem('justLoggedIn', 'true');

          navigate("/myProjects", { replace: true });
          setIsAuthReady(true);
        })
        .catch((err) => {
          console.error("Auth error:", err);
          window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
        });
    } else {
      const token = localStorage.getItem('bearerToken');
      
      if (!token) {
        window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
      } else {
        const savedEmail = localStorage.getItem('ownerEmail');
        const savedToken = localStorage.getItem('userToken');
        
        if (savedEmail && savedToken) {
          dispatch(setEmail(savedEmail));
          dispatch(setUserToken(savedToken));
        }

        if (sessionStorage.getItem('justLoggedIn') === 'true') {
          sessionStorage.removeItem('justLoggedIn');
          
          // Left cannon blast
          confetti({
            particleCount: 200,      // Increased amount for a fuller blast
            angle: 60,               // Aims it up and to the right
            spread: 110,             // WIDER spray angle (default was 60)
            origin: { x: 0, y: 0.6 },// Starts slightly lower to allow a higher arc
            startVelocity: 75,       // Shoots it much further across the screen
            shapes: ['square', 'circle'], // Mixes circles with the tumbling strips/lines
            scalar: 1.2,             // Makes the pieces slightly larger and more visible
            ticks: 100               // Lets them float a bit longer before disappearing
          });
          
          // Right cannon blast
          confetti({
            particleCount: 200,
            angle: 120,              // Aims it up and to the left
            spread: 90,             // WIDER spray angle
            origin: { x: 1, y: 0.6 },
            startVelocity: 75,       // Shoots it much further across the screen
            shapes: ['square', 'circle'],
            scalar: 1.2,
            ticks: 100
          });
        }

        setIsAuthReady(true);
      }
    }
  }, [dispatch, navigate, location.search]);

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Authenticating...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden py-2 pl-1 relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<Navigate to="myProjects" replace />} />
            <Route path="sharedProjects" element={<ProjectGrid />} />
            <Route path="myProjects" element={<ProjectGrid />} />
            <Route path="allProjects" element={<ProjectGrid />} />
            <Route path="recents" element={<ProjectGrid />} />
            <Route path="clone/:projectId" element={<CloneProjectPage />} />
            <Route path="/share/:projectId" element={<ShareAccept />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default Projects;