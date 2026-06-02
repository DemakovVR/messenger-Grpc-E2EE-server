import { useRef, useEffect, useState } from "react";
import { ensureSharedSecret, decryptMessage } from "../../../crypto/e2ee";

export default function MessageList({ messages, currentUserId, peerUserId }) {
  const messagesEndRef = useRef(null);
  const [decryptedMessages, setDecryptedMessages] = useState([]);

  useEffect(() => {
    const decryptMessages = async () => {
      if (!messages.length) {
        setDecryptedMessages([]);
        return;
      }

      let sharedSecret = null;
      if (peerUserId) {
        sharedSecret = await ensureSharedSecret(peerUserId);
      }

      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          let content = msg.encryptedContent || msg.content;
          let isDecrypted = false;

          if (msg.isEncrypted && sharedSecret) {
            try {
              const encrypted = JSON.parse(content);
              const decryptedContent = decryptMessage(
                sharedSecret,
                encrypted.ciphertext,
                encrypted.iv
              );
              if (decryptedContent) {
                content = decryptedContent;
                isDecrypted = true;
              }
            } catch (e) {
              content = "[Зашифрованное сообщение]";
            }
          } else if (msg.isEncrypted) {
            content = "[Зашифрованное сообщение]";
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
            sentAt: validDate ? sentAt : null,
          };
        })
      );

      console.log("Decrypted messages:", decrypted);
      setDecryptedMessages(decrypted);
    };

    decryptMessages();
  }, [messages, peerUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decryptedMessages]);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
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
        console.log("Rendering message:", msg.id, "Content:", msg.displayContent);
        return (
          <div
            key={msg.id}
            className={`message ${isOwn ? "message-own" : "message-other"}`}
          >
            <div className="message-sender">
              {isOwn ? "Вы" : msg.senderId?.slice(0, 8)}
              {msg.isEncrypted && !msg.isDecrypted && <span className="ml-1 text-xs">🔒</span>}
              {msg.isEncrypted && msg.isDecrypted && <span className="ml-1 text-xs">✓🔒</span>}
            </div>
            <div className="message-content">
              {msg.displayContent || "ПУСТОЕ СООБЩЕНИЕ"}
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