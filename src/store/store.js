import { configureStore } from "@reduxjs/toolkit";
import mapReducer from "./mapSlice";
import projectReducer from './projectSlice'
import layerReducer from './layerSlice'
export const store = configureStore({
  reducer: {
    map: mapReducer,
    project : projectReducer,
    layers : layerReducer
  },
});