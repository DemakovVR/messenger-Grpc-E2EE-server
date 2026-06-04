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
    console.log("Login response:", res.data);
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
        refreshToken: refreshToken,
      }
    );

    return res.data;
  },

  refresh: async (refreshToken) => {
    const res = await httpClient.post("/auth/refresh", {
      refreshToken: refreshToken,
    });
    return res.data;
  },

  changePassword: async (oldPassword, newPassword) => {
  const res = await httpClient.post("/auth/change-password", {
    oldPassword: oldPassword,
    newPassword: newPassword,
  });
  return res.data;
},

};
  
