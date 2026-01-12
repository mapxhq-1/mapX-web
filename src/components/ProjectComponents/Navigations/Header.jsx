import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import searchicon from '../../../assets/icons/searchicon.png'
import sortimg from '../../../assets/icons/sort.png'
import { useSelector,useDispatch } from 'react-redux'
import { setSearch,setOption } from '../../../store/projectSlice'
import  i18next from "i18next";
const Header = () => {
  const {search,option,heading} = useSelector(state=>state.project);
  const dispatch = useDispatch();
  const [sort,setSort] = useState(false);
  const dropDown=useRef(null);
  const handleSortButton=(givenOption)=>{
    dispatch(setOption(givenOption));
  }
  useEffect(()=>{
    const handleClickOutside=(event)=>{
      if(dropDown.current && !dropDown.current.contains(event.target)){
        setSort(false);
      }
    }
    document.addEventListener("mousedown",handleClickOutside);
    return ()=>{
      document.removeEventListener("mousedown",handleClickOutside);
    }
  },[])
  return (
    <>
      <div className='flex items-center relative p-5 justify-between bg-[#1F1F1F] text-white border-1 border-zinc-600 z-1'>
        <Link className='flex gap-3 cursor-pointer' to="/">
          <p className='potta-one text-2xl tracking-[0.05em] ml-5'>{i18next.t('title')}</p>
        </Link>
        <div>
          <p className='text-2xl absolute left-1/4'>{heading}</p>
        </div>
        <div className='flex '>
          <button onClick={()=>setSort(!sort)}>
            <div className='flex cursor-pointer hover:scale-105 duration-300 ease-in-out  bg-[#EAEAEA]/20 px-5 py-2 rounded-lg'>
              <img className='object-cover h-[20px]' src={`${sortimg}`} alt="" />
              <p className=' pl-1 text-sm font-thin'>Sort by</p>
            </div>
          </button>
          {sort &&(
            <div ref={dropDown} className='bg-[#EAEAEA]/20 absolute top-15 rounded-lg flex flex-col z-50'>
              <button className={`hover:${option=="Alphabetical"?"bg-[#A3C8FD]/20":"bg-blue-100"} hover:scale-105 w-full rounded-lg duration-700 ease-in-out ${option=="Alphabetical"?"bg-[#A3C8FD] text-black":"bg-[#EAEAEA]/20"}`} onClick={()=>handleSortButton("Alphabetical")}>
                <div className='px-4 py-2 rounded-lg cursor-pointer'>
                  <p>Alphabetical</p>
                </div>
              </button>
              <button className={`hover:${option=="Date"?"bg-[#A3C8FD]/20":"bg-blue-100"} hover:scale-105 w-full rounded-lg duration-700 ease-in-out ${option=="Date"?"bg-[#A3C8FD] text-black":"bg-[#EAEAEA]/20"}`} onClick={()=>handleSortButton("Date")}>
                <div className='px-4 py-2 rounded-lg cursor-pointer '>
                  <p>Date</p>
                </div>
              </button>
            </div>
          )}
          <div className='flex ml-3 bg-[#EAEAEA]/20 px-5 py-2 rounded-lg hover:scale-105 duration-300 ease-in-out'>
            <img className='object-cover h-[20px]' src={`${searchicon}`} alt="" />
            <input type='input' value={search} onChange={(e)=>dispatch(setSearch(e.target.value))} className='pl-1 text-sm font-thin focus:outline-none' placeholder='Search Projects...' />
          </div>
        </div>
      </div>
    </>
  )
}

export default Header