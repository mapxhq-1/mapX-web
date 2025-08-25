import React from 'react'
import { useNavigate } from 'react-router-dom'

const NewProjectCard = () => {
  const navigate = useNavigate();
  return (
    <>
      <div className='bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none antialiased  h-[196px] rounded-xl flex justify-center items-center shrink-0 '>
          <button onClick={()=>navigate("/")} className='hover:scale-107 duration-700 ease-in-out cursor-pointer py-2 pl-5 pr-6 bg-[#B2FF89] rounded-lg shadow-black shadow-lg/50'>
            <p>+ New</p>
          </button>
      </div>
    </>
  )
}

export default NewProjectCard