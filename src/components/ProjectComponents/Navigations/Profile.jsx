import { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { updateUserProfile, uploadProfilePhoto, deleteProfilePhoto } from '../../api/auth';

const Profile = ({ setProfileOpen, userId, email, profilePictureUrl, fetchProfile, userData }) => {

    const { register, handleSubmit, reset } = useForm();
    const divRef = useRef(null);
    const fileInputRef = useRef(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (userData) {
            let phone = userData.phone || '';
            let country_code = '+91';

            if (phone.startsWith('+')) {
                country_code = phone.slice(0, 3);
                phone = phone.slice(3);
            }

            reset({
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                phone: phone,
                country_code: country_code,
                gender: userData.gender || '',
                birthdate: userData.birthdate || '',
                organization: userData.organization || '',
                role: userData.role || '',
            });
        }
        return () => setMounted(false);
    }, [userData, reset]);

    useEffect(() => {
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
            const fullPhone = `${data.country_code}${data.phone.replace(/\s+/g, '')}`;
            const payload = { ...data, phone: fullPhone };
            delete payload.country_code;

            await updateUserProfile(userId, payload);
            toast.success("Profile updated successfully!");
            setProfileOpen(false);
            await fetchProfile();
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
            toast.error("Failed to upload photo. " + error.response.statusText);
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

    // --- RENDER CONTENT ---
    
    // Check if mounted to avoid hydration errors
    if (!mounted) return null;

    const inputClass = "w-full bg-zinc-800 border border-zinc-700/50 text-white text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 transition-colors placeholder-zinc-500 shadow-sm";
    const labelClass = "block mb-1.5 text-sm font-medium text-zinc-400 ml-1";

    const modalContent = (
        <div className='fixed inset-0 flex items-center justify-center z-[9999] px-4 font-sans'>
            
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            {/* Modal Container */}
            <div ref={divRef} className='relative bg-[#18181b]/90 backdrop-blur-md text-white w-full max-w-4xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col'>
                
                {/* Header with Black Separator */}
                <div className='flex justify-between items-center px-8 py-5 border-b border-black bg-[#18181b]/50'>
                    <h2 className='text-xl font-bold text-gray-100 tracking-wide'>Edit Profile</h2>
                    <button onClick={() => setProfileOpen(false)} className='text-zinc-400 hover:text-white hover:bg-black/30 rounded-xl transition-all p-2'>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body Content */}
                {!userData ? (
                     <div className='flex items-center justify-center h-64'>
                        <p className="text-white font-medium animate-pulse">Loading Profile...</p>
                    </div>
                ) : (
                    <div className='overflow-y-auto p-6 md:p-8 custom-scrollbar'>
                        <div className='flex flex-col md:flex-row gap-8'>
                            
                            {/* LEFT: Photo */}
                            <div className='flex flex-col items-center md:items-start md:w-1/3 space-y-5'>
                                <div className="relative group">
                                    <img 
                                        className='h-36 w-36 object-cover rounded-full border-4 border-zinc-800 shadow-2xl' 
                                        src={profilePictureUrl} 
                                        alt="Profile" 
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]" onClick={() => fileInputRef.current.click()}>
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Change</span>
                                    </div>
                                </div>
                                
                                <div className='flex flex-col items-center md:items-start w-full'>
                                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/png, image/jpeg" className='hidden' />
                                    
                                    <div className='flex gap-3 mt-2'>
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current.click()} 
                                            className='px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-colors'
                                        >
                                            Upload New
                                        </button>
                                        {userData.picture && (
                                            <button 
                                                type="button" 
                                                onClick={handlePhotoDelete} 
                                                className='px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors'
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className='mt-6 text-center md:text-left'>
                                        <h3 className='text-xl font-bold text-white'>{`${userData.first_name || 'User'} ${userData.last_name || ''}`}</h3>
                                        <p className='text-sm text-zinc-500 break-all font-medium'>{email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Form */}
                            <div className='md:w-2/3'>
                                <form onSubmit={handleSubmit(formSubmit)} className='space-y-6'>
                                    
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                                        <div>
                                            <label htmlFor="first_name" className={labelClass}>First Name</label>
                                            <input {...register("first_name")} type="text" id='first_name' className={inputClass} placeholder="John" />
                                        </div>
                                        <div>
                                            <label htmlFor="last_name" className={labelClass}>Last Name</label>
                                            <input {...register("last_name")} type="text" id='last_name' className={inputClass} placeholder="Doe" />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className={labelClass}>Phone Number</label>
                                        <div className="flex">
                                            <select
                                                id="country_code"
                                                {...register("country_code")}
                                                className="bg-zinc-800 border border-zinc-700/50 text-white text-sm rounded-l-xl border-r-0 focus:ring-blue-500 focus:border-blue-500 block p-3 w-24 outline-none shadow-sm"
                                            >
                                                <option value="+44">+44</option>
                                                <option value="+91">+91</option>
                                                <option value="+61">+61</option>
                                                <option value="+81">+81</option>
                                                <option value="+49">+49</option>
                                                <option value="+33">+33</option>
                                            </select>
                                            <input
                                                {...register("phone")}
                                                type="text"
                                                id="phone"
                                                placeholder="12345 67890"
                                                className="bg-zinc-800 border border-zinc-700/50 text-white text-sm rounded-r-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-3 outline-none shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                                        <div>
                                            <label htmlFor="gender" className={labelClass}>Gender</label>
                                            <select {...register("gender")} id="gender" className={inputClass}>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="birthdate" className={labelClass}>Date of Birth</label>
                                            <input {...register("birthdate")} type="date" id='birthdate' className={inputClass} />
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                                        <div>
                                            <label htmlFor="organization" className={labelClass}>Organization</label>
                                            <input {...register("organization")} type="text" id='organization' className={inputClass} placeholder="School or Company Name" />
                                        </div>
                                        <div>
                                            <label htmlFor="role" className={labelClass}>Role</label>
                                            <select {...register("role")} id="role" className={inputClass}>
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
                                    </div>

                                    {/* Action Buttons */}
                                    <div className='pt-6 flex gap-3 justify-end border-t border-black mt-2'>
                                        <button 
                                            type="button" 
                                            onClick={() => setProfileOpen(false)} 
                                            className='px-6 py-3 text-sm font-medium text-zinc-400 bg-transparent border border-zinc-700 rounded-xl hover:bg-black/30 hover:text-white transition-all'
                                        >
                                            Cancel
                                        </button>
                                        <button 
    type="submit" 
    className="relative px-6 py-3 rounded-xl bg-white text-black font-medium text-sm overflow-hidden group border border-zinc-200 transition-colors"
>
    {/* The Pastel Green Background Animation Layer */}
    <span className="absolute bottom-0 left-0 w-full h-full bg-emerald-300 origin-bottom scale-y-0 transition-transform duration-300 ease-out group-hover:scale-y-100"></span>

    {/* The Text (z-10 ensures it stays on top of the green layer) */}
    <span className="relative z-10 transition-colors">
        Save Changes
    </span>
</button>
                                    </div>

                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default Profile;