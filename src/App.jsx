import MainLayout from "./components/layout/MainLayout";
import Projects from "./components/ProjectComponents/Projects";
//redeploy
import {QueryClient,QueryClientProvider} from "@tanstack/react-query"
import { Routes,Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/common/ProtectedRoute';

import './App.css'
export default function App() {
  const queryClient = new QueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/*" element={<Projects />}></Route>
          <Route path="/map/:id" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}></Route>
        </Routes>
        <ToastContainer draggable theme="dark"/>
      </QueryClientProvider>
    </>
  );
}
