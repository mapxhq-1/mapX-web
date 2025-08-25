import { configureStore } from "@reduxjs/toolkit";
import mapReducer from "./mapSlice";
import projectReducer from './projectSlice'
export const store = configureStore({
  reducer: {
    map: mapReducer,
    project : projectReducer,
  },
});