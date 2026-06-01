import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");

    if (token && userId) {
      setUser({ token, id: userId });
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);

    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    
    let userId = data.user_id;
    
    if (!userId) {
      try {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        userId = payload.user_id;
        localStorage.setItem("user_id", userId);
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    } else {
      localStorage.setItem("user_id", userId);
    }

    setUser({
      token: data.accessToken,
      id: userId,
    });

    return data;
  };

  const register = async (username, email, password) => {
    return await authApi.register(username, email, password);
  };

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    try {
      await authApi.logout(refreshToken);
    } catch (e) {
      console.error("Logout error:", e);
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");

    setUser(null);
  }, []);

  const setupInterceptors = useCallback((httpClient) => {
    const interceptor = httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await logout();
          window.location.href = "/";
        }
        return Promise.reject(error);
      }
    );

    return () => httpClient.interceptors.response.eject(interceptor);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuth: !!user,
        setupInterceptors,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}