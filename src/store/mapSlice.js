import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loadEmpiresByYearCached } from "../utils/dataManager";

const initialState = {
  year: 2000,
  polygons: [], // Now simply populated whenever the year changes
  flyToPosition: null,
  markers: [],
  notesOpen: false,
  currentNote: null,
  imageOpen: false,
  currentImage: null,
  imageMode: "view",
  hyperlinkOpen: false,
  currentHyperlink: null,
  hyperlinkMode: "view",
  loading: false,
  error: null,
};

export const fetchAllEmpirePolygons = createAsyncThunk(
  "map/fetchAllEmpirePolygons",
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const year = state.map.year;
      // Fetch exactly what is needed for this year
      //Force Fetch the Data ->  Change boolean to false to turn on the caching and true to turn off the caching
      if(year>2000)return [];
      const yearData = await loadEmpiresByYearCached(year, true, dispatch);
      return yearData;
    } catch (err) {
      dispatch(setLoading(false));
      return rejectWithValue(err?.response?.data || "Failed to fetch empire polygons");
    }
  }
);

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setYear: (state, action) => {
      const newYear = Number(action.payload);
      if (state.year === newYear) return;
      
      state.year = newYear;
      // Note: Because fetching is now async (API or IndexedDB), the actual polygons
      // will be updated by the fetchAllEmpirePolygons thunk. 
      // Your React component should detect the year change and dispatch the thunk.
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
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
      state.imageMode = action.payload.mode || "view";
    },
    closeImages: (state) => {
      state.imageOpen = false;
      state.currentImage = null;
      state.imageMode = "view";
    },
    setImageMode: (state, action) => {
      state.imageMode = action.payload;
    },
    openHyperlink: (state, action) => {
      state.hyperlinkOpen = true;
      state.currentHyperlink = action.payload;
      state.hyperlinkMode = action.payload.mode || "view";
    },
    closeHyperlink: (state) => {
      state.hyperlinkOpen = false;
      state.currentHyperlink = null;
      state.hyperlinkMode = "view";
    },
    setHyperlinkMode: (state, action) => {
      state.hyperlinkMode = action.payload;
    },
    setFlyToPosition: (state, action) => {
      state.flyToPosition = action.payload;
    },
    setMarkers: (state, action) => {
      state.markers = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllEmpirePolygons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllEmpirePolygons.fulfilled, (state, action) => {
        state.loading = false;
        
        // 🚨 CRITICAL FIX: If the cache returned null (aborted request), DO NOTHING.
        if (!action.payload) return; 

        const payload = action.payload; 
        const newPolygons = [];

        for (let i = 0; i < payload.length; i++) {
          const item = payload[i];
          const { content, objectId, empireName } = item || {};
          
          const rawFeatures = (content && Array.isArray(content.features)) ? content.features : [];
          if (!rawFeatures.length) continue;

          const enrichedFeatures = rawFeatures.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              id: objectId,       
              name: empireName,   
              original_id: feature.properties?.id 
            }
          }));

          newPolygons.push(...enrichedFeatures);
        }
        
        state.polygons = newPolygons;
      })
      .addCase(fetchAllEmpirePolygons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setYear,
  setLoading,
  openNotes,
  setFlyToPosition,
  setMarkers,
  closeNotes,
  openImages,
  closeImages,
  setImageMode,
  openHyperlink,
  closeHyperlink,
  setHyperlinkMode,
} = mapSlice.actions;

export default mapSlice.reducer;