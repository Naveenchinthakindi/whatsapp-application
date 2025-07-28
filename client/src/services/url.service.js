import axios from "axios";
const API_URL = `${import.meta.env.VITE_APP_API_URL}/api`;
const BASE_URL =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_DEV_URL
    : import.meta.env.VITE_PROD_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default axiosInstance;