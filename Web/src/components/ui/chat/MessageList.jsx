import { useRef, useEffect, useState } from "react";
import { decryptMessageFromPeer } from "../../../crypto/e2ee";
import { grpcClient } from "../../../services/grpcClient";

function MessageContentRender({ content }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

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
              {downloading ? (
                <span style={{ fontSize: "12px", fontWeight: "bold" }}>{progress}%</span>
              ) : (
                "📄"
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ wordBreak: "break-all" }}>{displayName || "Файл без имени"}</span>
            </div>
          </div>
        );
      }
    } catch (e) {
    }
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
          {downloading ? (
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>{progress}%</span>
          ) : (
            "📄"
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ wordBreak: "break-all" }}>{displayName}</span>
        </div>
      </div>
    );
  }

  return <span>{content}</span>;
}

export default function MessageList({ messages, currentUserId, peerUserId, users, chatType, groupCryptoKey }) {
  const messagesEndRef = useRef(null);
  const [decryptedMessages, setDecryptedMessages] = useState([]);

  useEffect(() => {
    const decryptMessages = async () => {
      if (!messages.length) {
        setDecryptedMessages([]);
        return;
      }

      const isGroupChat = chatType === "group";

      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          let content = msg.encryptedContent || msg.content;
          let isDecrypted = false;

          if (msg.isEncrypted && !isGroupChat) {
            try {
              const encryptedData = JSON.parse(content);

              if (msg.senderId !== currentUserId) {
                const decryptedContent = await decryptMessageFromPeer(encryptedData, currentUserId);
                if (decryptedContent) {
                  content = decryptedContent;
                  isDecrypted = true;
                } else {
                  content = "[Зашифрованное сообщение]";
                }
              } else {
                if (encryptedData.ciphertextForSelf) {
                  const selfEncryptedData = {
                    ciphertext: encryptedData.ciphertextForSelf,
                    iv: encryptedData.ivForSelf,
                    ephemeralPublicKey: encryptedData.ephemeralPublicKeyForSelf
                  };
                  const decryptedContent = await decryptMessageFromPeer(selfEncryptedData, currentUserId);
                  if (decryptedContent) {
                    content = decryptedContent;
                    isDecrypted = true;
                  } else {
                    content = "[Ошибка расшифровки]";
                  }
                } else {
                  content = "[Отправлено]";
                }
              }
            } catch (e) {
              content = msg.senderId === currentUserId ? "[Отправлено]" : "[Зашифрованное сообщение]";
            }
          }

          let senderName = msg.senderId?.slice(0, 8);
          if (users && users[msg.senderId]) {
            senderName = users[msg.senderId].username || users[msg.senderId].display_name;
          }

          let sentAt = msg.sentAt || msg.createdAt;
          let validDate = true;
          try {
            if (new Date(sentAt).toString() === "Invalid Date") {
              validDate = false;
            }
          } catch {
            validDate = false;
          }

          return {
            ...msg,
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
  }, [messages, peerUserId, users, currentUserId, chatType]);

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

  if (decryptedMessages.length === 0) {
    return (
      <div className="message-list-empty">
        Нет сообщений. Напишите первое сообщение!
      </div>
    );
  }

  return (
    <div className="message-list">
      {decryptedMessages.map((msg) => {
        const isOwn = msg.senderId === currentUserId;
        const isGroupChat = chatType === "group";
        return (
          <div
            key={msg.id}
            className={`message ${isOwn ? "message-own" : "message-other"}`}
          >
            <div className="message-sender">
              {isGroupChat && !isOwn && (msg.senderName || msg.senderId?.slice(0, 8))}
              {isGroupChat && isOwn && "Вы"}
              {!isGroupChat && (isOwn ? "Вы" : (msg.senderName || msg.senderId?.slice(0, 8)))}
              {msg.isEncrypted && !msg.isDecrypted && !isGroupChat && <span className="ml-1 text-xs">🔒</span>}
              {msg.isEncrypted && msg.isDecrypted && !isGroupChat && <span className="ml-1 text-xs">✓🔒</span>}
            </div>
            <div className="message-content">
              <MessageContentRender content={msg.displayContent || "ПУСТОЕ СООБЩЕНИЕ"} />
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