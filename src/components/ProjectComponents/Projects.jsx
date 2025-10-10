import Header from './Navigations/Header'
import Sidebar from './Navigations/Sidebar'
import { Routes, Route, Navigate } from "react-router-dom";
import ProjectGrid from './ProjectDisplay/ProjectGrid';
import CloneProjectPage from './ProjectDisplay/CloneProjectPage'
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from 'react';
import { getUserInfo } from '../api/auth';
import { setEmail, setUserToken } from '../../store/projectSlice';
import { useDispatch } from 'react-redux';

const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Load saved auth data from localStorage on mount (runs on every refresh)
  useEffect(() => {
    const savedEmail = localStorage.getItem('ownerEmail');
    const savedToken = localStorage.getItem('userToken');
    
    if (savedEmail && savedToken) {
      dispatch(setEmail(savedEmail));
      dispatch(setUserToken(savedToken));
    }
  }, [dispatch]);

  // Handle OAuth callback with code parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    
    if (code) {
      
      // Exchange the code with your backend for tokens
      getUserInfo(code)
        .then((data) => {
          
          const email = data.clientUserinfoResult.active_token.email;
          const token = data.clientUserinfoResult.active_token.identity;
          
          // Update Redux state
          dispatch(setUserToken(token));
          dispatch(setEmail(email));
          
          // Save to localStorage for persistence
          localStorage.setItem('ownerEmail', email);
          localStorage.setItem('userToken', token);
          
          // Navigate to projects page
          navigate("/myProjects", { replace: true });
        })
        .catch((err) => {
          console.error("Auth error:", err);
        });
    }
  }, [dispatch, navigate, location.search]);

  return (
    <>
      <div className='h-screen flex flex-col'>
        <Header />

        <div className='flex flex-1 overflow-hidden'>
          <Sidebar />

          <Routes>
            <Route index element={<Navigate to="myProjects" replace />} />
            <Route path="sharedProjects" element={<ProjectGrid />} />
            <Route path="myProjects" element={<ProjectGrid />} />
            <Route path="allProjects" element={<ProjectGrid />} />
            <Route path="recents" element={<ProjectGrid />} />
            <Route path="clone/:projectId" element={<CloneProjectPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

export default Projects