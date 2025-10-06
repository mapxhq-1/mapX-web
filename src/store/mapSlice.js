import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAllEmpires, getEmpireDetailsById } from "../components/api/geoJson";

const initialState = {
  year: 2000,
  polygons: [],
  allPolygons: {},
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

// Helper function to convert year object to integer
const convertYearToInteger = (yearObj) => {
  if (!yearObj || !yearObj.year) return null;
  
  // BCE years become negative, CE years stay positive
  return yearObj.era === 'BCE' ? -yearObj.year : yearObj.year;
};

export const fetchAllEmpirePolygons = createAsyncThunk(
  "map/fetchAllEmpirePolygons",
  async (_, { rejectWithValue }) => {
    try {
      const metadataList = await getAllEmpires();
      
      // Fetch full details for each empire in parallel
      const detailsList = await Promise.all(
        metadataList.map((empire) => getEmpireDetailsById(empire.objectId))
      );
      
      return detailsList; // each includes { startYear, endYear, content }
    } catch (err) {
      return rejectWithValue(err.response?.data || "Failed to fetch empire polygons");
    }
  }
);

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setYear: (state, action) => {
      state.year = action.payload;
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllEmpirePolygons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllEmpirePolygons.fulfilled, (state, action) => {
        state.loading = false;
        
        const allPolygons = {};
        
        (action.payload || []).forEach((empire) => {
          const { startYear, endYear, content } = empire;
          
          // Convert year objects to integers (BCE = negative, CE = positive)
          const start = convertYearToInteger(startYear);
          const end = convertYearToInteger(endYear);
          
          // Skip if years are invalid
          if (start === null || end === null) return;
          
          if (content?.features?.length) {
            // Loop through all years empire existed (inclusive)
            // start is the beginning year, end is the ending year
            for (let year = start; year <= end; year++) {
              const yearKey = year.toString();
              if (!allPolygons[yearKey]) allPolygons[yearKey] = [];
              
              // Append all empire features for this year
              allPolygons[yearKey].push(...content.features);
            }
          }
        });
        
        state.allPolygons = allPolygons;
        
        // Update polygons for the current selected year
        const currentYearKey = state.year.toString();
        state.polygons = state.allPolygons[currentYearKey] || [];
        
      })
      .addCase(fetchAllEmpirePolygons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setYear,
  openNotes,
  closeNotes,
  openImages,
  closeImages,
  setImageMode,
  openHyperlink,
  closeHyperlink,
  setHyperlinkMode,
} = mapSlice.actions;

export default mapSlice.reducer;