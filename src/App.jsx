import MainLayout from "./components/layout/MainLayout";
import Projects from "./components/ProjectComponents/Projects";
import { Routes,Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css'
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/*" element={<Projects />}></Route>
        <Route path="/map/:id" element={<MainLayout />}></Route>
      </Routes>
      <ToastContainer />
    </>
  );
}
