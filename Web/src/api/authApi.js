import httpClient from "./httpClient";

export const authApi = {
  login: async (email, password) => {
    const res = await httpClient.post("/auth/login", {
      email,
      password,
    });

    return res.data;
  },

  register: async (username, email, password) => {
    const res = await httpClient.post("/auth/register", {
      username,
      email,
      password,
    });

    return res.data;
  },

  logout: async (refreshToken) => {
    const res = await httpClient.post("/auth/logout", {
      refresh_token: refreshToken,
    });

    return res.data;
  },
};