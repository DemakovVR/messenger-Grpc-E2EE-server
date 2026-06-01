import { useParams } from "react-router-dom";
import { useMessages } from "../services/hooks/useMessages";
import { useState } from "react";
import "../styles/chat.css";

function ChatPage() {
  const { chatId } = useParams();
  const { messages, loading, sendMessage } = useMessages(chatId);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  if (loading) {
    return <div className="chat-placeholder">Loading messages...</div>;
  }

  if (!chatId) {
    return (
      <div className="chat-placeholder">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.length === 0 && (
          <div className="no-messages">No messages yet</div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <div className="message-sender">{msg.sender_id}</div>
            <div className="message-content">{msg.encrypted_content}</div>
            <div className="message-time">{msg.sent_at}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatPage;