import Header from './Navigations/Header'
import Sidebar from './Navigations/Sidebar'
import { Routes, Route, Navigate } from "react-router-dom";
import ProjectGrid from './ProjectDisplay/ProjectGrid';
import CloneProjectPage from './ProjectDisplay/CloneProjectPage'
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from 'react';
import { getUserInfo } from '../api/auth';
import { setEmail, setUserToken } from '../../store/projectSlice';
const Projects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (code) {
      console.log("Pangea login code:", code);
      
      // Exchange the code with your backend for tokens
      getUserInfo(code)
        .then((data) => {
          console.log("Received user info:", data);
          setEmail(data.clientUserinfoResult.active_token.email);
          setUserToken(data.clientUserinfoResult.active_token.identity);
          // You can store tokens if your API returns them
          
          // if (data.result?.accessToken) {
          //   localStorage.setItem("accessToken", data.result.accessToken);
          // }
          // if (data.result?.refreshToken) {
          //   localStorage.setItem("refreshToken", data.result.refreshToken);
          // }

          navigate("/projects/myProjects", { replace: true });
        })
        .catch((err) => {
          console.error("Auth error:", err);
        });
    }
  }, [location]);
  return (
    <>
    <div className='h-screen flex flex-col'>
      <Header/>

      <div className='flex flex-1 overflow-hidden'>

        <Sidebar />

        <Routes>
          <Route index element={<Navigate to='myProjects' replace/>}></Route>
          <Route path='/sharedProjects' element={<ProjectGrid />}></Route>
          <Route path='/myProjects' element={<ProjectGrid/>}></Route>
          <Route path='/allProjects' element={<ProjectGrid />}></Route>
          <Route path='/recents' element={<ProjectGrid />}></Route>
          <Route path='/clone/:projectId' element={<CloneProjectPage/>}></Route>
        </Routes>

      </div>
    </div>
    </>
  )
}

export default Projects