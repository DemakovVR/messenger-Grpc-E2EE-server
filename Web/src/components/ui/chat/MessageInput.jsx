import { useState, useRef, useEffect } from "react";
import { encryptMessageForPeer } from "../../../crypto/e2ee";

export default function MessageInput({ chatId, peerUserId, onSend, disabled, chatType, groupCryptoKey }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);

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

  const handleSend = async () => {
    if (!message.trim() || disabled || sending) return;

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
        console.log("E2EE: Encrypting message for peer:", peerUserId);
        let encrypted = await encryptMessageForPeer(peerUserId, messageText, false);
        if (!encrypted) {
          console.log("E2EE: Encryption failed, retrying with forceRefresh=true");
          encrypted = await encryptMessageForPeer(peerUserId, messageText, true);
        }
        if (encrypted) {
          contentToSend = JSON.stringify(encrypted);
          isEncrypted = true;
          console.log("E2EE: Message encrypted");
        } else {
          console.log("E2EE: Encryption failed after retry, sending plaintext");
        }
      } else if (isGroupChat) {
        console.log("Group chat: sending plaintext message");
      }

      await onSend(contentToSend, isEncrypted);
      console.log("Message sent, isEncrypted =", isEncrypted);
    } catch (err) {
      console.error("Send failed:", err);
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="message-input-form">
      <textarea
        ref={textareaRef}
        className="message-input"
        placeholder="Введите сообщение..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || sending}
        rows={1}
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