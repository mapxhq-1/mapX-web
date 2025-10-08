import { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getUserProfile, updateUserProfile, uploadProfilePhoto, deleteProfilePhoto } from '../../api/auth';

const Profile = ({ setProfileOpen, userId, email }) => {
    const [userData, setUserData] = useState(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState("https://i.pinimg.com/originals/5b/d3/d8/5bd3d84ec587abcd897e556237e46c6e.jpg");
    const { register, handleSubmit, reset } = useForm();
    const divRef = useRef(null);
    const fileInputRef = useRef(null);

    const fetchProfile = async () => {
        if (!userId) return;
        try {
            const profile = await getUserProfile(userId);
            setUserData(profile);
            reset(profile);

            if (profile?.picture) {
                try {
                    const response = await axios.get(
                        `/auth-service/fetch-profile-photo/${profile.picture}`,
                        {
                            params: { email },
                            headers: { client_name: "mapx" },
                            responseType: 'blob'
                        }
                    );
                    const imageUrl = URL.createObjectURL(response.data);
                    setProfilePictureUrl(imageUrl);
                } catch (imgError) {
                    console.error("Failed to fetch profile image:", imgError);
                    setProfilePictureUrl("https://i.pinimg.com/originals/5b/d3/d8/5bd3d84ec587abcd897e556237e46c6e.jpg");
                }
            } else {
                setProfilePictureUrl("https://i.pinimg.com/originals/5b/d3/d8/5bd3d84ec587abcd897e556237e46c6e.jpg");
            }

        } catch (error) {
            toast.error("Failed to load profile data.");
        }
    };

    useEffect(() => {
        fetchProfile();
        const handleOutsideClick = (event) => {
            if (divRef.current && !divRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const formSubmit = async (data) => {
        try {
            await updateUserProfile(userId, data);
            toast.success("Profile updated successfully!");
            await fetchProfile();
            setTimeout(() => setProfileOpen(false), 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile.");
        }
    };
    
    const handlePhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            await uploadProfilePhoto(userId, email, file);
            toast.success("Profile photo updated!");
            fetchProfile();
        } catch (error) {
            toast.error("Failed to upload photo.");
        }
    };

    const handlePhotoDelete = async () => {
        if (!window.confirm("Are you sure you want to delete your profile photo?")) return;
        try {
            await deleteProfilePhoto(userId, email);
            toast.success("Profile photo deleted.");
            fetchProfile();
        } catch (error) {
            toast.error("Failed to delete photo.");
        }
    };
    
    if (!userData) {
        return (
            <div className='fixed inset-0 flex items-center justify-center z-50'>
                <div className="absolute inset-0 bg-black opacity-75"></div>
                <p className="text-white">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className='fixed inset-0 flex items-center justify-center z-50'>
            <div className="absolute inset-0 bg-black opacity-75"></div>
            <div ref={divRef} className='fixed top-10 bg-[#1F1F1F] text-white max-h-[90vh] px-8 py-6 rounded-xl overflow-y-auto'>
                <div>
                    <p className='mb-2 ml-5 text-lg font-semibold'>Profile</p>
                    <div className='ml-5 w-12 rounded-t-full bg-blue-600 h-1'></div>
                    <div className='w-full h-[1px] bg-gray-600'></div>
                </div>
                <div className='flex mt-5'>
                    <div className='mr-8 flex flex-col items-center space-y-2 w-24'>
                        <img className='h-[80px] w-[80px] object-cover rounded-full' src={profilePictureUrl} alt="Profile" />
                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/png, image/jpeg" style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current.click()} className='text-sm text-blue-400 hover:underline whitespace-nowrap'>Change Photo</button>
                        {userData.picture && <button onClick={handlePhotoDelete} className='text-sm text-red-400 hover:underline'>Delete</button>}
                    </div>

                    <div className='flex flex-col'>
                        <p className='font-semibold'>{`${userData.first_name || ''} ${userData.last_name || ''}`}</p>
                        <p className='font-thin text-gray-400'>Update your information and manage your account settings</p>
                        
                        <form onSubmit={handleSubmit(formSubmit)} className='mt-5 space-y-4'>
                            <div>
                                <label htmlFor="first_name">First name</label>
                                <input {...register("first_name")} type="text" id='first_name' className='bg-zinc-700 px-3 py-2 mt-1 w-full rounded-lg' />
                            </div>
                            <div>
                                <label htmlFor="last_name">Last name</label>
                                <input {...register("last_name")} type="text" id='last_name' className='bg-zinc-700 px-3 py-2 mt-1 w-full rounded-lg' />
                            </div>
                            <div>
                                <label htmlFor="phone">Phone</label>
                                <input {...register("phone")} type="text" id='phone' className='bg-zinc-700 px-3 py-2 mt-1 w-full rounded-lg' />
                            </div>
                            <div>
                                <label htmlFor="gender">Gender</label>
                                <select {...register("gender")} id="gender" className='w-full bg-zinc-700 px-3 py-2 mt-1 rounded-lg'>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* ⬇️ WEBSITE FIELD REMOVED ⬇️ */}

                            <div>
                                <label htmlFor="birthdate">Birthday</label>
                                <input {...register("birthdate")} type="date" id='birthdate' className='bg-zinc-700 px-3 py-2 mt-1 w-full rounded-lg' />
                            </div>
                            <div>
                                <label htmlFor="organization">Organization</label>
                                <input {...register("organization")} type="text" id='organization' className='bg-zinc-700 px-3 py-2 mt-1 w-full rounded-lg' />
                            </div>
                            
                            {/* ⬇️ ROLE INPUT CHANGED TO A DROPDOWN ⬇️ */}
                            <div>
                                <label htmlFor="role">Role</label>
                                <select {...register("role")} id="role" className='w-full bg-zinc-700 px-3 py-2 mt-1 rounded-lg'>
                                    <option value="" disabled>Select a role...</option>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="Parents/Guardian">Parents/Guardian</option>
                                    <option value="Principal">Principal</option>
                                    <option value="administrative management">Administrative Management</option>
                                    <option value="IT support Staff">IT Support Staff</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <input type="submit" className='w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg cursor-pointer' value="Save Changes" />
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;