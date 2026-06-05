import { useState, useRef, useEffect } from "react";
import { encryptMessageForPeer } from "../../../crypto/e2ee";
import { useAuth } from "../../../contexts/AuthContext";

export default function MessageInput({ chatId, peerUserId, onSend, disabled, chatType, groupCryptoKey, uploadFile }) {
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
        is_file: true,
        fileName: file.name,
        file_url: fileUrl,
        file_size: file.size
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

      await onSend(contentToSend, isEncrypted);
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

      await onSend(contentToSend, isEncrypted);
    } catch (err) {
      console.error(err);
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="message-input-form" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
  );
}