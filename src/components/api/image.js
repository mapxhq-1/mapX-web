import axios from "axios";
export async function fetchAllImages(projectId, year, era) {
    
    const res = await axios.get('/project-management-service/get-all-images-by-project-id-year-in-timeline' , {
        headers: { client_name: "mapx" },
        params:{projectId,year,era},
    });
    return res.data.images;
}

export async function uploadNewImage(projectId, email, latitude, longitude, imageFile, caption, year, era) {
  const formData = new FormData();
  formData.append('projectId', String(projectId));
  formData.append('email', String(email));
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  formData.append('imageFile', imageFile, imageFile?.name || 'image.jpg');
  formData.append('caption', String(caption));
  formData.append('year', String(year));
  formData.append('era', String(era));

  const res = await axios.post('/project-management-service/upload-new-image', formData, {
    headers: { client_name: 'mapx' },
  });

  return res.data; // ImageUploadResponse
}

export async function fetchImageById(imageName) {
  const res = await axios.get(
    `/project-management-service/fetch-image-content/${encodeURIComponent(imageName)}`,
    {
      headers: { client_name: "mapx" },
      responseType: "arraybuffer", // 👈 this is the key
    }
  );
  // convert arraybuffer → blob → object URL
  const blob = new Blob([res.data], { type: "image/png" });
  const url = URL.createObjectURL(blob);

  return url; // usable directly in <img src={url} />
}

export async function updateImage(imageId, email, imageFile, caption, year, era) {
  const formData = new FormData();
  formData.append('email', String(email));updateImage
  formData.append('imageFile', imageFile, imageFile?.name || 'image.jpg');
  formData.append('caption', String(caption));
  formData.append('year', String(year));
  formData.append('era', String(era));
  const res = await axios.put(
    `/project-management-service/update-image-by-id/${encodeURIComponent(imageId)}`,
    formData,
    { headers: { client_name: 'mapx' } } // don't set Content-Type manually
  );
  return res.data; // ImageUploadResponse
}

export async function deleteImage(imageId,email){
    const res = await axios.delete('/project-management-service/delete-image-by-id/'+imageId,{params:{email},headers:{client_name:"mapx"}})
    return res;
}