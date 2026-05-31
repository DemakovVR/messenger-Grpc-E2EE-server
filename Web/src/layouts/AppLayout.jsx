import { Outlet, Link } from "react-router-dom";
import "./layout.css";

function AppLayout() {
  return (
    <div className="app">
      {/* Sidebar */}
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
      </aside>

      {/* Main area */}
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