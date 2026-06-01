import { useRef, useEffect } from "react";

export default function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        Нет сообщений. Напишите первое сообщение!
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        return (
          <div
            key={msg.id}
            className={`message ${isOwn ? "message-own" : "message-other"}`}
          >
            <div className="message-sender">
              {isOwn ? "Вы" : msg.sender_id?.slice(0, 8)}
            </div>
            <div className="message-content">
              {msg.encrypted_content || "[Зашифрованное сообщение]"}
            </div>
            <div className="message-time">
              {new Date(msg.sent_at).toLocaleTimeString()}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}