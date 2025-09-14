import React,{useRef, useState} from 'react'
import save from '../../assets/icons/save.png'
function Open({setIsOpen,project}){
  const [saveOpen,setSaveOpen] = useState(false);
  const saveRef = useRef(null);
  const [projName,setProjName] = useState(project.projectName);
  function handleNameChange(){
    setSaveOpen(false);
  }
	return(<div className='relative'>
  {saveOpen && <div ref={saveRef} className='h-[150px] w-[650px] absolute top-[25%] right-[160%] rounded-3xl flex flex-col bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] '>
    <div className='flex  items-center w-[95%] rounded-md bg-[#4D4354] text-white px-3 py-1 m-4'>
      <p className='pr-2'>Project Name : </p>
      <input type="text" value={projName} onChange={(e)=>setProjName(e.target.value)} className=' p-2 flex-1'/>
    </div>
    <button onClick={handleNameChange} className='flex h-[50px] w-[150px] cursor-pointer items-center justify-center self-center rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/10 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none hover:bg-white/40 transition-all duration-300  antialiased'>save
      <img className='h-[25px]' src={save} alt="" />
    </button>
  </div>}
  <div className=' w-[300px] h-screen bg-[#2A2929] text-white flex flex-col justify-between'>
    <div className='Top-part pt-[20px]'>
      <div className='flex justify-between items-center  px-5'>
        <div
            className="cursor-pointer pt-1 pr-5"
            onClick={() => setIsOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={30} height={30} viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth={0.5}><rect width={20} height={18} x={2} y={3} strokeLinecap="round" strokeLinejoin="round" rx={3}></rect><path d="M15 3v18"></path></g></svg>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className='bg-zinc-600 rounded-full' width="20" height="20" viewBox="0 0 24 24"><g fill="none"><circle cx="8" cy="8" r="8" fill="#000" fill-opacity="0.25" transform="matrix(-1 0 0 1 20 4)"/><path stroke="#000" stroke-linecap="round" stroke-linejoin="round" d="M11 10.5h.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h.5m-1-7h.01" stroke-width="1.5"/></g></svg>
      </div>
      <div className='flex p-2'>
        <div onClick={()=>{setSaveOpen(true)}} className='flex h-[50px] w-1/2 p-4 mx-1 mt-4 items-center justify-center gap-6 rounded-lg cursor-pointer 
          bg-white/2.5 border border-white/50 backdrop-blur-sm 
          shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] 
          hover:bg-white/30 transition-all duration-300 
          before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-20 before:pointer-events-none 
          after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/10 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased'>
          <p>Save</p>
          <div className='rounded-lg p-0.5'>
            <img src={save} alt="" />
          </div>
        </div>
        <div className='flex h-[50px] w-1/2 mx-1 p-4 mt-4 items-center justify-center gap-6 rounded-lg cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased'>
          <p>Share</p>
          <div className='bg-[#9EFAA5] rounded-lg p-0.5'>
            <svg xmlns="http://www.w3.org/2000/svg"  width="28" height="28" viewBox="0 0 28 28"><path fill="#000" d="M12.25 3a.75.75 0 1 1 0 1.5h-5A2.75 2.75 0 0 0 4.5 7.25v13.5a2.75 2.75 0 0 0 2.75 2.75h13.5a2.75 2.75 0 0 0 2.75-2.75v-5a.75.75 0 0 1 1.5 0v5A4.25 4.25 0 0 1 20.75 25H7.25A4.25 4.25 0 0 1 3 20.75V7.25A4.25 4.25 0 0 1 7.25 3zm5.179-.928a.75.75 0 0 1 .796.098l8.25 6.75a.75.75 0 0 1 .039 1.127l-8.25 7.75A.75.75 0 0 1 17 17.25v-3.74c-1.166.036-2.463.189-3.854.802c-1.584.698-3.35 2.021-5.16 4.577l-.362.527A.75.75 0 0 1 6.25 19c0-4.406 1.34-7.56 3.51-9.608C11.738 7.527 14.325 6.656 17 6.52V2.75a.75.75 0 0 1 .429-.679m1.07 5.178a.75.75 0 0 1-.75.75c-2.66 0-5.145.772-6.959 2.483c-1.413 1.334-2.474 3.292-2.87 6.046c1.56-1.823 3.12-2.93 4.621-3.59C14.532 12.06 16.349 12 17.75 12a.75.75 0 0 1 .75.75v2.766l6.363-5.978L18.5 4.332z"/></svg>
          </div>
        </div>
      </div>
      <div>
        <p className='rounded-lg p-2 bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased'>{projName}</p>
      </div>
    </div>
    <div className='Bottom-part '>
      <div>
        <div className="flex p-3 mb-1 items-center justify-center gap-6 rounded-lg cursor-pointer bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:opacity-10 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none"><path fill="#fff" d="M2.52 6.84L8.97 5l.53 11.5l-.53 11.49l-6.12 1.99a.684.684 0 0 1-.85-.66V7.5c0-.31.22-.58.52-.66M15.98 7l6.99-2l.53 11.5l-.51 11.5l-7.01 2L15 18.5z"/><path fill="#e6e6e6" d="M15.98 7L8.97 5v22.99L15.98 30zm13.42-.16L22.97 5v23l6.09 1.98c.43.11.85-.22.85-.66V7.5c0-.31-.21-.58-.51-.66"/><path fill="#00a6ed" d="M3.95 8.34L8.97 7L10 16.5L8.97 26l-4.66 1.42a.687.687 0 0 1-.87-.66V9c0-.31.21-.58.51-.66M15.94 9l7.03-1.98L24 16.5l-1.03 9.49l-7.03 2L15 18.5z"/><path fill="#0074ba" d="M15.94 9L8.97 7.02v18.97l6.97 2zm12-.66l-4.97-1.32v19l4.61 1.42c.44.12.87-.21.87-.66V9c0-.31-.21-.58-.51-.66"/><path fill="#00d26a" d="m14.32 17.64l.53-.53c.072-.063.16-.101.242-.138l.028-.012h.43c.22 0 .4-.18.4-.4v-.19c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4-.18-.4-.4v-1.19c0-.22.18-.4.4-.4h.19c.22 0 .4-.18.4-.4v-.19c0-.22.18-.4.4-.4h1.44c.1 0 .2-.03.27-.1l1.75-1.57c.08-.08.13-.19.13-.3v-.03c0-.55.45-1 1-1h.4c.33 0 .6.27.6.6c0 .22.18.4.4.4h1.19c.22 0 .4-.18.4-.4v-.19c0-.22.18-.4.4-.4h.04c.85 0 1.55.69 1.55 1.55v1.94c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.1c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4.18-.4.4v1.19c0 .22.18.4.4.4a.4.4 0 0 1 .37.55l-.88 2.19c-.06.15-.21.25-.37.25h-1.12c-.22 0-.4-.18-.4-.4v-.19c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4.18-.4.4v.19c0 .22-.18.4-.4.4h-.19c-.22 0-.4-.18-.4-.4v-.19c0-.22-.18-.4-.4-.4h-.19c-.22 0-.4.18-.4.4v.5c0 .06-.01.12-.04.18l-.91 1.83c-.03.06-.04.12-.04.18v1.24c0 .43-.17.84-.47 1.14l-.41.41a.4.4 0 0 1-.29.12h-.43c-.22 0-.4-.18-.4-.4v-2.19c0-.22-.18-.4-.4-.4h-.43a.4.4 0 0 1-.29-.12l-.53-.53c-.22-.22-.35-.53-.35-.85s.12-.62.35-.85m-3.35 5.85c0 .28-.22.5-.5.5c-.27 0-.5-.22-.48-.47v-1.37a.3.3 0 0 0-.09-.22l-.38-.38c-.34-.34-.53-.81-.53-1.29v-1.12a.3.3 0 0 0-.09-.22l-1.25-1.25c-.134-.134-.351-.283-.586-.444c-.499-.343-1.074-.737-1.074-1.146v-2.36c0-.192.165-.367.286-.495c.124-.133.202-.215.004-.215c-.19 0-.37.08-.5.21l-1.26 1.26c-.2.19-.53.06-.53-.22v-.13c0-.08.03-.16.09-.22l.24-.24c.42-.42.66-1 .66-1.6v-.37c0-.38.31-.69.69-.69h.62c.38 0 .69.31.69.69c0 .17.14.31.31.31h.1c.46 0 .9-.19 1.21-.53l.62-.67c.48-.51 1.15-.8 1.85-.8h1.6c.72 0 1.3.58 1.3 1.3c0 .45-.18.88-.5 1.2l-.41.41a.3.3 0 0 0-.09.22v.37c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-2c0-.28-.22-.5-.5-.5s-.5.22-.5.5v.19c0 .17-.14.31-.31.31h-.78c-.18 0-.32.14-.31.32l.02.35c.01.17-.13.32-.31.32c-.17 0-.31.14-.31.31v.19c0 .28.22.5.5.5s.5-.22.5-.5s.22-.5.5-.5s.5.22.5.5v.37c0 .08.03.16.09.22l.69.69c.12.12.12.32 0 .44l-.29.29c-.31.31-.74.49-1.18.49c-.17 0-.31.14-.31.31v.19c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.19c0-.17-.14-.31-.31-.31h-.38c-.17 0-.31.14-.31.31v.56c0 .08.03.16.09.22l1.82 1.82c.06.06.14.09.22.09h.44c.28 0 .56.06 .81 .19l1.17 .58c.28 .13 .45 .41 .45 .72c0 .3 -.18 .58 -.45 .72l-.61 .31c-.58 .29 -.94 .87 -.94 1.52zm11-3.98c0 .31 .11 .61 .3 .85l.21 .25c.3 .37 .79 .54 1.25 .43a.31 .31 0 0 0 .24 -.3v-.37c0 -.16 .12 -.29 .27 -.31l.15 -.02c.31 -.03 .58 .21 .58 .52c0 .24 .17 .46 .41 .51l.22 .05c.19 .04 .37 -.1 .37 -.3v-.84c0 -.55 -.45 -1 -1 -1h-.86c-.09 0 -.17 .04 -.23 .1l-.37 .41a.31 .31 0 0 1 -.54 -.21c0 -.17 -.14 -.31 -.31 -.31h-.38c-.17 .02 -.31 .16 -.31 .33zm1.5 4.49c-.28 0 -.5 -.22 -.5 -.5v-.67c0 -.46 .37 -.84 .83 -.84h1.61c.31 0 .56 .25 .56 .56v.95c0 .28 -.22 .5 -.5 .5z"/></g></svg>
          <p className="text-[20px]">Map Settings</p>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="24" viewBox="0 0 12 24"><defs><path id="SVG1pzpbdYY" fill="#676767" d="m7.588 12.43l-1.061 1.06L.748 7.713a.996.996 0 0 1 0-1.413L6.527.52l1.06 1.06l-5.424 5.425z"/></defs><use fill-rule="evenodd" href="#SVG1pzpbdYY" transform="rotate(-180 5.02 9.505)"/></svg>
        </div>
      </div>
    </div>
  </div>
	</div>);
}
function Closed({setIsOpen}){
	return (
    <div className=" z-50 h-screen  w-[60px] flex justify-center pt-[25px] bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0  before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased">
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
const RightPanel = ({project}) => {
	const [isOpen,setIsOpen] = useState(false);
  return (
	<>
		{isOpen && <Open setIsOpen={setIsOpen} project={project}/>}
		{!isOpen && <Closed setIsOpen={setIsOpen}/>}
	</>
  )
}

export default RightPanel