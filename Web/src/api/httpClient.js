import axios from "axios";
import { grpcClient } from "../services/grpcClient";

const httpClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  httpsAgent: null,
  withCredentials: false,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("[Interceptor] Перехвачена ошибка 401 для:", originalRequest.url);
      
      if (isRefreshing) {
        console.log("[Interceptor] Токен уже обновляется, добавляем запрос в очередь:", originalRequest.url);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return httpClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      console.log("[Interceptor] Запускаем процесс обновления токена...");

      const refreshToken = localStorage.getItem("refresh_token");
      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        const newAccessToken = data.accessToken;
        console.log("[Interceptor] Токен успешно обновлен! Новый access_token записан.");
        
        localStorage.setItem("access_token", newAccessToken);
        grpcClient.updateToken(newAccessToken);
        
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        console.log("[Interceptor] Повторяем исходный запрос:", originalRequest.url);
        return httpClient(originalRequest);
      } catch (refreshError) {
        console.error("[Interceptor] Ошибка обновления токена, принудительный логаут", refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;