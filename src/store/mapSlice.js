import { createSlice } from "@reduxjs/toolkit";
import allPolygonsData from "../data/polygons.json";

const initialState = {
  year: 2000,
  polygons: [],
  allPolygons: allPolygonsData,
  notesOpen: false,
  currentNote: null
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
    }
  }
});

export const { setYear, openNotes, closeNotes } = mapSlice.actions;
export default mapSlice.reducer;
