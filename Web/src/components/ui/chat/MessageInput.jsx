import { useState } from "react";
import { ensureSharedSecret, encryptMessage } from "../../../crypto/e2ee";

export default function MessageInput({ chatId, peerUserId, onSend, disabled }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || disabled || sending) return;

    const messageText = message.trim();
    setMessage("");
    setSending(true);

    try {
      let contentToSend = messageText;
      let isEncrypted = false;

      if (peerUserId) {
        const sharedSecret = await ensureSharedSecret(peerUserId);
        if (sharedSecret) {
          const encrypted = encryptMessage(sharedSecret, messageText);
          contentToSend = JSON.stringify(encrypted);
          isEncrypted = true;
        }
      }

      await onSend(contentToSend, isEncrypted);
    } catch (err) {
      console.error("Send failed:", err);
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message-input"
        placeholder="Введите сообщение..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={disabled || sending}
      />
      <button type="submit" className="message-send-btn" disabled={disabled || sending}>
        {sending ? "..." : "Отправить"}
      </button>
    </form>
  );
}