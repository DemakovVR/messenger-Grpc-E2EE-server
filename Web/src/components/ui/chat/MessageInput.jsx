import { useState, useRef, useEffect } from "react";

export default function MessageInput({ onSend, disabled }) {
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
      await onSend(messageText, false);
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