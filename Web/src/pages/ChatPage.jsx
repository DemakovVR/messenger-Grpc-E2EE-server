import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMessages } from "../services/hooks/useMessages";
import MessageList from "../components/ui/chat/MessageList";
import MessageInput from "../components/ui/chat/MessageInput";
import "../styles/chat.css";

function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(chatId);

  const handleSendMessage = async (content) => {
    try {
      await sendMessage(content);
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  if (loading) {
    return <div className="chat-page-loading">Loading messages...</div>;
  }

  if (!chatId) {
    return (
      <div className="no-chat-selected">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="chat-page">
      <MessageList messages={messages} currentUserId={user?.id} />
      <MessageInput onSend={handleSendMessage} disabled={false} />
    </div>
  );
}

export default ChatPage;