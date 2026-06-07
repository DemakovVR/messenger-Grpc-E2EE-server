import { useRef, useEffect, useState } from "react";
import { decryptMessageFromPeer } from "../../../crypto/e2ee";
import { grpcClient } from "../../../services/grpcClient";
import { authApi } from "../../../api/authApi";
import { useAuth } from "../../../contexts/AuthContext";

const globalUserCache = {};
const inFlightRequests = {};

const getCleanFileName = (rawPath) => {
  if (!rawPath) return "";
  const baseName = rawPath.substring(rawPath.lastIndexOf('/') + 1);
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
  return baseName.replace(uuidRegex, "");
};

const getReplySnippet = (content) => {
  if (!content) return "Сообщение недоступно";
  
  if (typeof content === "string" && content.trim().startsWith("{")) {
    try {
      const fileData = JSON.parse(content);
      if (fileData && (fileData.is_file || fileData.isFile || fileData.file_url || fileData.fileUrl || fileData.file_name || fileData.fileName)) {
        const rawFileName = fileData.file_name || fileData.fileName || "";
        return `📄 Файл: ${getCleanFileName(rawFileName)}`;
      }
    } catch (e) {}
  }
  
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
  if (typeof content === "string" && uuidRegex.test(content)) {
    return `📄 Файл: ${getCleanFileName(content)}`;
  }
  
  return content;
};

