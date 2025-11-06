import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loadAllEmpiresWithDetailsCached } from "../utils/dataManager";
import { maBinToYear } from "../utils/era";

const initialState = {
  year: 2000,
  polygons: [],
  // Store normalized empires and compute polygons lazily per year to avoid huge pre-expansion
  empires: [],
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
  if (!yearObj || typeof yearObj.year === 'undefined' || yearObj.year === null) return null;

  const rawYear = Number(yearObj.year);
  if (!Number.isFinite(rawYear)) return null;

  const era = String(yearObj.era || '').trim().toUpperCase();
  if (era === 'MA') {
    return maBinToYear(rawYear);
  }

  if (era === 'BCE') {
    return -Math.abs(rawYear);
  }

  return Math.abs(rawYear);
};

export const fetchAllEmpirePolygons = createAsyncThunk(
  "map/fetchAllEmpirePolygons",
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const year = state.map.year;
      const detailsList = await loadAllEmpiresWithDetailsCached(year, false, dispatch);
      return detailsList;
    } catch (err) {
      dispatch(setLoading(false)); // Ensure loading is false on error
      return rejectWithValue(err?.response?.data || "Failed to fetch empire polygons");
    }
  }
);

// Helper: compute polygons active for a given year from normalized empires
function computePolygonsForYear(empires, year) {
  if (!Array.isArray(empires) || !empires.length) return [];
  const out = [];
  for (let i = 0; i < empires.length; i++) {
    const e = empires[i];
    if (year >= e.start && year <= e.end && e.features && e.features.length) {
      // Append references; Maplibre expects plain arrays, so copy container only
      for (let j = 0; j < e.features.length; j++) out.push(e.features[j]);
    }
  }
  return out;
}

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setYear: (state, action) => {
      state.year = action.payload;
      state.polygons = computePolygonsForYear(state.empires, state.year);
    },
    setLoading: (state, action) => {  // ADD THIS ACTION
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllEmpirePolygons.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchAllEmpirePolygons.fulfilled, (state, action) => {
        const empires = [];
        for (let i = 0; i < (action.payload || []).length; i++) {
          const empire = action.payload[i];
          const { startYear, endYear, content } = empire || {};
          const start = convertYearToInteger(startYear);
          const end = convertYearToInteger(endYear);
          if (start === null || end === null) continue;
          const features = (content && Array.isArray(content.features)) ? content.features : [];
          if (!features.length) continue;
          empires.push({ start, end, features });
        }
        state.empires = empires;
        state.polygons = computePolygonsForYear(state.empires, state.year);
      })
      .addCase(fetchAllEmpirePolygons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  },
});

export const {
  setYear,
  setLoading,
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