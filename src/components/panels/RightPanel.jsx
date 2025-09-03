import React,{useState} from 'react'
function Open({setIsOpen}){
	return(<>
  <div className='h-screen w-[300px] bg-[#2A2929] text-white '>
    <div className='flex justify-between items-center pt-[30px] px-5'>
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
        <svg xmlns="http://www.w3.org/2000/svg" className='bg-zinc-500 rounded-full' width="30" height="30" viewBox="0 0 24 24"><g fill="none"><circle cx="8" cy="8" r="8" fill="#000" fill-opacity="0.25" transform="matrix(-1 0 0 1 20 4)"/><path stroke="#000" stroke-linecap="round" stroke-linejoin="round" d="M11 10.5h.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h.5m-1-7h.01" stroke-width="1.5"/></g></svg>
    </div>
    <div className='flex p-4 mt-4 items-center justify-center gap-6 rounded-lg pointer-cursor bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased'>
      <p>Share this project</p>
      <div className='bg-[#9EFAA5] rounded-lg p-0.5'>
        <svg xmlns="http://www.w3.org/2000/svg"  width="28" height="28" viewBox="0 0 28 28"><path fill="#fff" d="M12.25 3a.75.75 0 1 1 0 1.5h-5A2.75 2.75 0 0 0 4.5 7.25v13.5a2.75 2.75 0 0 0 2.75 2.75h13.5a2.75 2.75 0 0 0 2.75-2.75v-5a.75.75 0 0 1 1.5 0v5A4.25 4.25 0 0 1 20.75 25H7.25A4.25 4.25 0 0 1 3 20.75V7.25A4.25 4.25 0 0 1 7.25 3zm5.179-.928a.75.75 0 0 1 .796.098l8.25 6.75a.75.75 0 0 1 .039 1.127l-8.25 7.75A.75.75 0 0 1 17 17.25v-3.74c-1.166.036-2.463.189-3.854.802c-1.584.698-3.35 2.021-5.16 4.577l-.362.527A.75.75 0 0 1 6.25 19c0-4.406 1.34-7.56 3.51-9.608C11.738 7.527 14.325 6.656 17 6.52V2.75a.75.75 0 0 1 .429-.679m1.07 5.178a.75.75 0 0 1-.75.75c-2.66 0-5.145.772-6.959 2.483c-1.413 1.334-2.474 3.292-2.87 6.046c1.56-1.823 3.12-2.93 4.621-3.59C14.532 12.06 16.349 12 17.75 12a.75.75 0 0 1 .75.75v2.766l6.363-5.978L18.5 4.332z"/></svg>
      </div>
    </div>
  </div>
	</>);
}
function Closed({setIsOpen}){
	return (
    <div className=" z-50  h-screen w-[60px] flex justify-center pt-[25px] bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0  before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
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
}
const RightPanel = () => {
	const [isOpen,setIsOpen] = useState(false);
  return (
	<>
		{isOpen && <Open setIsOpen={setIsOpen}/>}
		{!isOpen && <Closed setIsOpen={setIsOpen}/>}
	</>
  )
}

export default RightPanel