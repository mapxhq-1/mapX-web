import { useState } from "react";
import { useNavigate } from "react-router-dom";
function HomeSvg(){
	return(<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>)
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
      <p className="text-[20px] ml-4">{menuText}</p>
    </div>
  );
};
const Open = ({ setIsOpen }) => {
	const navigate=useNavigate();
  return (
    <div className="z-50 w-[320px] h-screen bg-[#2A2929] text-white ">
      <div className="py-[20px] flex items-end justify-between">
        <p className=" potta-one opacity-70 text-4xl ml-5">MAPX</p>
        <div
          className="cursor-pointer pt-1 pr-5"
          onClick={() => setIsOpen(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 4.5v15m-4.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125"
            />
          </svg>
        </div>
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div>
        <div
          className="px-[45px] py-[15px] flex transition-all items-center duration-500 ease-in-out select-none rounded-lg cursor-pointer relative
                                hover:bg-white/10  hover:backdrop-blur-md
                                hover:shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_4px_15px_rgba(0,0,0,0.25)]
                                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-0 hover:before:opacity-40
                                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-0 hover:after:opacity-30"
        onClick={()=>navigate("/Projects")}
		>
          <HomeSvg />
          <p className="text-[20px] ml-4">Home</p>
        </div>
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div>
        <MenuButton menuText="Select" Tag={SelectSvg} />
        <MenuButton menuText="Hand" Tag={HandSvg} />
        <MenuButton menuText="Pencil" Tag={PencilSvg} />
        <MenuButton menuText="Highlight" Tag={HighlighterSvg} />
        <MenuButton menuText="Notes" Tag={NoteSvg} />
        <MenuButton menuText="Text" Tag={TextSvg} />
        <MenuButton menuText="Hyperlink" Tag={HyperlinkSvg} />
        <MenuButton menuText="Image" Tag={ImageSvg} />
      </div>
      <div className="w-full h-0.5 bg-black/10"></div>
      <div></div>
      <div></div>
    </div>
  );
};

const Closed = ({ setIsOpen }) => {
  return (
    <div className=" z-50  h-screen w-[60px] flex justify-center pt-[25px] bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
      <div className=" cursor-pointer" onClick={() => setIsOpen(true)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 20 20"
        >
          <path
            fill="white"
            d="M12.5 3v14H3.25A2.25 2.25 0 0 1 1 14.75v-9.5A2.25 2.25 0 0 1 3.25 3Zm4.25 0H14v14h2.75A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3"
          />
        </svg>
      </div>
    </div>
  );
};
const LeftPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {isOpen && <Open setIsOpen={setIsOpen} />}
      {!isOpen && <Closed setIsOpen={setIsOpen} />}
    </>
  );
};

export default LeftPanel;
