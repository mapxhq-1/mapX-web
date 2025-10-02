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
  hyperlinkOpen: false,
  currentHyperlink:null,
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
    },
    closeImages: (state) => {
      state.imageOpen = false;
      state.currentImage = null;
    },
    openHyperlink: (state, action) => {
      state.hyperlinkOpen = true;
      state.currentHyperlink = action.payload;
    },
    closeHyperlink: (state) => {
      state.hyperlinkOpen = false;
      state.currentHyperlink = null;
    },
  }
});

export const { setYear, openNotes, closeNotes,openImages,closeImages,openHyperlink,closeHyperlink } = mapSlice.actions;
export default mapSlice.reducer;
