import { createSlice } from "@reduxjs/toolkit";
import allPolygonsData from "../data/polygons.json";

const initialState = {
  year: 2000,
  polygons: [],
  allPolygons: allPolygonsData,
  notesOpen: false,
  currentNote: null,
  imageOpen: false,
  currentImage:null,
  imageMode: 'view', // 'view' or 'edit'
  hyperlinkOpen: false,
  currentHyperlink:null,
  hyperlinkMode: 'view', // 'view' or 'edit'
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setYear: (state, action) => {
      state.year = action.payload;
      // Handle both string and number keys, and provide fallback for missing years
      const yearKey = action.payload.toString();
      state.polygons = state.allPolygons[yearKey] || [];
    },
    openNotes: (state, action) => {
      state.notesOpen = true;
      state.currentNote = action.payload;
    },
    closeNotes: (state) => {
      state.notesOpen = false;
      state.currentNote = null;
    },
    openImages: (state, action) => {
      state.imageOpen = true;
      state.currentImage = action.payload;
      state.imageMode = action.payload.mode || 'view';
    },
    closeImages: (state) => {
      state.imageOpen = false;
      state.currentImage = null;
      state.imageMode = 'view';
    },
    setImageMode: (state, action) => {
      state.imageMode = action.payload;
    },
    openHyperlink: (state, action) => {
      state.hyperlinkOpen = true;
      state.currentHyperlink = action.payload;
      state.hyperlinkMode = action.payload.mode || 'view';
    },
    closeHyperlink: (state) => {
      state.hyperlinkOpen = false;
      state.currentHyperlink = null;
      state.hyperlinkMode = 'view';
    },
    setHyperlinkMode: (state, action) => {
      state.hyperlinkMode = action.payload;
    },
  }
});

export const { setYear, openNotes, closeNotes,openImages,closeImages,setImageMode,openHyperlink,closeHyperlink,setHyperlinkMode } = mapSlice.actions;
export default mapSlice.reducer;
