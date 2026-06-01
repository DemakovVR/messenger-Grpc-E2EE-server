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
    const res = await httpClient.post("/chats/private", { user_id: userId });
    return res.data;
  },

  createGroupChat: async (name, participantIds) => {
    const res = await httpClient.post("/chats/group", {
      name,
      participant_ids: participantIds,
    });
    return res.data;
  },

  getMessages: async (chatId, limit = 50, offset = 0) => {
    const res = await httpClient.get(`/chats/${chatId}/messages`, {
      params: { limit, offset },
    });
    return res.data;
  },

  sendMessage: async (chatId, encryptedContent) => {
    const res = await httpClient.post("/messages", {
      chat_id: chatId,
      encrypted_content: encryptedContent,
    });
    return res.data;
  },

  deleteMessage: async (messageId) => {
    const res = await httpClient.delete(`/messages/${messageId}`);
    return res.data;
  },

  editMessage: async (messageId, encryptedContent) => {
    const res = await httpClient.put(`/messages/${messageId}`, {
      encrypted_content: encryptedContent,
    });
    return res.data;
  },
};