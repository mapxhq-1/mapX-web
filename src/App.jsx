import MainLayout from "./components/layout/MainLayout";
import DemoLayout from "./components/layout/DemoLayout";
import Projects from "./components/ProjectComponents/Projects";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Routes, Route, useLocation } from "react-router-dom"; // <-- Added useLocation
import { ToastContainer,Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/common/ProtectedRoute';

import './App.css'

// --- 1. CREATE A SMART ROOT ROUTE ---
const SmartHomeRoute = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  const code = params.get("code"); // Check if coming back from Pangea login
  const token = localStorage.getItem('bearerToken'); // Check if already logged in

  // If they have a token OR are in the middle of logging in (have a code),
  // send them to Projects so your existing auth logic can run!
  if (code || token) {
    return <Projects />;
  }

  // If they have no token and no code, they are a guest. Show the Demo!
  return <DemoLayout />;
};

export default function App() {
  const queryClient = new QueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Routes>
          {/* --- 2. USE THE SMART ROUTE FOR THE BASE URL --- */}
          <Route path="/" element={<SmartHomeRoute />} />

          {/* --- 3. EXISTING ROUTES --- */}
          <Route path="/*" element={<Projects />} />
          <Route path="/map/:id" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
        </Routes>
        <ToastContainer 
        draggable 
        theme="dark" 
        autoClose={500} 
        closeButton={false} 
        hideProgressBar={true} /* Removes the frantic 1-second timer line */
        transition={Slide}     /* Swaps the harsh Bounce for a smooth Slide */
        toastClassName="transparent-small-toast"
        />
      </QueryClientProvider>
    </>
  );
}