import React, { useState } from "react";
import { Box, Paper, Typography, Divider } from "@mui/material";
import MapView from "./components/map/MapView";
import Timeline from "./components/timeline/Timeline";
import MainLayout from "./components/layout/MainLayout";
import Projects from "./components/ProjectComponents/Projects";
import { Routes,Route } from "react-router-dom";
import './app.css'
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/Projects/*" element={<Projects />}></Route>
        <Route path="/" element={<MainLayout />}></Route>
      </Routes>
    </>
  );
}
