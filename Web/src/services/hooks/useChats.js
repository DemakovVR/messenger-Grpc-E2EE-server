import { useState, useEffect, useCallback } from "react";
import { chatApi } from "../../api/chatApi";

export function useChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await chatApi.getChats();
      setChats(data.chats || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chats");
      console.error("Fetch chats error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const createPrivateChat = async (userId) => {
    try {
      const data = await chatApi.createPrivateChat(userId);
      await fetchChats();
      return data.chat_id;
    } catch (err) {
      console.error("Create private chat error:", err);
      throw err;
    }
  };

  const createGroupChat = async (name, participantIds) => {
    try {
      const data = await chatApi.createGroupChat(name, participantIds);
      await fetchChats();
      return data.chat_id;
    } catch (err) {
      console.error("Create group chat error:", err);
      throw err;
    }
  };

  return {
    chats,
    loading,
    error,
    fetchChats,
    createPrivateChat,
    createGroupChat,
  };
}