import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMessages } from "../services/hooks/useMessages";
import MessageList from "../components/ui/chat/MessageList";
import MessageInput from "../components/ui/chat/MessageInput";
import { publishKeys, encryptMessageForPeer } from "../crypto/e2ee";
import "../styles/chat.css";

function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { setChatTitle, setCurrentChatId, setCurrentChatType, setCurrentChatCreatedBy } = useOutletContext();
  
  const { messages, loading, sendMessage, uploadFile, deleteMessage, editMessage } = useMessages(chatId);
  
  const [peerUserId, setPeerUserId] = useState(null);
  const [chatUsers, setChatUsers] = useState({});
  const [chatType, setChatType] = useState(null);
  const [chatName, setChatName] = useState("");
  const [createdBy, setCreatedBy] = useState(null);
  
  const [replyToMessage, setReplyToMessage] = useState(null);

  useEffect(() => {
    const initE2EE = async () => { await publishKeys(); };
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
            setCreatedBy(chat.createdBy || null);
            setCurrentChatCreatedBy(chat.createdBy || null);
            if (chat.participants && chat.participants.length > 0) {
              chat.participants.forEach(p => {
                usersMap[p.id] = { ...p, role: p.role || "member" };
                if (p.id !== user.id && chat.type === "private") peerId = p.id;
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
      setReplyToMessage(null);
    }
  }, [chatId, user?.id, setCurrentChatCreatedBy]);

  useEffect(() => {
    if (chatType === "group") {
      setChatTitle(chatName || "Групповой чат");
    } else if (chatType === "private" && peerUserId && chatUsers[peerUserId]) {
      setChatTitle(chatUsers[peerUserId].username || "Личный чат");
    } else {
      setChatTitle("Чат");
    }
    if (chatId) {
      setCurrentChatId(chatId);
      setCurrentChatType(chatType);
    }
  }, [chatType, chatName, peerUserId, chatUsers, chatId, setChatTitle, setCurrentChatId, setCurrentChatType]);

  const handleSendMessage = async (content, isEncrypted, replyToId = null) => {
    try { 
      await sendMessage(content, isEncrypted, replyToId); 
      setReplyToMessage(null);
    }
    catch (err) { 
      console.error("Send failed:", err); 
      throw err; 
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try { 
      await deleteMessage(messageId); 
      if (String(replyToMessage?.id) === String(messageId)) {
        setReplyToMessage(null);
      }
    }
    catch (err) { 
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
        if (!encrypted) encrypted = await encryptMessageForPeer(peerUserId, newContent, true);
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

  if (loading) return <div className="chat-page-loading">Загрузка сообщений...</div>;
  if (!chatId) return <div className="no-chat-selected">Выберите чат из списка</div>;

  return (
    <div className="chat-page">
      <MessageList
        messages={messages}
        currentUserId={user?.id}
        peerUserId={peerUserId}
        users={chatUsers}
        chatType={chatType}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onReplyMessage={(msg) => setReplyToMessage(msg)}
      />
      <MessageInput
        chatId={chatId}
        peerUserId={peerUserId}
        onSend={handleSendMessage}
        uploadFile={uploadFile}
        disabled={false}
        chatType={chatType}
        replyToMessage={replyToMessage}
        onClearReply={() => setReplyToMessage(null)}
      />
    </div>
  );
}

export default ChatPage;