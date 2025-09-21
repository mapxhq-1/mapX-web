import { createSlice } from "@reduxjs/toolkit";
import allPolygonsData from "../data/polygons.json";

const initialState = {
  year: 2000,
  polygons: [],
  allPolygons: allPolygonsData
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
    }
  }
});

export const { setYear } = mapSlice.actions;
export default mapSlice.reducer;
