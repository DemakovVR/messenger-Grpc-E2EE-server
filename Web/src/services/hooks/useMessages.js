import { useState, useEffect, useCallback, useRef } from "react";
import { chatApi } from "../../api/chatApi";
import { grpcClient } from "../grpcClient";

export function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const abortControllerRef = useRef(null);

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
      const msgChatId = newMessage.chatId || newMessage.chat_id;
      if (String(msgChatId) === String(chatId)) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m.id) === String(newMessage.id));
          const isMsgDeleted = newMessage.isDeleted || newMessage.is_deleted;

          if (exists) {
            if (isMsgDeleted) return prev.filter((m) => String(m.id) !== String(newMessage.id));
            return prev.map((m) => String(m.id) === String(newMessage.id) ? newMessage : m);
          }

          if (isMsgDeleted) return prev;
          return [...prev, newMessage];
        });
      }
    };

    grpcClient.subscribe(chatId, handleNewMessage);
    setRealtimeConnected(grpcClient.isConnected());

    const onConnect = () => setRealtimeConnected(true);
    const onDisconnect = () => setRealtimeConnected(false);

    grpcClient.on('connect', onConnect);
    grpcClient.on('disconnect', onDisconnect);

    return () => {
      grpcClient.unsubscribe(chatId);
      grpcClient.off('connect', onConnect);
      grpcClient.off('disconnect', onDisconnect);
    };
  }, [chatId]);

  const sendMessage = async (encryptedContent, isEncrypted, replyToMessageId = null) => {
    try {
      const data = await chatApi.sendMessage(chatId, encryptedContent, isEncrypted, replyToMessageId);
      
      await fetchMessages(); 
      return data.messageId;
    } catch (err) {
      throw err;
    }
  };

  const uploadFile = async (file) => {
    const token = localStorage.getItem("access_token");
    const base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });

    const response = await fetch("http://localhost:8080/api/files/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        chunk: base64Data,
      }),
    });

    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    return data.fileUrl;
  };

  const deleteMessage = async (messageId) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      throw err;
    }
  };

  const editMessage = async (messageId, encryptedContent, isEncrypted) => {
    try {
      await chatApi.editMessage(messageId, encryptedContent, isEncrypted);
      await fetchMessages();
    } catch (err) {
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    uploadFile,
    deleteMessage,
    editMessage,
    realtimeConnected,
  };
}