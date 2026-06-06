import { useState, useRef, useEffect } from "react";
import { encryptMessageForPeer } from "../../../crypto/e2ee";
import { useAuth } from "../../../contexts/AuthContext";

export default function MessageInput({ chatId, peerUserId, onSend, disabled, chatType, groupCryptoKey, uploadFile, replyToMessage, onClearReply }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { blockedUsers } = useAuth();

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [message]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || disabled || sending || !uploadFile) return;

    if (chatType !== "group" && peerUserId && blockedUsers.includes(peerUserId)) {
      alert("Вы не можете отправлять файлы заблокированному пользователю");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSending(true);
    try {
      const fileUrl = await uploadFile(file);
      const filePayload = JSON.stringify({
        isFile: true,
        fileName: file.name,
        fileUrl: fileUrl,
        fileSize: file.size
      });

      let contentToSend = filePayload;
      let isEncrypted = false;
      const isGroupChat = chatType === "group";

      if (!isGroupChat && peerUserId) {
        let encrypted = await encryptMessageForPeer(peerUserId, filePayload, false);
        if (!encrypted) {
          encrypted = await encryptMessageForPeer(peerUserId, filePayload, true);
        }
        if (encrypted) {
          contentToSend = JSON.stringify(encrypted);
          isEncrypted = true;
        }
      }

      const currentReplyId = replyToMessage?.id || null;
      await onSend(contentToSend, isEncrypted, currentReplyId);
      
      if (onClearReply) onClearReply();
    } catch (err) {
      console.error("Ошибка при отправке файла:", err);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!message.trim() || disabled || sending) return;

    if (chatType !== "group" && peerUserId && blockedUsers.includes(peerUserId)) {
      alert("Вы не можете отправлять сообщения заблокированному пользователю");
      return;
    }

    const messageText = message.trim();
    setMessage("");
    setSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      let contentToSend = messageText;
      let isEncrypted = false;

      const isGroupChat = chatType === "group";

      if (!isGroupChat && peerUserId) {
        let encrypted = await encryptMessageForPeer(peerUserId, messageText, false);
        if (!encrypted) {
          encrypted = await encryptMessageForPeer(peerUserId, messageText, true);
        }
        if (encrypted) {
          contentToSend = JSON.stringify(encrypted);
          isEncrypted = true;
        }
      }

      const currentReplyId = replyToMessage?.id || null;
      await onSend(contentToSend, isEncrypted, currentReplyId);
      
      if (onClearReply) onClearReply();
    } catch (err) {
      console.error(err);
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const isFileQuote = (displayContent) => {
    if (!displayContent) return false;
    const str = String(displayContent).trim();
    return str.startsWith("{") || str.includes("📄 Файл:");
  };

  return (
    <div className="message-input-wrapper" style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      {replyToMessage && (
        <div className="reply-preview" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f1f3f9",
          padding: "8px 14px",
          borderRadius: "8px 8px 0 0",
          borderLeft: "4px solid #4c5cff",
          fontSize: "13px",
          marginBottom: "-1px",
          borderTop: "1px solid #e0e0e0",
          borderRight: "1px solid #e0e0e0"
        }}>
          <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "10px" }}>
            <span style={{ fontWeight: "600", color: "#4c5cff", display: "block" }}>
              Ответ пользователю {replyToMessage.senderName || replyToMessage.senderId?.slice(0, 8)}
            </span>
            <span style={{ color: "#666666" }}>
              {isFileQuote(replyToMessage.displayContent) 
                ? "📄 Файл" 
                : replyToMessage.displayContent}
            </span>
          </div>
          <button 
            onClick={onClearReply} 
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#888888", padding: "4px" }}
            title="Отменить ответ"
          >
            ✕
          </button>
        </div>
      )}

      <div className="message-input-form" style={{ 
        display: "flex", 
        gap: "10px", 
        alignItems: "center",
        borderTop: replyToMessage ? "none" : undefined
      }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: "none" }} 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={disabled || sending}
          className="file-attach-btn"
          style={{
            cursor: (disabled || sending) ? "default" : "pointer",
            fontSize: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            border: "none",
            outline: "none",
            background: "none",
            padding: "0"
          }}
        >
          📌
        </button>
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder="Введите сообщение..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          rows={1}
          style={{ flex: 1 }}
        />
        <button
          className="message-send-btn"
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
        >
          {sending ? "..." : "Отправить"}
        </button>
      </div>
    </div>
  );
}