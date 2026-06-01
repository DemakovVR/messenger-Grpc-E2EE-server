import axios from "axios";

const httpClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  httpsAgent: null,
  withCredentials: false,
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  console.log("Token from localStorage:", token);
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("Authorization header set:", config.headers.Authorization);
  }
  
  return config;
});

export default httpClient;