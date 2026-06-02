import httpClient from "./httpClient";

export const chatApi = {
  getChats: async () => {
    const res = await httpClient.get("/chats");
    return res.data;
  },

  getChat: async (chatId) => {
    const res = await httpClient.get(`/chats/${chatId}`);
    return res.data;
  },

  createPrivateChat: async (userId) => {
    const res = await httpClient.post("/chats/private", { userId });
    return res.data;
  },

  createGroupChat: async (name, participantIds) => {
    const res = await httpClient.post("/chats/group", {
      name,
      participantIds,
    });
    return res.data;
  },

  getMessages: async (chatId, limit = 50, offset = 0) => {
    const res = await httpClient.get(`/chats/${chatId}/messages`, {
      params: { limit, offset },
    });
    return res.data;
  },

  sendMessage: async (chatId, encryptedContent, isEncrypted = false) => {
    const res = await httpClient.post("/messages", {
      chatId,
      encryptedContent,
      isEncrypted,
    });
    return res.data;
  },

  deleteMessage: async (messageId) => {
    const res = await httpClient.delete(`/messages/${messageId}`);
    return res.data;
  },

  editMessage: async (messageId, encryptedContent, isEncrypted = false) => {
    const res = await httpClient.put(`/messages/${messageId}`, {
      encryptedContent,
      isEncrypted,
    });
    return res.data;
  },

  searchUsers: async (query) => {
    const res = await httpClient.get("/contacts/search", { params: { query } });
    return res.data;
  },

  addContact: async (contactId) => {
    const res = await httpClient.post("/contacts", { contactId });
    return res.data;
  },

  getContacts: async () => {
    const res = await httpClient.get("/contacts");
    return res.data;
  },
};