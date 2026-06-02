import { useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useChats } from "../../../services/hooks/useChats";
import CreateChatModal from "../chat/CreateChatModal";
import "../../../styles/chat.css";

function AppLayout() {
  const { logout, user } = useAuth();
  const { chats, loading, fetchChats, createPrivateChat, createGroupChat } = useChats();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleChatCreated = (chatId) => {
    fetchChats();
    navigate(`/app/chat/${chatId}`);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">SecureTalk</div>

        <button className="create-chat-btn" onClick={() => setShowCreateModal(true)}>
          + Новый чат
        </button>

        <div className="chat-list">
          {loading && <div className="chat-list-loading">Loading...</div>}
          
          {!loading && chats.length === 0 && (
            <div className="chat-list-empty">No chats yet</div>
          )}
          
          {chats.map((chat) => (
            <NavLink
              key={chat.id}
              to={`/app/chat/${chat.id}`}
              className={({ isActive }) =>
                isActive ? "chat-list-item active" : "chat-list-item"
              }
            >
              <div className="chat-list-item-name">
                {chat.type === "private" ? "💬" : "👥"} {chat.name || (chat.type === "private" ? "Private Chat" : "Group Chat")}
              </div>
              <div className="chat-list-item-type">
                {chat.type === "private" ? "Личный" : "Группа"}
              </div>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span>{user?.username || "Пользователь"}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="title">Chat</div>
          <div className="user">User</div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>

      {showCreateModal && (
        <CreateChatModal
          onClose={() => setShowCreateModal(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
}

export default AppLayout;