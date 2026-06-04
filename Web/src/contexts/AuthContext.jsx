import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { grpcClient } from "../services/grpcClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");
    const username = localStorage.getItem("username");

    if (token && userId) {
      setUser({ token, id: userId, username });
      grpcClient.connect(userId, token);
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);

    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    
    let userId = data.userId;
    let userName = data.username || username;
    
    if (!userId) {
      try {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        userId = payload.userId;
        userName = payload.username || username;
        localStorage.setItem("user_id", userId);
        localStorage.setItem("username", userName);
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    } else {
      localStorage.setItem("user_id", userId);
      localStorage.setItem("username", userName);
    }

    setUser({
      token: data.accessToken,
      id: userId,
      username: userName,
    });

    grpcClient.connect(userId, data.accessToken);

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
    localStorage.removeItem("username");

    grpcClient.disconnect();

    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token");
    
    const data = await authApi.refresh(refreshToken);
    const newAccessToken = data.accessToken;
    
    localStorage.setItem("access_token", newAccessToken);
    
    if (user) {
      setUser({ ...user, token: newAccessToken });
    }
    
    grpcClient.updateToken(newAccessToken);
    
    return newAccessToken;
  }, [user]);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    return await authApi.changePassword(oldPassword, newPassword);
  }, []);

  const setupInterceptors = useCallback(() => {
    return () => {};
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshAccessToken,
        changePassword,
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