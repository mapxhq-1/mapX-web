import { useState, useRef, useEffect } from "react";
import satelliteIcon from "../../assets/icons/satellite_icon.png";
import basicIcon from "../../assets/icons/basic_icon.png";
import lightIcon from "../../assets/icons/light_icon.png";
import darkIcon from "../../assets/icons/dark_icon.png";
import eraserIcon from "../../assets/icons/eraser_icon.png";
import selectIcon from "../../assets/icons/select_icon.png";
import handIcon from "../../assets/icons/hand_icon.png";
import pencilIcon from "../../assets/icons/pencil_icon.png";
import highlighterIcon from "../../assets/icons/highlighter_icon.png";
import noteIcon from "../../assets/icons/note_icon.png";
import textIcon from "../../assets/icons/text_icon.png";
import hyperlinkIcon from "../../assets/icons/hyperlink_icon.png";
import imageIcon from "../../assets/icons/image_icon.png";
import { isEsriProvider } from "../map/utils/mapStyles";

const styleIcons = {
  satellite: satelliteIcon,
  basic: basicIcon,
  light: lightIcon,
  dark: darkIcon,
};
import { useNavigate } from "react-router-dom";
function HomeSvg(){
	return(<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>)
}
function SelectSvg(){
	return (<img src={selectIcon} alt="Select" width="24" height="24" style={{objectFit: 'contain'}} />)
}
function HandSvg(){
	return (<img src={handIcon} alt="Hand" width="24" height="24" style={{objectFit: 'contain'}} />)
}
function PencilSvg(){
	return (<img src={pencilIcon} alt="Pencil" width="30" height="30" style={{objectFit: 'contain'}} />)
}
function HighlighterSvg(){
	return (<img src={highlighterIcon} alt="Highlighter" width="22" height="22" style={{objectFit: 'contain'}} />)
}
function EraserSvg(){
	return (<img src={eraserIcon} alt="Eraser" width="64" height="64" style={{objectFit: 'contain'}} />)
}
function NoteSvg(){
	return (<img src={noteIcon} alt="Notes" width="24" height="24" style={{objectFit: 'contain'}} />)
}
function TextSvg(){
	return (<img src={textIcon} alt="Text" width="22" height="22" style={{objectFit: 'contain'}} />)
}
function HyperlinkSvg(){
	return (<img src={hyperlinkIcon} alt="Hyperlink" width="24" height="24" style={{objectFit: 'contain'}} />)
}
function ImageSvg(){
	return (<img src={imageIcon} alt="Image" width="24" height="24" style={{objectFit: 'contain'}} />)
}
const MenuButton = ({ menuText, Tag }) => {
  return (
    <div
      className="px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
                                hover:bg-white/10  hover:backdrop-blur-md
                                hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]
                                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30"
    >
      <Tag />
      <p className="text-[15px] ml-5">{menuText}</p>
    </div>
  );
};
const Open = ({ setIsOpen, selectedMode, setSelectedMode, selectedFeature, setSelectedFeature, eraserMode, setEraserMode }) => {
	const navigate=useNavigate();
  const [showMapMenu, setShowMapMenu] = useState(false);
  const panelRef = useRef(null);
  const [menuLeftPx, setMenuLeftPx] = useState(312);

  useEffect(() => {
    const update = () => {
      try {
        if (!panelRef.current) return;
        const r = panelRef.current.getBoundingClientRect();
        setMenuLeftPx(r.right + 8);
      } catch (_) {}
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <div ref={panelRef} className="z-50 w-[300px] bg-[#2A2929] text-white h-dvh overflow-auto flex flex-col justify-between" >
      <div>
      <div className="py-[20px] px-5 flex items-center justify-between">
        <p className=" potta-one  text-white text-2xl tracking-[0.05em] ml-5">MAPX</p>
        <div
          className="cursor-pointer pt-1 pr-5"
          onClick={() => setIsOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={30} height={30} viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth={0.5}><rect width={20} height={18} x={2} y={3} strokeLinecap="round" strokeLinejoin="round" rx={3}></rect><path d="M9 3v18"></path></g></svg>
        </div>
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div>
        <div
          className="px-[45px] py-[15px] flex transition-all items-center duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
                                bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased"
        onClick={()=>navigate("/")}
		>
          <HomeSvg />
          <p className="text-[20px] ml-5">Home</p>
        </div>
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div>
        <div className="relative">
          <div onClick={() => { 
            setSelectedMode('select');
            setEraserMode(false);
            try { 
              window.mapxDrawSetMode && window.mapxDrawSetMode('select'); 
              // Listen for feature selection
              if (window.mapxDrawOnFeatureSelect) {
                window.mapxDrawOnFeatureSelect = (feature) => {
                  setSelectedFeature(feature);
                };
              }
            } catch(e){console.error("Error:", e)} 
          }}>
          <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
            ${selectedMode === 'select' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
            before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
            after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
            <SelectSvg />
            <p className="text-[15px] ml-5">Select</p>
          </div>
          </div>
          
          {/* Eraser sub-tool - only visible when select is selected */}
          {selectedMode === 'select' && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (eraserMode) {
                  // Turn off eraser mode
                  setEraserMode(false);
                  try { 
                    window.mapxEraserCleanup && window.mapxEraserCleanup(); 
                  } catch(e){console.error("Error:", e)} 
                } else {
                  // Turn on eraser mode
                  setEraserMode(true);
                  try { 
                    window.mapxDrawSetMode && window.mapxDrawSetMode('eraser'); 
                  } catch(e){console.error("Error:", e)} 
                }
              }}
              className={`absolute top-3.5 right-8 w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-all duration-200 border border-black/10 shadow-sm ${
                eraserMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white/20 hover:bg-white/40'
              }`}
            >
              <EraserSvg />
            </div>
          )}
        </div>
        <div onClick={() => { 
          setSelectedMode('hand');
          setEraserMode(false);
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('hand'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'hand' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <HandSvg />
          <p className="text-[15px] ml-5">Hand</p>
        </div>
        </div>
        <div onClick={() => { 
          setSelectedMode('pencil');
          setEraserMode(false);
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('pencil'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'pencil' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <div className="flex items-center">
            <PencilSvg />
            <p className="text-[15px] ml-4">Pencil</p>
          </div>
        </div>
        </div>
        <div onClick={() => { 
          setSelectedMode('highlight');
          setEraserMode(false);
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('highlight'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'highlight' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <div className="flex items-center">
            <HighlighterSvg />
            <p className="text-[15px] ml-5">Highlighter</p>
          </div>
        </div>
        </div>
        <div onClick={() => { 
          setSelectedMode('text');
          setEraserMode(false);
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('text'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'text' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <TextSvg />
          <p className="text-[15px] ml-5">Text</p>
        </div>
        </div>
        <div onClick={() => { 
          setSelectedMode('note');
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('note'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'note' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <NoteSvg />
          <p className="text-[15px] ml-5">Notes</p>
        </div>
        </div>
        {/* <MenuButton menuText="Hyperlink" Tag={HyperlinkSvg} /> */}

        <div onClick={() => { 
          setSelectedMode('hyperlink');
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('hyperlink'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'hyperlink' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <HyperlinkSvg />
          <p className="text-[15px] ml-5">HyperLink</p>
        </div>
        </div>

        <div onClick={() => { 
          setSelectedMode('image');
          try { 
            window.mapxDrawSetMode && window.mapxDrawSetMode('image'); 
          } catch(e){console.error("Error:", e)} 
        }}>
        <div className={`px-[45px] py-[15px] flex items-center transition-all duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
          ${selectedMode === 'image' ? 'bg-[#D5EDFF] text-[#1403FF]' : 'text-white hover:bg-white/10 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]'}
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30`}>
          <ImageSvg />
          <p className="text-[15px] ml-5">Image</p>
        </div>
        </div>
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div>
        <p className="text-[20px] pl-[45px] my-[10px]">Shapes</p>
        <div className="grid-cols-2 grid gap-3 m-5">
          <div onClick={() => { setEraserMode(false); try { window.mapxDrawSetMode && window.mapxDrawSetMode('line'); } catch(e){console.error("Error:", e)} }} className="rounded-lg flex py-[5px] px-[10px]  text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.5" d="m21.25 2.75l-18.5 18.5"/></svg>
            <p className="text-[18px] ml-2">Line</p>
          </div>
          <div onClick={() => { setEraserMode(false); try { window.mapxDrawSetMode && window.mapxDrawSetMode('arrow'); } catch(e){console.error("Error:", e)} }} className="rounded-lg flex py-[5px] px-[10px]  text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 15 15"><path fill="#fff" d="M8.293 2.293a1 1 0 0 1 1.414 0l4.5 4.5a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414-1.414L11 8.5H1.5a1 1 0 0 1 0-2H11L8.293 3.707a1 1 0 0 1 0-1.414"/></svg>
            <p className="text-[18px] ml-2">Arrow</p>
          </div>
          <div onClick={() => { setEraserMode(false); try { window.mapxDrawSetMode && window.mapxDrawSetMode('circle'); } catch(e){console.error("Error:", e)} }} className="rounded-lg flex py-[5px] px-[10px] text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/></svg>
            <p className="text-[18px] ml-2">Circle</p>
          </div>
          <div onClick={() => { setEraserMode(false); try { window.mapxDrawSetMode && window.mapxDrawSetMode('polygon'); } catch(e){console.error("Error:", e)} }} className="rounded-lg flex py-[5px] px-[10px] text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="none" stroke="#fff" strokeWidth="4" d="M28.038 8H7a3 3 0 0 0-3 3v26a3 3 0 0 0 3 3h32.413c2.163 0 3.616-2.22 2.748-4.203l-11.375-26A3 3 0 0 0 28.038 8Z"/></svg>
            <p className="text-[18px] ml-2">Polygon</p>
          </div>
        </div>
      </div>
      <div>
        <div
          className="flex p-3 mb-1 items-center justify-center gap-6 rounded-lg cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased"
          onClick={() => setShowMapMenu((v) => !v)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none"><path fill="#fff" d="M2.52 6.84L8.97 5l.53 11.5l-.53 11.49l-6.12 1.99a.684.684 0 0 1-.85-.66V7.5c0-.31.22-.58.52-.66M15.98 7l6.99-2l.53 11.5l-.51 11.5l-7.01 2L15 18.5z"/><path fill="#e6e6e6" d="M15.98 7L8.97 5v22.99L15.98 30zm13.42-.16L22.97 5v23l6.09 1.98c.43.11.85-.22.85-.66V7.5c0-.31-.21-.58-.51-.66"/><path fill="#00a6ed" d="M3.95 8.34L8.97 7L10 16.5L8.97 26l-4.66 1.42a.687.687 0 0 1-.87-.66V9c0-.31.21-.58.51-.66M15.94 9l7.03-1.98L24 16.5l-1.03 9.49l-7.03 2L15 18.5z"/><path fill="#0074ba" d="M15.94 9L8.97 7.02v18.97l6.97 2zm12-.66l-4.97-1.32v19l4.61 1.42c.44.12.87-.21.87-.66V9c0-.31-.21-.58-.51-.66"/><path fill="#00d26a" d="m14.32 17.64l.53-.53c.072-.063.16-.101.242-.138l.028-.012h.43c.22 0 .4-.18.4-.4v-.19c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4-.18-.4-.4v-1.19c0-.22.18-.4.4-.4h.19c.22 0 .4-.18.4-.4v-.19c0-.22.18-.4.4-.4h1.44c.1 0 .2-.03.27-.1l1.75-1.57c.08-.08.13-.19.13-.3v-.03c0-.55.45-1 1-1h.4c.33 0 .6.27.6.6c0 .22.18.4.4.4h1.19c.22 0 .4-.18.4-.4v-.19c0-.22.18-.4.4-.4h.04c.85 0 1.55.69 1.55 1.55v1.94c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.1c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4.18-.4.4v1.19c0 .22.18.4.4.4a.4.4 0 0 1 .37.55l-.88 2.19c-.06.15-.21.25-.37.25h-1.12c-.22 0-.4-.18-.4-.4v-.19c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4.18-.4.4v.19c0 .22-.18.4-.4.4h-.19c-.22 0-.4-.18-.4-.4v-.19c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4.18-.4.4v.5c0 .06-.01.12-.04.18l-.91 1.83c-.03.06-.04.12-.04.18v1.24c0 .43-.17.84-.47 1.14l-.41.41a.4.4 0 0 1-.29.12h-.43c-.22 0-.4-.18-.4-.4v-2.19c0-.22-.18-.4-.4-.4h-.43a.4.4 0 0 1-.29-.12l-.53-.53c-.22-.22-.35-.53-.35-.85s.12-.62.35-.85m-3.35 5.85c0 .28-.22.5-.5.5c-.27 0-.5-.22-.48-.47v-1.37a.3.3 0 0 0-.09-.22l-.38-.38c-.34-.34-.53-.81-.53-1.29v-1.12a.3.3 0 0 0-.09-.22l-1.25-1.25c-.134-.134-.351-.283-.586-.444c-.499-.343-1.074-.737-1.074-1.146v-2.36c0-.192.165-.367.286-.495c.124-.133.202-.215.004-.215c-.19 0-.37.08-.5.21l-1.26 1.26c-.2.19-.53.06-.53-.22v-.13c0-.08.03-.16.09-.22l.24-.24c.42-.42.66-1 .66-1.6v-.37c0-.38.31-.69.69-.69h.62c.38 0 .69.31.69.69c0 .17.14.31.31.31h.1c.46 0 .9-.19 1.21-.53l.62-.67c.48-.51 1.15-.8 1.85-.8h1.6c.72 0 1.3.58 1.3 1.3c0 .45-.18.88-.5 1.2l-.41.41a.3.3 0 0 0-.09.22v.37c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-2c0-.28-.22-.5-.5-.5s-.5.22-.5.5v.19c0 .17-.14.31-.31.31h-.78c-.18 0-.32.14-.31.32l.02.35c.01.17-.13.32-.31.32c-.17 0-.31.14-.31.31v.19c0 .28.22.5.5.5s.5-.22.5-.5s.22-.5.5-.5s.5.22.5.5v.37c0 .08.03.16.09.22l.69.69c.12.12.12.32 0 .44l-.29.29c-.31.31-.74.49-1.18.49c-.17 0-.31.14-.31.31v.19c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.19c0-.17-.14-.31-.31-.31h-.38c-.17 0-.31.14-.31.31v.56c0 .08.03.16.09.22l1.82 1.82c.06.06.14.09.22.09h.44c.28 0 .56.06 .81 .19l1.17 .58c.28 .13 .45 .41 .45 .72c0 .3 -.18 .58 -.45 .72l-.61 .31c-.58 .29 -.94 .87 -.94 1.52zm11-3.98c0 .31 .11 .61 .3 .85l.21 .25c.3 .37 .79 .54 1.25 .43a.31 .31 0 0 0 .24 -.3v-.37c0 -.16 .12 -.29 .27 -.31l.15 -.02c.31 -.03 .58 .21 .58 .52c0 .24 .17 .46 .41 .51l.22 .05c.19 .04 .37 -.1 .37 -.3v-.84c0 -.55 -.45 -1 -1 -1h-.86c-.09 0 -.17 .04 -.23 .1l-.37 .41a.31 .31 0 0 1 -.54 -.21c0 -.17 -.14 -.31 -.31 -.31h-.38c-.17 .02 -.31 .16 -.31 .33zm1.5 4.49c-.28 0 -.5 -.22 -.5 -.5v-.67c0 -.46 .37 -.84 .83 -.84h1.61c.31 0 .56 .25 .56 .56v.95c0 .28 -.22 .5 -.5 .5z"/></g></svg>
          <p className="text-[20px]">Map Settings</p>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="24" viewBox="0 0 12 24"><defs><path id="SVG1pzpbdYY" fill="#676767" d="m7.588 12.43l-1.061 1.06L.748 7.713a.996.996 0 0 1 0-1.413L6.527.52l1.06 1.06l-5.424 5.425z"/></defs><use fillRule="evenodd" href="#SVG1pzpbdYY" transform="rotate(-180 5.02 9.505)"/></svg>
        </div>

        {showMapMenu && (
          <div
            className="rounded-lg bg-white/2.5 border border-white/40 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.2)]"
            style={{ position: "fixed", left: menuLeftPx, bottom: 16, zIndex: 60, minWidth: 180 }}
          >
            {/* Satellite option */}
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetSatellite && window.mapxSetSatellite(); setShowMapMenu(false); }}
            >
              <img src={styleIcons.satellite} alt="Satellite" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Satellite</span>
            </button>
            
            {/* Light option - Esri Light Gray Canvas merged with Hillshade */}
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetStyle && window.mapxSetStyle('light'); setShowMapMenu(false); }}
            >
              <img src={styleIcons.light} alt="Light" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Light</span>
            </button>
            
            {/* Basic option - World Street Map */}
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetStyle && window.mapxSetStyle('basic'); setShowMapMenu(false); }}
            >
              <img src={styleIcons.basic} alt="Basic" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Basic</span>
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

const Closed = ({ setIsOpen }) => {
  return (
    <div className=" z-50 h-dvh  w-[60px] flex justify-center pt-[25px] bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0  before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
      <div className=" cursor-pointer" onClick={() => setIsOpen(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 20 20"><path fill="#fff" d="M7.5 3v14h9.25A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3ZM3.25 3H6v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3"></path></svg>
      </div>
    </div>
  );
};
const LeftPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [eraserMode, setEraserMode] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  useEffect(() => {
    // Sync UI when mode changes programmatically
    window.mapxOnModeChanged = (mode) => {
      try { setSelectedMode(mode); } catch (_) {}
    };
    return () => { try { delete window.mapxOnModeChanged; } catch (_) {} };
  }, []);
  return (
    <>
      {isOpen && <Open setIsOpen={setIsOpen} selectedMode={selectedMode} setSelectedMode={setSelectedMode} selectedFeature={selectedFeature} setSelectedFeature={setSelectedFeature} eraserMode={eraserMode} setEraserMode={setEraserMode}/>}
      {!isOpen && <Closed setIsOpen={setIsOpen} />}
    </>
  );
};

export default LeftPanel;
