import { createSlice } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_URL_PROJECT + "/project-management-service";

export const myProjApiCall = createAsyncThunk(
  "project/myProjApiCall",
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = localStorage.getItem('bearerToken');
      const res = await axios.get(
        BASE_URL+"/get-all-projects-of-owner",
        {
          params: {
            ownerEmail: getState().project.ownerEmail,
          },
          headers: {
            'client_name': 'mapx', "Authorization": `Bearer ${token}`
          }
        }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          err.response?.statusText ||
          "Can't reach server. Please check your network!!"
      );
    }
  }
);

export const sharedProjApiCall = createAsyncThunk(
  "project/sharedProjApiCall",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = localStorage.getItem('bearerToken');
      const res = await axios.get(
        BASE_URL+"/get-all-accessible-projects",
        {
          params: {
            email: getState().project.ownerEmail,
          },
          headers: {
            'client_name': 'mapx', "Authorization": `Bearer ${token}`
          }
        }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.statusText || "Can't reach server. Please check your network!!"
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
    ownerEmail: "",
    option: "Alphabetical",
    search: "",
    heading: "My Projects",
    userToken:"",
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
    setEmail:(state,action)=>{
      state.ownerEmail = action.payload;
    },
    setUserToken:(state,action)=>{
      state.userToken = action.payload;
    }
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
      state.errorShared = "";
      state.loadingShared = true;
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

export const { setSearch, setOption, setHeading, setEmail,setUserToken } = projectSlice.actions;

export default projectSlice.reducer;
