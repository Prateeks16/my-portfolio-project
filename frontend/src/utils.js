import { API_BASE_URL } from './api';

export const getImageUrl = (imagePath) => {
  if (!imagePath) return "https://placehold.co/400x400?text=No+Image";

  // 1. Agar full URL hai (Cloudinary/External)
  if (imagePath.startsWith('http') || imagePath.startsWith('https')) {
    return imagePath;
  }

  // 2. Agar Cloudinary ka partial path hai (Backend se bina domain ke)
  if (imagePath.startsWith('image/upload/')) {
    const CLOUD_NAME = "dnkzf5hvi"; // Aapka Cloud Name
    return `https://res.cloudinary.com/${CLOUD_NAME}/${imagePath}`;
  }

  // 3. Agar Local Path hai
  const cleanBaseUrl = API_BASE_URL.replace(/\/$/, ""); 
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${cleanBaseUrl}${cleanPath}`;
};