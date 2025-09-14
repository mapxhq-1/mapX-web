import { useState, useRef, useEffect } from "react";
import satelliteIcon from "../../assets/icons/satellite_icon.png";
import basicIcon from "../../assets/icons/basic_icon.png";
import lightIcon from "../../assets/icons/light_icon.png";
import darkIcon from "../../assets/icons/dark_icon.png";

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
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><path fill="#fff" d="m106.667 64l298.666 201.671l-115.905 40.035l66.066 110.419L298.28 448l-66.067-110.419l-93.883 76.841zm52.071 87.028L174.8 328.835l60.629-49.629l74.837-25.841z"/></svg>)
}
function HandSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M12.5 2a.5.5 0 0 0-.5.5V12h-2V4.5a.5.5 0 0 0-1 0V14H7c-.38-1.62-1.358-2.56-2.405-2.678A89 89 0 0 0 6.166 15.1c.86 1.962 1.725 3.422 2.838 4.399C10.078 20.442 11.459 21 13.5 21a5.5 5.5 0 0 0 5.5-5.5V7a.5.5 0 0 0-1 0v5h-2V4a.5.5 0 0 0-1 0v8h-2V2.5a.5.5 0 0 0-.5-.5M21 15.5a7.5 7.5 0 0 1-7.5 7.5c-2.458 0-4.328-.692-5.816-1.998c-1.45-1.274-2.459-3.064-3.35-5.1c-.93-2.127-1.444-3.422-1.724-4.178c-.357-.964.136-2.312 1.476-2.406a4.02 4.02 0 0 1 2.914.94V4.5a2.5 2.5 0 0 1 3.04-2.442a2.5 2.5 0 0 1 4.79-.467A2.502 2.502 0 0 1 18 4v.55q.243-.05.5-.05A2.5 2.5 0 0 1 21 7z"/></svg>)
}
function PencilSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 36 36"><path fill="#d99e82" d="M35.222 33.598c-.647-2.101-1.705-6.059-2.325-7.566c-.501-1.216-.969-2.438-1.544-3.014s-1.553-.53-2.143.058c0 0-2.469 1.675-3.354 2.783c-1.108.882-2.785 3.357-2.785 3.357c-.59.59-.635 1.567-.06 2.143c.576.575 1.798 1.043 3.015 1.544c1.506.62 5.465 1.676 7.566 2.325c.359.11 1.74-1.271 1.63-1.63"/><path fill="#ea596e" d="M13.643 5.308a2.946 2.946 0 0 1 0 4.167l-4.167 4.168a2.95 2.95 0 0 1-4.167 0L1.141 9.475a2.95 2.95 0 0 1 0-4.167l4.167-4.167a2.946 2.946 0 0 1 4.167 0z"/><path fill="#ffcc4d" d="m31.353 23.018l-4.17 4.17l-4.163 4.165L7.392 15.726l8.335-8.334z"/><path fill="#292f33" d="M32.078 34.763s2.709 1.489 3.441.757s-.765-3.435-.765-3.435s-2.566.048-2.676 2.678"/><path fill="#ccd6dd" d="m2.183 10.517l8.335-8.335l5.208 5.209l-8.334 8.335z"/><path fill="#99aab5" d="m3.225 11.558l8.334-8.334l1.042 1.042L4.267 12.6zm2.083 2.086l8.335-8.335l1.042 1.042l-8.335 8.334z"/></svg>)
}
function HighlighterSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none"><path fill="#fff" d="m18.37 1.71l-1.96 1.96L5.14 14.94l-.98 3.92l1.96 1.96l3.92-.98L21.31 8.57l1.96-1.96z"/><path fill="#bbd8ff" d="M4.16 18.86L.73 22.29h3.92l1.47-1.47z"/><path fill="#bbd8ff" d="m18.958 6.218l-13.72 13.72l.882.882l3.92-.98L21.31 8.57z"/><path stroke="#092f63" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M4.16 18.86L.73 22.29h3.92l1.47-1.47zm.98-3.92L16.41 3.67l4.9 4.9l-11.27 11.27l-3.92.98l-1.96-1.96zm5.194 4.704l-4.9-4.9M18.37 11.51l-4.9-4.9m2.94-2.94L14.94 2.2l-4.9 4.9" strokeWidth="1.5"/><path stroke="#092f63" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="m18.37 1.71l-1.96 1.96l4.9 4.9l1.96-1.96z" strokeWidth="1.5"/><path stroke="#bbd8ff" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M11.02 22.29h12.25" strokeWidth="1.5"/></g></svg>)
}
function NoteSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><path fill="#ffd469" d="M450.812 462.658H74.759a8.8 8.8 0 0 1-8.802-8.802V77.802A8.8 8.8 0 0 1 74.759 69H290.76l168.854 168.854v216.001a8.8 8.8 0 0 1-8.802 8.803"/><path fill="#597b91" d="M242.863 168.403H126.007c-6.613 0-11.974-5.361-11.974-11.974s5.361-11.974 11.974-11.974h116.856c6.613 0 11.974 5.361 11.974 11.974s-5.361 11.974-11.974 11.974m11.974 66.401c0-6.613-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.361 11.974-11.974m0 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.362 11.974-11.974m101.165 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h218.021c6.613-.001 11.974-5.362 11.974-11.974m40.334-78.374c0-6.612-5.361-11.974-11.974-11.974h-80.668c-6.612 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h80.668c6.613-.001 11.974-5.362 11.974-11.974"/><path fill="#ffb636" d="m290.76 69l168.854 168.854H326.651c-19.822 0-35.891-16.069-35.891-35.891z"/></svg>)
}
function TextSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 1 1-2 0V6h-4v12h1a1 1 0 1 1 0 2h-4a1 1 0 1 1 0-2h1V6H7v1a1 1 0 0 1-2 0z"/></svg>)
}
function HyperlinkSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50"><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path stroke="#306cfe" d="M9.375 40.625a7.375 7.375 0 0 1 0-10.417L14.583 25A7.375 7.375 0 0 1 25 25a7.375 7.375 0 0 1 0 10.417l-5.208 5.208a7.375 7.375 0 0 1-10.417 0m27.083-16.667l5.209-5.208a7.375 7.375 0 0 0 0-10.417v0a7.375 7.375 0 0 0-10.417 0l-5.208 5.209a7.375 7.375 0 0 0 0 10.416v0a7.375 7.375 0 0 0 10.416 0"/><path stroke="#344054" d="m20.833 29.167l8.334-8.334"/></g></svg>)
}
function ImageSvg(){
	return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 14 14"><g fill="none" fillRule="evenodd" clipRule="evenodd"><path fill="#8fbffa" d="M.076 8.846c0 .943.765 1.708 1.708 1.708H5.34c-.107-.993.46-2.059 1.7-2.275a1.43 1.43 0 0 0 1.147-1.092l.023-.105c.304-1.388 1.677-1.895 2.758-1.514V1.77c0-.944-.765-1.708-1.708-1.708H1.784A1.71 1.71 0 0 0 .076 1.77z"/><path fill="#2859c5" d="M9.304 3.21a1.371 1.371 0 1 1-2.742 0a1.371 1.371 0 0 1 2.742 0M5.34 10.554c-.105-.973.437-2.016 1.626-2.26l-.23-.37C5.04 5.67 2.506 5.572.076 6.1v2.745c0 .943.765 1.708 1.708 1.708H5.34ZM9.43 7.35c.19-.869 1.427-.874 1.625-.007l.01.043l.02.086a2.69 2.69 0 0 0 2.16 2.037c.905.158.905 1.457 0 1.614a2.69 2.69 0 0 0-2.164 2.055l-.026.112c-.198.867-1.434.862-1.625-.007l-.02-.097a2.68 2.68 0 0 0-2.156-2.064c-.904-.157-.904-1.454 0-1.611a2.68 2.68 0 0 0 2.153-2.054l.016-.071z"/></g></svg>)
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
const Open = ({ setIsOpen,setShowExcalidraw }) => {
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
    <div ref={panelRef} className="z-50 w-[300px] bg-[#2A2929] text-white h-screen overflow-auto flex flex-col justify-between" >
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
        <MenuButton menuText="Select" Tag={SelectSvg} />
        <MenuButton menuText="Hand" Tag={HandSvg} />
        <div onClick={() => {setIsOpen(false);setShowExcalidraw(true)}}>
        <MenuButton menuText="Pencil" Tag={PencilSvg} />
        </div>
        <MenuButton menuText="Highlight" Tag={HighlighterSvg} />
        <MenuButton menuText="Notes" Tag={NoteSvg} />
        <MenuButton menuText="Text" Tag={TextSvg} />
        <MenuButton menuText="Hyperlink" Tag={HyperlinkSvg} />
        <MenuButton menuText="Image" Tag={ImageSvg} />
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div>
        <p className="text-[20px] pl-[45px] my-[10px]">Shapes</p>
        <div className="grid-cols-2 grid gap-3 m-5">
          <div className="rounded-lg flex py-[5px] px-[10px]  text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-linecap="round" stroke-width="1.5" d="m21.25 2.75l-18.5 18.5"/></svg>
            <p className="text-[18px] ml-2">Line</p>
          </div>
          <div className="rounded-lg flex py-[5px] px-[10px]  text-white items-center hover:scale-105  cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 15 15"><path fill="#fff" d="M8.293 2.293a1 1 0 0 1 1.414 0l4.5 4.5a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414-1.414L11 8.5H1.5a1 1 0 0 1 0-2H11L8.293 3.707a1 1 0 0 1 0-1.414"/></svg>
            <p className="text-[18px] ml-2">Arrow</p>
          </div>
          <div className="rounded-lg flex py-[5px] px-[10px] text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/></svg>
            <p className="text-[18px] ml-2">Circle</p>
          </div>
          <div className="rounded-lg flex py-[5px] px-[10px] text-white items-center hover:scale-105 cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm 
  shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
  hover:bg-white/30 transition-all duration-300 
  before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
  after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="none" stroke="#fff" stroke-width="4" d="M28.038 8H7a3 3 0 0 0-3 3v26a3 3 0 0 0 3 3h32.413c2.163 0 3.616-2.22 2.748-4.203l-11.375-26A3 3 0 0 0 28.038 8Z"/></svg>
            <p className="text-[18px] ml-2">Polygon</p>
          </div>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="24" viewBox="0 0 12 24"><defs><path id="SVG1pzpbdYY" fill="#676767" d="m7.588 12.43l-1.061 1.06L.748 7.713a.996.996 0 0 1 0-1.413L6.527.52l1.06 1.06l-5.424 5.425z"/></defs><use fill-rule="evenodd" href="#SVG1pzpbdYY" transform="rotate(-180 5.02 9.505)"/></svg>
        </div>

        {showMapMenu && (
          <div
            className="rounded-lg bg-white/2.5 border border-white/40 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.2)]"
            style={{ position: "fixed", left: menuLeftPx, bottom: 16, zIndex: 60, minWidth: 180 }}
          >
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetSatellite && window.mapxSetSatellite(); setShowMapMenu(false); }}
            >
              <img src={styleIcons.satellite} alt="Satellite" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Satellite</span>
            </button>
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetStyle && window.mapxSetStyle("https://tiles.openfreemap.org/styles/liberty"); setShowMapMenu(false); }}
            >
              <img src={styleIcons.basic} alt="Basic" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Basic</span>
            </button>
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetStyle && window.mapxSetStyle("https://tiles.openfreemap.org/styles/positron"); setShowMapMenu(false); }}
            >
              <img src={styleIcons.light} alt="Light" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Light</span>
            </button>
            <button
              type="button"
              className="w-full text-left flex items-center px-3 py-2 gap-3 hover:bg-white/10 transition-colors"
              onClick={() => { window.mapxSetStyle && window.mapxSetStyle("https://tiles.openfreemap.org/styles/dark"); setShowMapMenu(false); }}
            >
              <img src={styleIcons.dark} alt="Dark" className="w-[28px] h-[20px] rounded border border-white/30 object-cover" />
              <span className="text-sm">Dark</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Closed = ({ setIsOpen }) => {
  return (
    <div className=" z-50 h-screen  w-[60px] flex justify-center pt-[25px] bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0  before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
      <div className=" cursor-pointer" onClick={() => setIsOpen(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 20 20"><path fill="#fff" d="M7.5 3v14h9.25A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3ZM3.25 3H6v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3"></path></svg>
      </div>
    </div>
  );
};
const LeftPanel = ({setShowExcalidraw}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {isOpen && <Open setIsOpen={setIsOpen} setShowExcalidraw={setShowExcalidraw}/>}
      {!isOpen && <Closed setIsOpen={setIsOpen} />}
    </>
  );
};

export default LeftPanel;
