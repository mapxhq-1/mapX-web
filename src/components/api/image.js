import axios from "axios";
const BASE_URL = import.meta.env.VITE_URL_PROJECT +  "/layers";

export async function fetchAllImages(projectId, year, era) {
  try{
    const token = localStorage.getItem('bearerToken');
    const res = await axios.get(BASE_URL+'/get-all-images-by-project-id-year-in-timeline' , {
        headers: { client_name: "mapx","Authorization": `Bearer ${token}` },
        params:{projectId,year,era},
    });
    return res.data.images;
  }catch(err){}
}

export async function uploadNewImage(projectId, email, latitude, longitude, imageFile, caption, year, era) {
  const token = localStorage.getItem('bearerToken');
  const formData = new FormData();
  formData.append('projectId', String(projectId));
  formData.append('email', String(email));
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  formData.append('imageFile', imageFile, imageFile?.name || 'image.jpg');
  formData.append('caption', String(caption));
  formData.append('year', String(year));
  formData.append('era', String(era));

  const res = await axios.post(BASE_URL+'/upload-new-image', formData, {
    headers: { client_name: 'mapx',"Authorization": `Bearer ${token}` },
  });

  return res.data; // ImageUploadResponse
}

export async function fetchImageById(imageName) {
  const token = localStorage.getItem('bearerToken');
  const res = await axios.get(
    BASE_URL+`/fetch-image-content/${encodeURIComponent(imageName)}`,
    {
      headers: { client_name: "mapx","Authorization": `Bearer ${token}` },
      responseType: "arraybuffer", // 👈 this is the key
    }
  );
  // convert arraybuffer → blob → object URL
  const blob = new Blob([res.data], { type: "image/png" });
  const url = URL.createObjectURL(blob);

  return url; // usable directly in <img src={url} />
}

export async function updateImage(imageId, email, imageFile, caption, year, era) {
  const token = localStorage.getItem('bearerToken');
  const formData = new FormData();
  formData.append('email', String(email));
  formData.append('imageFile', imageFile, imageFile?.name || 'image.jpg');
  formData.append('caption', String(caption));
  formData.append('year', String(year));
  formData.append('era', String(era));
  const res = await axios.put(
    BASE_URL+`/update-image-by-id/${encodeURIComponent(imageId)}`,
    formData,
    { headers: { client_name: 'mapx',"Authorization": `Bearer ${token}` } } // don't set Content-Type manually
  );
  return res.data; // ImageUploadResponse
}

export async function deleteImage(imageId,email){
  const token = localStorage.getItem('bearerToken');
    const res = await axios.delete(BASE_URL+'/delete-image-by-id/'+imageId,{params:{email},headers:{client_name:"mapx","Authorization": `Bearer ${token}`}})
    return res;
}

export async function fetchAllImagesByProject(projectId) {
  const token = localStorage.getItem('bearerToken');
    const res = await axios.get(BASE_URL+'/get-all-image-by-project-id', {
        headers: { client_name: "mapx","Authorization": `Bearer ${token}` },
        params: { projectId }
    });
    return res.data.images || [];
}