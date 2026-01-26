// Projects.jsx - Add auth check AND code handling here
import Header from './Navigations/Header'
import Sidebar from './Navigations/Sidebar'
import { Routes, Route, Navigate } from "react-router-dom";
import ProjectGrid from './ProjectDisplay/ProjectGrid';
import CloneProjectPage from './ProjectDisplay/CloneProjectPage'
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { getUserInfo } from '../api/auth';
import { setEmail, setUserToken } from '../../store/projectSlice';
import { useDispatch } from 'react-redux';
import ShareAccept from './ProjectDisplay/ShareAccept';

const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Handle OAuth callback with code parameter FIRST
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    
    if (code) {
      // Exchange the code with your backend for tokens
      getUserInfo(code)
        .then((data) => {
          const email = data.clientUserinfoResult.active_token.email;
          const token = data.clientUserinfoResult.active_token.identity;
          const bearer = data.clientUserinfoResult.active_token.token;
          
          // Update Redux state
          dispatch(setUserToken(token));
          dispatch(setEmail(email));
          
          // Save to localStorage for persistence
          localStorage.setItem('ownerEmail', email);
          localStorage.setItem('userToken', token);
          localStorage.setItem('bearerToken', bearer);
          
          // Navigate to projects page and mark auth as ready
          navigate("/myProjects", { replace: true });
          setIsAuthReady(true);
        })
        .catch((err) => {
          console.error("Auth error:", err);
          window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
        });
    } else {
      // No code, check for existing token
      const token = localStorage.getItem('bearerToken');
      
      if (!token) {
        window.location.href = import.meta.env.VITE_PANGEA_AUTH_URL;
      } else {
        // Load saved data from localStorage
        const savedEmail = localStorage.getItem('ownerEmail');
        const savedToken = localStorage.getItem('userToken');
        
        if (savedEmail && savedToken) {
          dispatch(setEmail(savedEmail));
          dispatch(setUserToken(savedToken));
        }
        setIsAuthReady(true);
      }
    }
  }, [dispatch, navigate, location.search]);

  // Show loading while checking auth
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Authenticating...</div>
      </div>
    );
  }

return (
  <div className="h-screen flex overflow-hidden py-2 pl-1">
    <Sidebar />

    <div className="flex flex-col flex-1 overflow-hidden">
      <Header />

      {/* Page content area */}
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

export default Projects