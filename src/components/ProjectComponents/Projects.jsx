import Header from './Navigations/Header'
import Sidebar from './Navigations/Sidebar'
import { Routes, Route, Navigate } from "react-router-dom";
import ProjectGrid from './ProjectDisplay/ProjectGrid';

const Projects = () => {

  return (
    <>
    <div>
      <Header/>

      <div className='flex'>

        <Sidebar />

        <Routes>
          <Route index element={<Navigate to='myProjects' replace/>}></Route>
          <Route path='/sharedProjects' element={<ProjectGrid />}></Route>
          <Route path='/myProjects' element={<ProjectGrid/>}></Route>
          <Route path='/allProjects' element={<ProjectGrid />}></Route>
          <Route path='/recents' element={<ProjectGrid />}></Route>
        </Routes>

      </div>
    </div>
    </>
  )
}

export default Projects