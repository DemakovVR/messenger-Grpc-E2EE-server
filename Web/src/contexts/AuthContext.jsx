import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/authApi";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (token) {
      setUser({ token });
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);

    localStorage.setItem(
      "access_token",
      data.access_token
    );

    localStorage.setItem(
      "refresh_token",
      data.refresh_token
    );

    setUser({
      token: data.access_token,
    });

    return data;
  };

  const register = async (
    username,
    email,
    password
  ) => {
    return await authApi.register(
      username,
      email,
      password
    );
  };

  const logout = async () => {
    const refreshToken =
      localStorage.getItem("refresh_token");

    try {
      await authApi.logout(refreshToken);
    } catch (e) {}

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuth: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}