function MessageActions({ message, isOwn, onEdit, onDelete, onReply }) {
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
          left: isOwn ? "auto" : "0",
          right: isOwn ? "0" : "auto",
          background: "#ffffff",
          borderRadius: "8px",
          padding: "6px 0",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          minWidth: "170px",
          border: "1px solid #e0e0e0"
        }}>
          <button
            onClick={() => { onReply(message); setShowActions(false); }}
            style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#333333", cursor: "pointer", textAlign: "left", fontSize: "14px", whiteSpace: "nowrap" }}
          >
            ↩️ Ответить
          </button>
          
          {isOwn && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MessageContentRender({ content, onEdit, onDelete, onReply, message, isOwn }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const editTextareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editText]);

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEdit(message, editText);
      setIsEditing(false);
    }
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (typeof content === "string" && content.trim().startsWith("{")) {
    try {
      const fileData = JSON.parse(content);
      if (fileData && (fileData.is_file || fileData.isFile || fileData.file_url || fileData.fileUrl || fileData.file_name || fileData.fileName)) {
        const rawFileName = fileData.file_name || fileData.fileName || "";
        const displayName = getCleanFileName(rawFileName);
        const fileUrl = fileData.file_url || fileData.fileUrl || rawFileName;
        const backendFileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1) || rawFileName;
        const handleDownload = async () => {
          if (downloading) return;
          setDownloading(true);
          setProgress(0);
          try {
            const localBlobUrl = await grpcClient.downloadFile(backendFileName, (count) => {
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
            <MessageActions message={message} isOwn={isOwn} onEdit={onEdit} onDelete={onDelete} onReply={onReply} />
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
        const backendFileName = content.substring(content.lastIndexOf('/') + 1);
        const localBlobUrl = await grpcClient.downloadFile(backendFileName, (count) => {
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
        <MessageActions message={message} isOwn={isOwn} onEdit={onEdit} onDelete={onDelete} onReply={onReply} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", width: "100%" }}>
        <textarea
          ref={editTextareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: "#ffffff",
            color: "#000000",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "none",
            overflow: "hidden",
            minHeight: "42px",
            maxHeight: "200px",
            lineHeight: "1.4"
          }}
          autoFocus
        />
        <button onClick={() => { onEdit(message, editText); setIsEditing(false); }} style={{ padding: "8px 12px", background: "#4c5cff", border: "none", borderRadius: "6px", color: "white", cursor: "pointer" }}>💾</button>
        <button onClick={() => setIsEditing(false)} style={{ padding: "8px 12px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "6px", color: "#333333", cursor: "pointer" }}>✖</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <span style={{ flex: 1 }}>{content}</span>
      <MessageActions message={message} isOwn={isOwn} onEdit={() => { setEditText(content); setIsEditing(true); }} onDelete={onDelete} onReply={onReply} />
    </div>
  );
}

export default function MessageList({ messages, currentUserId, peerUserId, users, chatType, groupCryptoKey, onDeleteMessage, onEditMessage, onReplyMessage }) {
  const messagesEndRef = useRef(null);
  const [decryptedMessages, setDecryptedMessages] = useState([]);
  const { user: authUser, blockedUsers } = useAuth();

  const checkIfOwn = (senderId, senderName) => {
    if (!senderId) return false;
    const sId = String(senderId).toLowerCase();
    
    if (sId === String(currentUserId).toLowerCase()) return true;
    if (authUser?.id && sId === String(authUser.id).toLowerCase()) return true;
    if (authUser?.username && sId === String(authUser.username).toLowerCase()) return true;
    if (authUser?.username && senderName && String(senderName).toLowerCase() === String(authUser.username).toLowerCase()) return true;
    
    return false;
  };

  const getUserName = async (userId) => {
    if (!userId) return userId?.slice(0, 8);
    if (globalUserCache[userId]) return globalUserCache[userId].username || globalUserCache[userId].userName;
    
    try {
      if (typeof authApi?.getUserById === 'function') {
        if (!inFlightRequests[userId]) {
          inFlightRequests[userId] = authApi.getUserById(userId);
        }
        const data = await inFlightRequests[userId];
        if (data) {
          globalUserCache[userId] = data;
          return data.username || data.userName;
        }
      }
    } catch (err) {
      console.warn("Failed to load public profile:", userId);
    }
    return userId?.slice(0, 8);
  };

  useEffect(() => {
    if (users) {
      Object.entries(users).forEach(([id, userInfo]) => {
        if (userInfo) {
          globalUserCache[id] = userInfo;
        }
      });
    }

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
          
          let replyToData = msg.replyTo || msg.reply_to;
          let replyToId = null;
          let parentSenderId = null;
          let parentContent = null;
          let parentSenderName = null;
          
          if (replyToData) {
            replyToId = replyToData.id;
            parentSenderId = replyToData.senderId;
            parentContent = replyToData.encryptedContent;
            
            if (parentSenderId) {
              if (globalUserCache[parentSenderId]) {
                parentSenderName = globalUserCache[parentSenderId].username;
              } else {
                try {
                  const userData = await authApi.getUserById(parentSenderId);
                  if (userData) {
                    globalUserCache[parentSenderId] = userData;
                    parentSenderName = userData.username;
                  }
                } catch (e) {
                  parentSenderName = parentSenderId.slice(0, 8);
                }
              }
            }
          }
          
          const isEncrypted = msg.isEncrypted || msg.is_encrypted;
          const isDeleted = msg.isDeleted || msg.is_deleted;
          const isEdited = msg.isEdited || msg.is_edited;
          
          let content = msg.encryptedContent || msg.encrypted_content || msg.content;
          let isDecrypted = false;

          let senderName = senderId?.slice(0, 8);

          if (globalUserCache[senderId]) {
            senderName = globalUserCache[senderId].username || globalUserCache[senderId].userName;
          } else if (senderId) {
            try {
              if (typeof authApi?.getUserById === 'function') {
                if (!inFlightRequests[senderId]) {
                  inFlightRequests[senderId] = authApi.getUserById(senderId);
                }
                const data = await inFlightRequests[senderId];
                if (data) {
                  globalUserCache[senderId] = data;
                  senderName = data.username || data.userName;
                }
              }
            } catch (err) {
              console.warn("Failed to load public profile for sender:", senderId, err.message || err);
            }
          }

          const isOwnMessage = checkIfOwn(senderId, senderName);

          if (isEncrypted && !isGroupChat && content) {
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

          let decryptedParentContent = parentContent;
          if (replyToData && replyToData.isEncrypted && !isGroupChat && parentContent) {
              try {
                  const encryptedParentData = JSON.parse(parentContent);
                  const decryptedParent = await decryptMessageFromPeer(encryptedParentData, currentUserId, parentSenderId);
                  if (decryptedParent) {
                      decryptedParentContent = decryptedParent;
                  } else {
                      decryptedParentContent = "[Зашифрованное сообщение]";
                  }
              } catch (e) {
                  decryptedParentContent = "[Зашифрованное сообщение]";
              }
          }

          let sentAt = msg.sentAt || msg.createdAt || msg.sent_at || msg.created_at;
          let validDate = false;
          if (sentAt) {
            if (typeof sentAt === 'object' && 'seconds' in sentAt) {
              validDate = true;
            } else if (!isNaN(new Date(sentAt).getTime())) {
              validDate = true;
            }
          }

          return {
            ...msg,
            id,
            senderId,
            replyToId,
            replyToData: {
              ...replyToData,
              decryptedContent: decryptedParentContent,
              senderName: parentSenderName,
            },
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

  const formatTime = (dateInput) => {
    if (!dateInput) return "";
    try {
      let date;

      if (typeof dateInput === 'object' && 'seconds' in dateInput) {
        date = new Date(Number(dateInput.seconds) * 1000);
      } 
      else if (dateInput instanceof Date) {
        date = new Date(dateInput.getTime());
      } 
      else if (typeof dateInput === "string") {
        const parts = dateInput.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
          const year = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10) - 1;
          const day = parseInt(parts[3], 10);
          const hours = parseInt(parts[4], 10);
          const minutes = parseInt(parts[5], 10);
          const seconds = parseInt(parts[6], 10);
          
          date = new Date(year, month, day, hours, minutes, seconds);
          date.setHours(date.getHours() + 4);
        } else {
          date = new Date(dateInput);
        }
      } else {
        date = new Date(dateInput);
      }

      if (isNaN(date.getTime())) return "";

      const now = new Date();
      const isThisYear = date.getFullYear() === now.getFullYear();

      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      if (isThisYear) {
        return `${day}.${month} ${timeStr}`;
      } else {
        const year = date.getFullYear();
        return `${day}.${month}.${year} ${timeStr}`; 
      }
    } catch (e) {
      console.error("Ошибка форматирования даты:", e);
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
    if (blockedUsers && blockedUsers.includes(msg.senderId)) return false;
    const hasText = msg.displayContent && msg.displayContent.trim() !== "";
    if (!hasText) return false;
    return true;
  });

  return (
    <div className="message-list" style={{ overflowY: "auto", position: "relative" }}>
      {activeMessages.map((msg) => {
        const isOwn = checkIfOwn(msg.senderId, msg.senderName);
        const isGroupChat = chatType === "group";

        return (
          <div 
            key={String(msg.id)} 
            id={`msg-${msg.id}`} 
            className={`message ${isOwn ? "message-own" : "message-other"}`}
            style={{ position: "relative" }}
          >
            <div className="message-sender">
              {isOwn ? "Вы" : (msg.senderName || msg.senderId?.slice(0, 8))}
              {!isGroupChat && msg.isEncrypted && !msg.isDecrypted && <span className="ml-1 text-xs">🔒</span>}
              {!isGroupChat && msg.isEncrypted && msg.isDecrypted && <span className="ml-1 text-xs">✓🔒</span>}
              {msg.isEdited && <span className="ml-1 text-xs" style={{ color: "#000000" }}> (ред.)</span>}
            </div>

            {msg.replyToData && msg.replyToData.decryptedContent && (
              <div 
                className="message-reply-quote"
                onClick={() => {
                  const targetEl = document.getElementById(`msg-${msg.replyToId}`);
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                style={{
                  background: isOwn ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.06)",
                  borderLeft: "3px solid #4c5cff",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  marginBottom: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  userSelect: "none"
                }}
              >
                <div style={{ fontWeight: "600", color: "#4c5cff", marginBottom: "2px" }}>
                  {checkIfOwn(msg.replyToData.senderId, msg.replyToData.senderName) ? "Вы" : (msg.replyToData.senderName || msg.replyToData.senderId?.slice(0, 8))}
                </div>
                <div style={{ color: isOwn ? "#f0f0f0" : "#555555", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {getReplySnippet(msg.replyToData.decryptedContent)}
                </div>
              </div>
            )}

            <div className="message-content">
              <MessageContentRender 
                content={msg.displayContent || ""} 
                message={msg}
                isOwn={isOwn}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReply={onReplyMessage}
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