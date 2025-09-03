import MainLayout from "./components/layout/MainLayout";
import Projects from "./components/ProjectComponents/Projects";
import { Routes,Route } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';

import './app.css'
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/Projects/*" element={<Projects />}></Route>
        <Route path="/" element={<MainLayout />}></Route>
      </Routes>
      <ToastContainer />
    </>
  );
}
