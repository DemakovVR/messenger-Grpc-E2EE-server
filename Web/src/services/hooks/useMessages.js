import { useState, useEffect, useCallback, useRef } from "react";
import { chatApi } from "../../api/chatApi";
import { grpcClient } from "../grpcClient";

export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const abortControllerRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setError(null);
  }, [chatId]);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const data = await chatApi.getMessages(chatId, { signal: abortControllerRef.current.signal });
      if (abortControllerRef.current.signal.aborted) return;
      const newMessages = data.messages || [];
      setMessages(newMessages);
      setError(null);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.response?.data?.message || "Failed to load messages");
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!chatId) return;

    const handleNewMessage = (newMessage) => {
      console.log("useMessages: New message received via gRPC", newMessage);
      if (newMessage.chatId === chatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    };

    grpcClient.subscribe(chatId, handleNewMessage);
    setRealtimeConnected(grpcClient.isConnected());

    const onConnect = () => {
      console.log("useMessages: gRPC connected");
      setRealtimeConnected(true);
    };
    const onDisconnect = () => {
      console.log("useMessages: gRPC disconnected");
      setRealtimeConnected(false);
    };

    grpcClient.on('connect', onConnect);
    grpcClient.on('disconnect', onDisconnect);

    return () => {
      grpcClient.unsubscribe(chatId);
      grpcClient.off('connect', onConnect);
      grpcClient.off('disconnect', onDisconnect);
    };
  }, [chatId]);

  const sendMessage = async (encryptedContent, isEncrypted) => {
    try {
      const data = await chatApi.sendMessage(chatId, encryptedContent, isEncrypted);
      await fetchMessages();
      return data.messageId;
    } catch (err) {
      console.error("Send message error:", err);
      throw err;
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Delete message error:", err);
      throw err;
    }
  };

  const editMessage = async (messageId, encryptedContent, isEncrypted) => {
    try {
      await chatApi.editMessage(messageId, encryptedContent, isEncrypted);
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
    realtimeConnected,
  };
}