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
      state.polygons = state.allPolygons[action.payload] || [];
    }
  }
});

export const { setYear } = mapSlice.actions;
export default mapSlice.reducer;
