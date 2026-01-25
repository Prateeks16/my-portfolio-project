import axios from 'axios';

// Aapka Django Backend URL
export const API_BASE_URL = "http://127.0.0.1:8000";

// Axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export default api;