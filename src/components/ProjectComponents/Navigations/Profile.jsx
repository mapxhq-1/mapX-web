import {useRef, useEffect} from 'react'
import { useForm } from 'react-hook-form';

const Profile = ({setProfileOpen}) => {
    const userData={
        "first_name": "Saptarsi",
        "last_name": "Halder",
        "phone": "+393928702396",
        "picture": "https://mypicture.com",
        "website": "https://github.com/sap200",
        "gender": "male",
        "birthdate": "2000-08-07",
        "organization": "kv school, belgaum",
        "role": "Principal"
    }
    const {register, handleSubmit} = useForm();
    const divRef=useRef(null);
    useEffect(()=>{
        const handleProfile=(event)=>{
            if(divRef.current && !divRef.current.contains(event.target)){
                setProfileOpen(false);
            }
        }
        document.addEventListener("mousedown",handleProfile);

        return ()=>{
            document.removeEventListener("mousedown",handleProfile);
        }
    },[]);
    const formSubmit = (data)=>{
        setProfileOpen(false);
    }
  return (
    <div className='fixed inset-0 flex items-center justify-center z-50'>
        <div className="absolute inset-0 bg-black opacity-75"></div>
        <div ref={divRef} className='fixed  top-10 bg-[#1F1F1F] max-h-180 px-30 py-15 rounded-xl overflow-y-scroll'>
            <div>
                <p className='mb-2 ml-5'>Profile</p>
                <div className=' ml-5 w-12 rounded-t-full bg-blue-600 h-1'></div>
                <div className='w-full h-[1px] bg-white'></div>
            </div>
            <div className='flex mt-5'>
                <div className='mr-8'>
                    <img className='h-[50px] w-[50px] object-cover rounded-full' src="https://i.pinimg.com/originals/5b/d3/d8/5bd3d84ec587abcd897e556237e46c6e.jpg" alt="" />
                </div>
                <div className='flex flex-col'>
                    <p className='font-semibold'>{`${userData.first_name} ${userData.last_name}`}</p>
                    <p className=' font-thin'>Update your information and manage your account settings</p>
                    <form action="" onSubmit={handleSubmit(formSubmit)} className='mt-5'>

                    <label htmlFor="first_name">First name</label>
                    <br />
                    <input {...register("first_name")} type="text" id='first_name' className=' bg-zinc-200 px-5 py-2 m-2 w-100 rounded-lg text-black'placeholder='First name' name='first_name' value={userData.first_name}/>
                    <br />
                    <label htmlFor="last_name">Last name</label>
                    <br />
                    <input {...register("last_name")} type="text" id='last_name' className=' bg-zinc-200 px-5 py-2 m-2 w-100 rounded-lg text-black'placeholder='Last name' name='last_name' value={userData.last_name}/>
                    <br />
                    <label htmlFor="phone">Phone</label>
                    <br />
                    <input {...register("phone")} type="text" id='phone' placeholder='Phone' className='email bg-zinc-200 px-5 py-2 m-2 w-100 rounded-lg text-black' name='phone' value={userData.phone} />
                    <br />

                    <label htmlFor="gender">Gender</label>
                    <br />
                    <select {...register("gender")} name="gender" id="gender" value={userData.gender} className='w-100 m-2 bg-zinc-200 px-5 py-2 rounded-lg text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer'>
                        <option className='cursor-pointer' value="male" >Male</option>
                        <option className='cursor-pointer' value="female">Female</option>
                    </select>
                    <br />

                    <label htmlFor="website">Website</label>
                    <br />
                    <input {...register("website")} type="text" id='website' className='website px-5 py-2 bg-zinc-200 m-2 w-100 rounded-lg text-black' placeholder='Website' value={userData.website}/>
                    <br />

                    <label htmlFor="birthdate">Birthday</label>
                    <br />
                    <input {...register("birthdate")} type="date" id='birthdate' className='website px-5 py-2 bg-zinc-200 m-2 w-100 rounded-lg text-black' placeholder='Website' value={userData.birthdate}/>
                    <br />

                    <label htmlFor="organization">Organization</label>
                    <br />
                    <input {...register("organization")} type="input" id='organization' className='website px-5 py-2 bg-zinc-200 m-2 w-100 rounded-lg text-black' placeholder='Organization' value={userData.organization}/>
                    <br />

                    <label htmlFor="role">Role</label>
                    <br />
                    <input {...register("role")} type="input" id='role' className='website px-5 py-2 bg-zinc-200 m-2 w-100 rounded-lg text-black' placeholder='Role' value={userData.role}/>
                    <br />

                    <input type="submit" className='w-100 m-2 mt-4 bg-blue-500 text-white  py-3 rounded-lg cursor-pointer' value="Submit"/>
                    </form>
                </div>
            </div>
        </div>
    </div>
  )
}

export default Profile