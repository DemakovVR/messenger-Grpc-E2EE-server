import axios from "axios";
import { grpcClient } from "../services/grpcClient";

const httpClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                          originalRequest.url.includes('/auth/refresh');

    if (error.response?.status !== 401 || isAuthRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
      .then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return httpClient(originalRequest);
      })
      .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post("/api/auth/refresh", { refreshToken });
      const newAccessToken = data.accessToken;
      
      localStorage.setItem("access_token", newAccessToken);
      grpcClient.updateToken(newAccessToken);
      
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      
      isRefreshing = false;
      return httpClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      isRefreshing = false;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return Promise.reject(refreshError);
    }
  }
);

export default httpClient;