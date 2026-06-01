import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./layout.css";

function AppLayout() {
  const { logout, user } = useAuth();
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
          <div className="chatItem active">
            General Chat
          </div>
          <div className="chatItem">
            Alice
          </div>
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