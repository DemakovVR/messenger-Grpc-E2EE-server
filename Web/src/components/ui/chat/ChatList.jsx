import { useChats } from "../hooks/useChats";
import "./ChatList.css";

export default function ChatList({ selectedChatId, onSelectChat }) {
  const { chats, loading, error } = useChats();

  if (loading) {
    return <div className="chat-list-loading">Загрузка чатов...</div>;
  }

  if (error) {
    return <div className="chat-list-error">Ошибка: {error}</div>;
  }

  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <div className="chat-list-empty">Нет чатов</div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-list-item ${selectedChatId === chat.id ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="chat-list-item-name">
              {chat.type === "private" ? "💬" : "👥"} {chat.name || "Чат"}
            </div>
            <div className="chat-list-item-type">
              {chat.type === "private" ? "Личный" : "Группа"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}