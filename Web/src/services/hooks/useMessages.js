import { useState, useEffect, useCallback } from "react";
import { chatApi } from "../../api/chatApi";

export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await chatApi.getMessages(chatId);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load messages");
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (encryptedContent) => {
    try {
      const data = await chatApi.sendMessage(chatId, encryptedContent);
      await fetchMessages();
      return data.message_id;
    } catch (err) {
      console.error("Send message error:", err);
      throw err;
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await chatApi.deleteMessage(messageId);
      await fetchMessages();
    } catch (err) {
      console.error("Delete message error:", err);
      throw err;
    }
  };

  const editMessage = async (messageId, encryptedContent) => {
    try {
      await chatApi.editMessage(messageId, encryptedContent);
      await fetchMessages();
    } catch (err) {
      console.error("Edit message error:", err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    deleteMessage,
    editMessage,
  };
}