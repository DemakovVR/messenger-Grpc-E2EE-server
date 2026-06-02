import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMessages } from "../services/hooks/useMessages";
import MessageList from "../components/ui/chat/MessageList";
import MessageInput from "../components/ui/chat/MessageInput";
import { publishPublicKey, getOrCreateKeys } from "../crypto/e2ee";
import "../styles/chat.css";

function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(chatId);
  const [peerUserId, setPeerUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState({});
  const [e2eeReady, setE2eeReady] = useState(false);

  useEffect(() => {
    const initE2EE = async () => {
      getOrCreateKeys();
      const published = await publishPublicKey();
      setE2eeReady(published);
    };
    initE2EE();
  }, []);

  useEffect(() => {
    if (chatId && user) {
      const fetchChat = async () => {
        const token = localStorage.getItem("access_token");
        try {
          const response = await fetch(`/api/chats/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.chat) {
            const chat = data.chat;
            let peerId = null;
            const usersMap = {};
            
            if (chat.participants && chat.participants.length > 0) {
              chat.participants.forEach(p => {
                usersMap[p.id] = p;
                if (p.id !== user.id) {
                  peerId = p.id;
                }
              });
            }
            setChatUsers(usersMap);
            setPeerUserId(peerId);
          }
        } catch (err) {
          console.error("Failed to fetch chat:", err);
        }
      };
      fetchChat();
    }
  }, [chatId, user]);

  const handleSendMessage = async (content, isEncrypted) => {
    try {
      await sendMessage(content, isEncrypted);
    } catch (err) {
      console.error("Send failed:", err);
      throw err;
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
      {!e2eeReady && (
        <div className="e2ee-warning">
          ⚠️ E2EE инициализация...
        </div>
      )}
      <MessageList
        messages={messages}
        currentUserId={user?.id}
        peerUserId={peerUserId}
        users={chatUsers}
      />
      <MessageInput
        chatId={chatId}
        peerUserId={peerUserId}
        onSend={handleSendMessage}
        disabled={false}
      />
    </div>
  );
}

export default ChatPage;