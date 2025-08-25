import React from 'react'
import publicIcon from '../../../assets/icons/public.png'
import privateIcon from '../../../assets/icons/private.png'
const ProjectCard = ({data}) => {
  function getDate(timestramp){
    return timestramp.split("T")[0]
  }
  return (
    <div className='max-w-[269px] hover:scale-105 duration-700 ease-in-out cursor-pointer shrink-0'>
        <div className='relative'>
          <div className='absolute right-1.5 top-1.5 p-1 bg-zinc-100 rounded-full'>
          <img className='' src={data.accessorList.length==0?privateIcon:publicIcon} alt="" />
          </div>
          <img className='w-[269px] h-[196px] object-cover rounded-lg border-1 border-zinc-600' src="https://media.sciencephoto.com/c0/27/58/65/c0275865-800px-wm.jpg" alt="" />
        </div>
        <div className='flex place-content-between items-center'>
            <h1 className='font-semibold text-white'>{data.projectName}</h1>
            <p className='text-sm text-zinc-400'>{getDate(data.updatedAt)}</p>
        </div>
    </div>
  )
}

export default ProjectCard