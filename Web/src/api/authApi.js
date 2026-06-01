import httpClient from "./httpClient";

export const authApi = {
  login: async (username, password) => {
    const res = await httpClient.post(
      "/auth/login",
      {
        username,
        password,
      }
    );

    return res.data;
  },

  register: async (
    username,
    email,
    password
  ) => {
    const res = await httpClient.post(
      "/auth/register",
      {
        username,
        email,
        password,
      }
    );

    return res.data;
  },

  logout: async (refreshToken) => {
    const res = await httpClient.post(
      "/auth/logout",
      {
        refresh_token: refreshToken,
      }
    );

    return res.data;
  },
};