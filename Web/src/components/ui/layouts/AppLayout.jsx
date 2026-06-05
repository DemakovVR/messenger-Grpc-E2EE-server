import { useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useChats } from "../../../services/hooks/useChats";
import CreateChatModal from "../chat/CreateChatModal";
import ChangePasswordModal from "../modals/ChangePasswordModal";
import ProfileModal from "../modals/ProfileModal";
import "../../../styles/chat.css";

function AppLayout() {
  const { logout, user } = useAuth();
  const { chats, loading, fetchChats } = useChats();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleChatCreated = (chatId) => {
    fetchChats();
    navigate(`/app/chat/${chatId}`);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">SecureTalk</div>

        {!menuOpen && (
          <button className="create-chat-btn" onClick={() => setShowCreateModal(true)}>
            + Новый чат
          </button>
        )}

        {!menuOpen ? (
          <div className="chat-list">
            {loading && <div className="chat-list-loading">Loading...</div>}
            {!loading && chats.length === 0 && <div className="chat-list-empty">No chats yet</div>}
            {chats.map((chat) => {
              let displayName = chat.name;
              if (chat.type === "private") {
                displayName = chat.displayName || "Private Chat";
              }
              return (
                <NavLink
                  key={chat.id}
                  to={`/app/chat/${chat.id}`}
                  className={({ isActive }) =>
                    isActive ? "chat-list-item active" : "chat-list-item"
                  }
                >
                  <div className="chat-list-item-name">
                    {chat.type === "private" ? "💬" : "👥"} {displayName}
                  </div>
                  <div className="chat-list-item-type">
                    {chat.type === "private" ? "Личный" : "Группа"}
                  </div>
                </NavLink>
              );
            })}
          </div>
        ) : (
          <div className="menu-list">
            <div className="menu-header">
              <div className="user-avatar">👤</div>
              <div className="user-name">{user?.username || "Пользователь"}</div>
              <div className="user-email">{user?.email || ""}</div>
            </div>
            <div className="menu-items">
              <button className="menu-item" onClick={() => setShowProfileModal(true)}>
                <span className="menu-icon">👤</span>
                <span className="menu-text">Профиль</span>
              </button>
              <button className="menu-item" onClick={() => setShowChangePasswordModal(true)}>
                <span className="menu-icon">🔒</span>
                <span className="menu-text">Сменить пароль</span>
              </button>
              <button className="menu-item logout" onClick={handleLogout}>
                <span className="menu-icon">🚪</span>
                <span className="menu-text">Выйти</span>
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <button onClick={toggleMenu} className="menu-toggle-btn">
            {menuOpen ? (
              <>
                <span className="menu-icon">←</span>
                <span>Назад к чатам</span>
              </>
            ) : (
              <>
                <span className="menu-icon">☰</span>
                <span>Меню</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">{chatTitle}</div>
          <div className="topbar-right">
            <span className="user-name-display">{user?.username || "Гость"}</span>
          </div>
        </header>
        <div className="content">
          <Outlet context={{ setChatTitle }} />
        </div>
      </div>

      {showCreateModal && (
        <CreateChatModal onClose={() => setShowCreateModal(false)} onChatCreated={handleChatCreated} />
      )}
      {showChangePasswordModal && (
        <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}

export default AppLayout;