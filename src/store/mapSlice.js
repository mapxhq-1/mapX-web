import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loadAllEmpiresWithDetailsCached } from "../utils/dataManager";
import { maBinToYear } from "../utils/era";

const initialState = {
  year: 2000,
  polygons: [],
  empires: [],
  flyToPosition: null,
  markers:[],
  yearToEmpireIds: {}, // { year: [empireId1, empireId2, ...] }
  empireIdToFeatures: {}, // { empireId: features[] }
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
      dispatch(setLoading(false));
      return rejectWithValue(err?.response?.data || "Failed to fetch empire polygons");
    }
  }
);


function computePolygonsForYear(yearToEmpireIds, empireIdToFeatures, year) {
  // Normalise key to string (index keys are stored as strings)
  const key = String(Number(year));
  const empireIds = yearToEmpireIds[key];
  if (!empireIds || !empireIds.length) return [];

  const out = [];
  for (let i = 0; i < empireIds.length; i++) {
    const features = empireIdToFeatures[empireIds[i]];
    if (features) {
      for (let j = 0; j < features.length; j++) {
        out.push(features[j]);
      }
    }
  }
  return out;
}

// Build index once when empires are loaded
// Build index once when empires are loaded
function buildYearIndex(empires) {
  const yearToEmpireIds = {};
  const empireIdToFeatures = {};

  for (let i = 0; i < empires.length; i++) {
    const e = empires[i];
    const empireId = `empire_${i}`;

    if (e.features && e.features.length) {
      empireIdToFeatures[empireId] = e.features;

      // Index every year this empire exists
      // Store keys as strings for consistent lookups later
      for (let year = e.start; year <= e.end; year++) {
        const key = String(year);
        if (!yearToEmpireIds[key]) {
          yearToEmpireIds[key] = [];
        }
        yearToEmpireIds[key].push(empireId);
      }
    }
  }

  return { yearToEmpireIds, empireIdToFeatures };
}

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setYear: (state, action) => {
      const newYear = Number(action.payload);
      if (state.year === newYear) return; // Skip if same year

      state.year = newYear;
      // FAST: O(1) lookup instead of O(n) loop
      const newPolygons = computePolygonsForYear(
        state.yearToEmpireIds,
        state.empireIdToFeatures,
        newYear
      );
      // Force new reference to trigger re-render
      state.polygons = newPolygons.length > 0 ? newPolygons : [];
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
        state.loading = true; // Set loading true when fetching starts
        state.error = null;
      })
      .addCase(fetchAllEmpirePolygons.fulfilled, (state, action) => {
        state.loading = false; 
        const empires = [];
        
        const payload = action.payload || [];

        for (let i = 0; i < payload.length; i++) {
          const item = payload[i];
          
          // 1. DESTRUCTURE YOUR SPECIFIC FIELDS
          // We grab objectId (the real ID) and empireName
          const { startYear, endYear, content, objectId, empireName } = item || {};
          
          const start = convertYearToInteger(startYear);
          const end = convertYearToInteger(endYear);
          
          if (start === null || end === null) continue;
          
          const rawFeatures = (content && Array.isArray(content.features)) ? content.features : [];
          if (!rawFeatures.length) continue;

          // 2. INJECT ID INTO PROPERTIES
          // This bridges the gap between your API structure and the MapView
          const enrichedFeatures = rawFeatures.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              // FORCE the correct ID and Name into properties
              id: objectId,       // e.g., "68e1f62d85d0863839c622ea"
              name: empireName,   // e.g., "French Pondicherry"
              
              // Keep original properties just in case
              original_id: feature.properties?.id 
            }
          }));

          empires.push({ start, end, features: enrichedFeatures });
        }
        
        state.empires = empires;
        
        // ... (standard indexing logic) ...
        const { yearToEmpireIds, empireIdToFeatures } = buildYearIndex(empires);
        state.yearToEmpireIds = yearToEmpireIds;
        state.empireIdToFeatures = empireIdToFeatures;
        
        const newPolygons = computePolygonsForYear(
          yearToEmpireIds,
          empireIdToFeatures,
          state.year
        );
        state.polygons = [...newPolygons];
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