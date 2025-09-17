import { createSlice } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const myProjApiCall = createAsyncThunk(
  "project/myProjApiCall",
  async (_, { rejectWithValue, getState }) => {
    try {
      const res = await axios.get(
        "/project-management-service/get-all-projects-of-owner",
        {
          params: {
            ownerEmail: getState().project.ownerEmail,
          },
          headers:{
            client_name : "mapx",
          }
        }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          err.response?.statusText ||
          "Server Error"
      );
    }
  }
);

export const sharedProjApiCall = createAsyncThunk(
  "project/sharedProjApiCall",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await axios.get(
        "/project-management-service/get-all-accessible-projects",
        {
          params: {
            email: getState().project.ownerEmail,
          },
          headers:{
            client_name : "mapx",
          }
        }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response.data.message || err.response?.statusText || "Server Error"
      );
    }
  }
);

export const projectSlice = createSlice({
  name: "project",
  initialState: {
    sharedProj: [],
    myProj: [],
    errorMy: "",
    errorShared: "",
    loadingMy: true,
    loadingShared: true,
    ownerEmail: "slayer@gmail.com",
    option: "Alphabetical",
    search: "",
    heading: "My Projects",
  },
  reducers: {
    setOption:(state,action)=>{
      state.option = action.payload;
    },
    setSearch:(state,action)=>{
      state.search = action.payload;
    },
    setHeading:(state,action)=>{
      state.heading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(myProjApiCall.pending, (state) => {
      state.loadingMy = true;
      state.errorMy = "";
    });
    builder.addCase(myProjApiCall.rejected, (state, action) => {
      state.errorMy = action.payload;
      state.loadingMy = false;
    });
    builder.addCase(myProjApiCall.fulfilled, (state, action) => {
      state.myProj = action.payload;
      state.loadingMy = false;
    });
    builder.addCase(sharedProjApiCall.pending, (state) => {
      state.errorMy = "";
      state.loadingShared = false;
    });
    builder.addCase(sharedProjApiCall.rejected, (state, action) => {
      state.errorShared = action.payload;
      state.loadingShared = false;
    });
    builder.addCase(sharedProjApiCall.fulfilled, (state, action) => {
      state.sharedProj = action.payload;
      state.loadingShared = false;
    });
  },
});

export const { setSearch, setOption, setHeading } = projectSlice.actions;

export default projectSlice.reducer;
