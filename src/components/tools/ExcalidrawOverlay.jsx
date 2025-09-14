import { useRef, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export default function ExcalidrawOverlay({ onClose }) {
  const excaliAPIRef = useRef(null);

  useEffect(() => {
    if (excaliAPIRef.current) {
      // remove white background by forcing scene + appState
      excaliAPIRef.current.updateScene({
        elements: excaliAPIRef.current.getSceneElements(),
        appState: {
          ...excaliAPIRef.current.getAppState(),
          viewBackgroundColor: "transparent",
        },
        commitToHistory: false,
      });
    }
  }, []);

  const handleSave = () => {
    if (excaliAPIRef.current) {
      const elements = excaliAPIRef.current.getSceneElements();
      const appState = excaliAPIRef.current.getAppState();
      const files = excaliAPIRef.current.getFiles();

      console.log(JSON.stringify({ elements, appState, files }, null, 2));
    }
  };

  return (
    <div className="absolute inset-0 z-[30] flex flex-col bg-transparent pointer-events-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center bg-gray-900/70 text-white px-4 py-2">
        <h2 className="text-lg font-semibold">Excalidraw</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-1 bg-green-600 rounded hover:bg-green-500"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-red-600 rounded hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 relative">
        <Excalidraw
          excalidrawAPI={(api) => (excaliAPIRef.current = api)}
          UIOptions={{ canvasActions: { saveToActiveFile: false } }}
          initialData={{
            appState: { viewBackgroundColor: "transparent" }, // 👈 important
          }}
        />
      </div>
    </div>
  );
}
