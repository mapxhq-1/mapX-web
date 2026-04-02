import { createSlice } from "@reduxjs/toolkit";

const layerSlice = createSlice({
  name: "layers",
  initialState: { 
    layers: [] 
  },
  reducers: {
    addLayerMetadata: (state, action) => {
      const { id, name, color, metadata } = action.payload;
      const exists = state.layers.find(l => l.id === id);
      if (!exists) {
        state.layers.push({
          id, name, color, metadata,
          data: null,      
          visible: false, // Start unchecked
          isLoading: false,
          isPlaying: false,      
          restartTrigger: 0     
        });
      }
    },
    updateLayerData: (state, action) => {
      const { id, data } = action.payload;
      const layer = state.layers.find(l => l.id === id);
      if (layer) {
        layer.data = data;
        layer.isLoading = false;
      }
    },
    toggleLayerVisibility: (state, action) => {
      const layer = state.layers.find(l => l.id === action.payload);
      if (layer) {
          layer.visible = !layer.visible;
          if (layer.visible) layer.isPlaying = true; 
      }
    },
    // --- NEW: Uncheck everything ---
    resetAllVisibility: (state) => {
      state.layers.forEach(l => l.visible = false);
    },
    // -------------------------------
    removeLayer: (state, action) => {
      state.layers = state.layers.filter(l => l.id !== action.payload);
    },
    setLayerLoading: (state, action) => {
      const layer = state.layers.find(l => l.id === action.payload);
      if (layer) layer.isLoading = true;
    },
    setLayerPlaying: (state, action) => {
        const { id, isPlaying } = action.payload;
        const layer = state.layers.find(l => l.id === id);
        if (layer) layer.isPlaying = isPlaying;
    },
    triggerLayerRestart: (state, action) => {
        const layer = state.layers.find(l => l.id === action.payload);
        if (layer) {
            layer.restartTrigger += 1; 
            layer.isPlaying = true;    
        }
    }
  }
});

export const { 
  addLayerMetadata, 
  updateLayerData, 
  toggleLayerVisibility, 
  resetAllVisibility, // Export this
  removeLayer,
  setLayerLoading,
  setLayerPlaying,
  triggerLayerRestart
} = layerSlice.actions;

export default layerSlice.reducer;