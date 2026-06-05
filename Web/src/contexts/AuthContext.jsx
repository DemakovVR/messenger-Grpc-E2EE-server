import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { grpcClient } from "../services/grpcClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState(() => {
    const saved = localStorage.getItem("blockedUsers");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("blockedUsers", JSON.stringify(blockedUsers));
  }, [blockedUsers]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");
    const username = localStorage.getItem("username");
    const email = localStorage.getItem("email");

    if (token && userId && userId !== "undefined") {
      setUser({ token, id: userId, username, email });
      grpcClient.connect(userId, token);
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);

    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    
    let userId = data.userId || data.user_id;
    let userName = data.username || username;
    let userEmail = data.email || "";
    
    if (!userId) {
      try {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        userId = payload.user_id || payload.id || payload.userId;
        userName = data.username || payload.username || username;
        userEmail = data.email || payload.email || ""; 
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }

    if (userId) localStorage.setItem("user_id", userId);
    if (userName) localStorage.setItem("username", userName);
    if (userEmail) localStorage.setItem("email", userEmail);

    setUser({
      token: data.accessToken,
      id: userId,
      username: userName,
      email: userEmail,
    });

    if (userId) {
      grpcClient.connect(userId, data.accessToken);
    }

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
    localStorage.removeItem("email");
    localStorage.removeItem("blockedUsers");

    grpcClient.disconnect();
    setUser(null);
    setBlockedUsers([]);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token");
    
    const data = await authApi.refresh(refreshToken);
    const newAccessToken = data.accessToken;
    
    localStorage.setItem("access_token", newAccessToken);
    
    if (user) {
      setUser(prev => prev ? { ...prev, token: newAccessToken } : null);
    }
    
    grpcClient.updateToken(newAccessToken);
    
    return newAccessToken;
  }, [user]);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    return await authApi.changePassword(oldPassword, newPassword);
  }, []);

  const getProfile = useCallback(async () => {
    const profileData = await authApi.getProfile();
    if (profileData) {
      const updatedName = profileData.username || profileData.userName;
      const updatedEmail = profileData.email;

      if (updatedName) localStorage.setItem("username", updatedName);
      if (updatedEmail) localStorage.setItem("email", updatedEmail);

      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          username: updatedName || prev.username,
          email: updatedEmail || prev.email
        };
      });
    }
    return profileData;
  }, []);

  const updateProfile = useCallback(async (username, email) => {
    const data = await authApi.updateProfile(username, email);
    
    localStorage.setItem("username", username);
    localStorage.setItem("email", email);
    
    if (user) {
      setUser(prev => prev ? { ...prev, username, email } : null);
    }
    
    return data;
  }, [user]);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("blockedUsers");
    
    grpcClient.disconnect();
    setUser(null);
    setBlockedUsers([]);
    
    return true;
  }, []);

  const updateBlockedUsers = useCallback((userId, isBlocked) => {
    setBlockedUsers(prev => {
      if (isBlocked) {
        return prev.includes(userId) ? prev : [...prev, userId];
      } else {
        return prev.filter(id => id !== userId);
      }
    });
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
        getProfile,
        updateProfile,
        deleteAccount,
        blockedUsers,
        updateBlockedUsers,
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