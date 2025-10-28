import { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { updateUserProfile, uploadProfilePhoto, deleteProfilePhoto } from '../../api/auth';

const Profile = ({ setProfileOpen, userId, email,profilePictureUrl,fetchProfile,userData }) => {
    
    const { register, handleSubmit, reset } = useForm();
    const divRef = useRef(null);
    const fileInputRef = useRef(null);
useEffect(() => {
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
    // Combine country code + phone, removing spaces
    const fullPhone = `${data.country_code}${data.phone.replace(/\s+/g, '')}`;
    
    const payload = {
      ...data,
      phone: fullPhone, // replace phone field with full number
    };
    delete payload.country_code; // we don’t need to send this separately

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
            toast.error("Failed to upload photo. "+error.response.statusText);
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
  <div className="flex mt-1">
    {/* Country code dropdown */}
    <select
      id="country_code"
      {...register("country_code")}
      defaultValue={userData?.country_code || "+91"}
      className="bg-zinc-700 px-2 py-2 rounded-l-lg border-r border-gray-600 focus:outline-none"
    >
      <option value="+44">+44 (UK)</option>
      <option value="+91">+91 (India)</option>
      <option value="+61">+61 (Australia)</option>
      <option value="+81">+81 (Japan)</option>
      <option value="+49">+49 (Germany)</option>
      <option value="+33">+33 (France)</option>
    </select>

    {/* Phone number input */}
    <input
      {...register("phone")}
      type="text"
      id="phone"
      placeholder="Enter phone number"
      className="bg-zinc-700 px-3 py-2 w-full rounded-r-lg"
    />
  </div>
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