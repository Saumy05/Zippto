import axios from 'axios';
import api from '../services/api';

/**
 * Cloudinary Direct Upload Utility with Backend Fallback
 * Attempts direct signed upload first; falls back to backend /api/upload if signature fails.
 */
export const uploadToCloudinary = async (file, folder = 'appzeto', onProgress) => {
  try {
    // 1. Attempt to get signature from backend
    const signResponse = await api.get(`/upload/sign-signature?folder=${folder}`);

    if (signResponse.data?.success && signResponse.data?.signature && signResponse.data?.apiKey && signResponse.data?.cloudName) {
      const { signature, timestamp, apiKey, cloudName } = signResponse.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const response = await axios.post(cloudinaryUrl, formData, {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });

      if (response.data?.secure_url) {
        return response.data.secure_url;
      }
    }
  } catch (directErr) {
    console.warn('Direct Cloudinary upload failed, using backend upload fallback:', directErr?.message || directErr);
  }

  // 2. Seamless Fallback: Upload via backend multipart /api/upload
  try {
    const serverFormData = new FormData();
    serverFormData.append('file', file);
    const serverRes = await api.post('/upload', serverFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (serverRes.data?.imageUrl || serverRes.data?.url || serverRes.data?.secure_url) {
      return serverRes.data.imageUrl || serverRes.data.url || serverRes.data.secure_url;
    }
    throw new Error(serverRes.data?.message || 'Server upload failed');
  } catch (serverErr) {
    console.error('All upload methods failed:', serverErr);
    throw serverErr;
  }
};

export default uploadToCloudinary;
