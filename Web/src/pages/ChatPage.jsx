import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMessages } from "../services/hooks/useMessages";
import MessageList from "../components/ui/chat/MessageList";
import MessageInput from "../components/ui/chat/MessageInput";
import { publishKeys, encryptMessageForPeer } from "../crypto/e2ee";
import "../styles/chat.css";

function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { messages, loading, sendMessage, uploadFile, deleteMessage, editMessage, realtimeConnected } = useMessages(chatId);
  const [peerUserId, setPeerUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState({});
  const [e2eeReady, setE2eeReady] = useState(false);
  const [chatType, setChatType] = useState(null);
  const [chatName, setChatName] = useState("");
  const [groupCryptoKey, setGroupCryptoKey] = useState(null);

  useEffect(() => {
    const initE2EE = async () => {
      const published = await publishKeys();
      console.log("E2EE init result:", published);
      setE2eeReady(published);
    };
    initE2EE();

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('e2eePeerSignedPrekey_') ||
                  key.startsWith('e2eePeerIdentityKey_') ||
                  key.startsWith('e2eePeerSignature_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    if (chatId && user?.id) {
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
            
            setChatType(chat.type);
            setChatName(chat.name || "");
          
            if (chat.participants && chat.participants.length > 0) {
              chat.participants.forEach(p => {
                usersMap[p.id] = { ...p, role: p.role || "member" };
                if (p.id !== user.id && chat.type === "private") {
                  peerId = p.id;
                }
              });
            }

            console.log("ChatPage: Setting peerUserId =", peerId);
            console.log("ChatPage: Chat type =", chat.type);
            setChatUsers(usersMap);
            setPeerUserId(peerId);
          }
        } catch (err) {
          console.error("Failed to fetch chat:", err);
        }
      };
      fetchChat();
    }
  }, [chatId, user?.id]);

  useEffect(() => {
    if (chatType === "group") {
      setGroupCryptoKey(null);
    }
  }, [chatType]);

  const handleSendMessage = async (content, isEncrypted) => {
    try {
      await sendMessage(content, isEncrypted);
    } catch (err) {
      console.error("Send failed:", err);
      throw err;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Ошибка удаления сообщения");
    }
  };

  const handleEditMessage = async (messageId, newContent, wasEncrypted) => {
    try {
      let contentToSend = newContent;
      let isEncrypted = wasEncrypted;
      const isGroupChat = chatType === "group";

      if (!isGroupChat && peerUserId && wasEncrypted) {
        let encrypted = await encryptMessageForPeer(peerUserId, newContent, false);
        if (!encrypted) {
          encrypted = await encryptMessageForPeer(peerUserId, newContent, true);
        }
        if (encrypted) {
          contentToSend = JSON.stringify(encrypted);
          isEncrypted = true;
        }
      }

      await editMessage(messageId, contentToSend, isEncrypted);
    } catch (err) {
      console.error("Edit failed:", err);
      alert("Ошибка редактирования сообщения");
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

  const isGroupChat = chatType === "group";

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h3>{chatName || (isGroupChat ? "Group Chat" : "Private Chat")}</h3>
        {realtimeConnected && (
          <div className="realtime-badge">● В реальном времени</div>
        )}
        {isGroupChat && (
          <div className="chat-type-badge">Группа (без E2EE)</div>
        )}
      </div>
      {!e2eeReady && !isGroupChat && (
        <div className="e2ee-warning">
          ⚠️ E2EE инициализация...
        </div>
      )}
      {isGroupChat && (
        <div className="e2ee-info">
          ℹ️ Сообщения в группе не шифруются
        </div>
      )}
      <MessageList
        messages={messages}
        currentUserId={user?.id}
        peerUserId={peerUserId}
        users={chatUsers}
        chatType={chatType}
        groupCryptoKey={groupCryptoKey}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
      />
      <MessageInput
        chatId={chatId}
        peerUserId={peerUserId}
        onSend={handleSendMessage}
        uploadFile={uploadFile}
        disabled={false}
        chatType={chatType}
        groupCryptoKey={groupCryptoKey}
      />
    </div>
  );
}

export default ChatPage;