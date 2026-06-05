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
    const res = await httpClient.post("/chats/private", { userId: userId });
    return res.data;
  },

  createGroupChat: async (name, participantIds) => {
    const res = await httpClient.post("/chats/group", {
      name: name,
      participantIds: participantIds,
    });
    return res.data;
  },

  getMessages: async (chatId, options = {}) => {
    const res = await httpClient.get(`/chats/${chatId}/messages`, {
      params: { limit: 50, offset: 0 },
      signal: options.signal,
    });
    return res.data;
  },

  sendMessage: async (chatId, encryptedContent, isEncrypted) => {
    const res = await httpClient.post("/messages", {
      chatId: chatId,
      encryptedContent: encryptedContent,
      isEncrypted: isEncrypted,
    });
    return res.data;
  },

  deleteMessage: async (messageId) => {
    const res = await httpClient.delete(`/messages/${messageId}`);
    return res.data;
  },

  editMessage: async (messageId, encryptedContent, isEncrypted = false) => {
    const res = await httpClient.put(`/messages/${messageId}`, {
      encryptedContent: encryptedContent,
      isEncrypted: isEncrypted,
    });
    return res.data;
  },

  searchUsers: async (query) => {
    const res = await httpClient.get("/contacts/search", { params: { query } });
    return res.data;
  },

  addContact: async (contactId) => {
    const res = await httpClient.post("/contacts", { contactId: contactId });
    return res.data;
  },

  getContacts: async () => {
    const res = await httpClient.get("/contacts");
    return res.data;
  },

  addParticipants: async (chatId, userIds) => {
    const res = await httpClient.post(`/chats/${chatId}/participants`, {
      userIds: userIds,
    });
    return res.data;
  },

  removeParticipants: async (chatId, userIds) => {
    const res = await httpClient.post(`/chats/${chatId}/participants/remove`, {
      userIds: userIds,
    });
    return res.data;
  },

  leaveGroup: async (chatId) => {
    const res = await httpClient.post(`/chats/${chatId}/leave`, {});
    return res.data;
  },

  deleteChat: async (chatId) => {
    const res = await httpClient.delete(`/chats/${chatId}`);
    return res.data;
  },
};