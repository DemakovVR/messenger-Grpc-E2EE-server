import { useRef, useEffect, useState } from "react";
import { decryptMessageFromPeer } from "../../../crypto/e2ee";
import { grpcClient } from "../../../services/grpcClient";
import { useAuth } from "../../../contexts/AuthContext";

function MessageActions({ message, isOwn, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActions(false);
      }
    }
    if (showActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActions]);

  if (!isOwn) return null;

  return (
    <div className="message-actions" ref={menuRef} style={{ position: "relative", display: "inline-block", marginLeft: "10px" }}>
      <button
        onClick={() => setShowActions(!showActions)}
        className="message-actions-trigger"
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0 5px", color: "inherit" }}
      >
        ⋮
      </button>
      {showActions && (
        <div style={{
          position: "absolute",
          top: "25px",
          right: "0",
          background: "#ffffff",
          borderRadius: "8px",
          padding: "6px 0",
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          minWidth: "170px",
          border: "1px solid #e0e0e0"
        }}>
          <button
            onClick={() => { onEdit(message); setShowActions(false); }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#333333", cursor: "pointer", textAlign: "left", fontSize: "14px", whiteSpace: "nowrap" }}
          >
            ✏️ Редактировать
          </button>
          <button
            onClick={() => { onDelete(message.id); setShowActions(false); }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#ff4d4d", cursor: "pointer", textAlign: "left", fontSize: "14px", whiteSpace: "nowrap" }}
          >
            🗑️ Удалить
          </button>
        </div>
      )}
    </div>
  );
}

function MessageContentRender({ content, onEdit, onDelete, message, isOwn }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const getCleanFileName = (rawPath) => {
    if (!rawPath) return "";
    const baseName = rawPath.substring(rawPath.lastIndexOf('/') + 1);
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
    return baseName.replace(uuidRegex, "");
  };

  if (typeof content === "string" && content.trim().startsWith("{")) {
    try {
      const fileData = JSON.parse(content);
      if (fileData && (fileData.is_file || fileData.file_url || fileData.file_name || fileData.fileName)) {
        const rawFileName = fileData.file_name || fileData.fileName || "";
        const displayName = getCleanFileName(rawFileName);
        const fileUrl = fileData.file_url || rawFileName;

        const handleDownload = async () => {
          if (downloading) return;
          setDownloading(true);
          setProgress(0);
          try {
            const localBlobUrl = await grpcClient.downloadFile(fileUrl, (count) => {
              setProgress(Math.min(count, 100));
            });
            const link = document.createElement("a");
            link.href = localBlobUrl;
            link.setAttribute("download", displayName);
            document.body.appendChild(link);
            link.click();
            link.remove();
          } catch (err) {
            console.error("Ошибка скачивания файла:", err);
          } finally {
            setDownloading(false);
          }
        };

        return (
          <div className="file-attachment" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
            <div 
              onClick={handleDownload} 
              style={{ 
                cursor: downloading ? "default" : "pointer", 
                fontSize: "24px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                userSelect: "none"
              }}
              title={downloading ? `Скачивание: ${progress}%` : "Скачать файл"}
            >
              {downloading ? <span style={{ fontSize: "12px", fontWeight: "bold" }}>{progress}%</span> : "📄"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ wordBreak: "break-all" }}>{displayName || "Файл без имени"}</span>
            </div>
            <MessageActions message={message} isOwn={isOwn} onEdit={onEdit} onDelete={onDelete} />
          </div>
        );
      }
    } catch (e) {}
  }

  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
  if (typeof content === "string" && uuidRegex.test(content)) {
    const displayName = getCleanFileName(content);

    const handleDownload = async () => {
      if (downloading) return;
      setDownloading(true);
      setProgress(0);
      try {
        const localBlobUrl = await grpcClient.downloadFile(content, (count) => {
          setProgress(count);
        });
        const link = document.createElement("a");
        link.href = localBlobUrl;
        link.setAttribute("download", displayName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error("Ошибка скачивания файла:", err);
      } finally {
        setDownloading(false);
      }
    };

    return (
      <div className="file-attachment" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
        <div 
          onClick={handleDownload} 
          style={{ 
            cursor: downloading ? "default" : "pointer", 
            fontSize: "24px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            userSelect: "none"
          }}
          title={downloading ? `Скачивание: ${progress}%` : "Скачать файл"}
        >
          {downloading ? <span style={{ fontSize: "12px", fontWeight: "bold" }}>{progress}%</span> : "📄"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span style={{ wordBreak: "break-all" }}>{displayName}</span>
        </div>
        <MessageActions message={message} isOwn={isOwn} onEdit={onEdit} onDelete={onDelete} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onEdit(message, editText);
              setIsEditing(false);
            }
            if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          style={{ 
            flex: 1, 
            padding: "8px 12px", 
            borderRadius: "6px", 
            border: "1px solid #ccc", 
            background: "#ffffff", 
            color: "#000000", 
            fontSize: "14px"
          }}
          autoFocus
        />
        <button onClick={() => { onEdit(message, editText); setIsEditing(false); }} style={{ padding: "8px 12px", background: "#4c5cff", border: "none", borderRadius: "6px", color: "white", cursor: "pointer" }}>💾</button>
        <button 
          onClick={() => setIsEditing(false)} 
          style={{ padding: "8px 12px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "6px", color: "#333333", cursor: "pointer" }}
        >
          ✖
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <span style={{ flex: 1 }}>{content}</span>
      <MessageActions message={message} isOwn={isOwn} onEdit={() => { setEditText(content); setIsEditing(true); }} onDelete={onDelete} />
    </div>
  );
}

export default function MessageList({ messages, currentUserId, peerUserId, users, chatType, groupCryptoKey, onDeleteMessage, onEditMessage }) {
  const messagesEndRef = useRef(null);
  const [decryptedMessages, setDecryptedMessages] = useState([]);
  const { user: authUser } = useAuth();

  const checkIfOwn = (senderId, senderName) => {
    if (!senderId) return false;
    const sId = String(senderId).toLowerCase();
    
    if (sId === String(currentUserId).toLowerCase()) return true;
    if (authUser?.id && sId === String(authUser.id).toLowerCase()) return true;
    if (authUser?.username && sId === String(authUser.username).toLowerCase()) return true;
    if (authUser?.username && senderName && String(senderName).toLowerCase() === String(authUser.username).toLowerCase()) return true;
    
    return false;
  };

  useEffect(() => {
    const decryptMessages = async () => {
      if (!messages.length) {
        setDecryptedMessages([]);
        return;
      }

      const isGroupChat = chatType === "group";

      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          const id = msg.id;
          const senderId = msg.senderId || msg.sender_id;
          const isEncrypted = msg.isEncrypted || msg.is_encrypted;
          const isDeleted = msg.isDeleted || msg.is_deleted;
          const isEdited = msg.isEdited || msg.is_edited;
          
          let content = msg.encryptedContent || msg.encrypted_content || msg.content;
          let isDecrypted = false;

          let senderName = senderId?.slice(0, 8);
          if (users && users[senderId]) {
            senderName = users[senderId].username || users[senderId].display_name;
          }

          const isOwnMessage = checkIfOwn(senderId, senderName);

          if (isEncrypted && !isGroupChat) {
            try {
              const encryptedData = JSON.parse(content);
              
              const decryptedContent = await decryptMessageFromPeer(encryptedData, currentUserId, senderId);
              
              if (decryptedContent) {
                content = decryptedContent;
                isDecrypted = true;
              } else {
                content = isOwnMessage ? "[Ошибка расшифровки]" : "[Зашифрованное сообщение]";
              }
            } catch (e) {
              content = isOwnMessage ? "[Ошибка расшифровки]" : "[Зашифрованное сообщение]";
            }
          }

          let sentAt = msg.sentAt || msg.createdAt || msg.sent_at || msg.created_at;
          let validDate = true;
          try {
            if (new Date(sentAt).toString() === "Invalid Date") validDate = false;
          } catch {
            validDate = false;
          }

          return {
            ...msg,
            id,
            senderId,
            isEncrypted,
            isDeleted,
            isEdited,
            displayContent: content,
            isDecrypted,
            senderName,
            sentAt: validDate ? sentAt : null,
          };
        })
      );

      setDecryptedMessages(decrypted);
    };

    decryptMessages();
  }, [messages, peerUserId, users, currentUserId, chatType, authUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decryptedMessages]);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    try {
      const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        let hours = parseInt(parts[4], 10) + 4;
        const minutes = parts[5];
        if (hours >= 24) hours -= 24;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      date.setHours(date.getHours() + 4);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleDelete = async (messageId) => {
    if (window.confirm("Удалить сообщение?")) {
      await onDeleteMessage(messageId);
    }
  };

  const handleEdit = async (message, newContent) => {
    if (!newContent || newContent === message.displayContent) return;
    await onEditMessage(message.id, newContent, message.isEncrypted);
  };

  const activeMessages = decryptedMessages.filter(msg => {
    if (msg.isDeleted) return false;
    
    console.log("Бэкенд прислал сообщение:", msg);

    const hasText = msg.displayContent && msg.displayContent.trim() !== "";
    if (!hasText) return false; 

    return true;
  });

  if (activeMessages.length === 0) {
    return <div className="message-list-empty">Нет сообщений. Напишите первое сообщение!</div>;
  }

  return (
    <div className="message-list">
      {activeMessages.map((msg) => {
        const isOwn = checkIfOwn(msg.senderId, msg.senderName);
        const isGroupChat = chatType === "group";

        return (
          <div key={String(msg.id)} className={`message ${isOwn ? "message-own" : "message-other"}`}>
            <div className="message-sender">
              {isGroupChat && !isOwn && (msg.senderName || msg.senderId?.slice(0, 8))}
              {isOwn && "Вы"}
              {!isGroupChat && (isOwn ? "Вы" : (msg.senderName || msg.senderId?.slice(0, 8)))}
              {msg.isEncrypted && !msg.isDecrypted && !isGroupChat && <span className="ml-1 text-xs">🔒</span>}
              {msg.isEncrypted && msg.isDecrypted && !isGroupChat && <span className="ml-1 text-xs">✓🔒</span>}
              {msg.isEdited && <span className="ml-1 text-xs" style={{ color: "#000000" }}> (ред.)</span>}
            </div>
            <div className="message-content">
              <MessageContentRender 
                content={msg.displayContent || ""} 
                message={msg}
                isOwn={isOwn}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
            <div className="message-time">
              {formatTime(msg.sentAt)}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}