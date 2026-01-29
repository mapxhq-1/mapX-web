# React + Vite
hi
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available :

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## MapTiler Integration Setup

This project supports both **MapTiler** and **OpenFreeMap** as map tile providers. MapTiler provides high-quality commercial map tiles, while OpenFreeMap is a free alternative.

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# MapTiler API Configuration
# Get your API key from: https://cloud.maptiler.com/account/keys/
# IMPORTANT: Restrict your API key to your domain in the MapTiler dashboard to prevent key theft

# Your MapTiler API key (required if using MapTiler provider)
VITE_MAPTILER_KEY=your_maptiler_api_key_here

# Map provider: 'maptiler' or 'openfreemap' (default: 'maptiler')
# Set to 'openfreemap' to use free OpenFreeMap tiles without API key
VITE_MAP_PROVIDER=maptiler

# Default theme: 'basic', 'light', 'dark' (default: 'basic')
# Users can switch themes at runtime from the Map Settings menu
VITE_MAPTILER_DEFAULT_THEME=basic
```

### Getting a MapTiler API Key

1. Sign up for a free account at [MapTiler Cloud](https://cloud.maptiler.com/)
2. Navigate to [API Keys](https://cloud.maptiler.com/account/keys/)
3. Create a new API key or use the default key
4. **IMPORTANT**: Restrict the key to your domain(s) in the key settings to prevent unauthorized use
5. Copy the key and add it to your `.env` file

### Switching Providers

- **To use MapTiler**: Set `VITE_MAP_PROVIDER=maptiler` and provide `VITE_MAPTILER_KEY`
- **To use OpenFreeMap**: Set `VITE_MAP_PROVIDER=openfreemap` (no API key needed)
- **To switch providers**: Change `VITE_MAP_PROVIDER` and restart the dev server

### Runtime Theme Switching

Users can switch map themes (Basic, Light, Dark, Satellite) at runtime from the **Map Settings** menu in the left panel. The Satellite view uses EOX Sentinel-2 cloudless imagery and is independent of the provider setting.

### Fallback Behavior

- If MapTiler API key is missing or invalid, the app automatically falls back to OpenFreeMap
- If style fetching fails, the app falls back to OpenFreeMap 'liberty' style
- All fallbacks are logged to the browser console for debugging

### Rollback to OpenFreeMap Only

If you need to completely rollback to OpenFreeMap:

1. Set `VITE_MAP_PROVIDER=openfreemap` in `.env`
2. Or uncomment the original OpenFreeMap code sections in:
   - `src/components/map/MapView.jsx` (map initialization and `window.mapxSetStyle`)
   - `src/components/panels/LeftPanel.jsx` (button handlers)

All original OpenFreeMap code is preserved as comments for easy rollback.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
