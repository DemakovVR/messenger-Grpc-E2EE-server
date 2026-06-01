import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useChats } from "../services/hooks/useChats";
import "./layout.css";

function AppLayout() {
  const { logout, user } = useAuth();
  const { chats, loading } = useChats();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">SecureTalk</div>

        <div className="chatList">
          {loading && <div className="chatItem">Loading...</div>}
          
          {!loading && chats.length === 0 && (
            <div className="chatItem">No chats yet</div>
          )}
          
          {chats.map((chat) => (
            <NavLink
              key={chat.id}
              to={`/app/chat/${chat.id}`}
              className={({ isActive }) =>
                isActive ? "chatItem active" : "chatItem"
              }
            >
              {chat.type === "private" ? chat.name || "Private Chat" : chat.name}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span>ID: {user?.id?.slice(0, 8)}...</span>
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
    </div>
  );
}

export default AppLayout;