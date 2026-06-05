import { useState, useEffect } from "react";
import { chatApi } from "../../../api/chatApi";
import { useAuth } from "../../../contexts/AuthContext";
import "../../../styles/ChatInfoModal.css";

export default function ChatInfoModal({ chatId, chatType, chatName, chatCreatedBy, onClose, onUpdate }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addingMode, setAddingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isCreator = chatCreatedBy === user?.id;
  const isGroup = chatType === "group";
  const isPrivate = chatType === "private";

  useEffect(() => {
    loadChatInfo();
  }, [chatId]);

  const loadChatInfo = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getChat(chatId);
      if (data.chat) {
        const participantsList = data.chat.participants || [];
        setParticipants(participantsList);
      }
    } catch (err) {
      setError("Не удалось загрузить информацию о чате");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await chatApi.searchUsers(searchQuery);
      const filtered = (data.users || []).filter(u => !participants.some(p => p.id === u.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const addParticipants = async (userIds) => {
    setError("");
    setSuccess("");
    try {
      await chatApi.addParticipants(chatId, userIds);
      setSuccess("Участники добавлены");
      await loadChatInfo();
      if (onUpdate) onUpdate();
      setTimeout(() => setSuccess(""), 3000);
      setAddingMode(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка добавления");
    }
  };

  const removeParticipant = async (userId, username) => {
    if (!window.confirm(`Удалить пользователя ${username} из группы?`)) return;
    setError("");
    try {
      await chatApi.removeParticipants(chatId, [userId]);
      setSuccess(`Пользователь ${username} удалён`);
      await loadChatInfo();
      if (onUpdate) onUpdate();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка удаления");
    }
  };

  const leaveGroup = async () => {
    if (!window.confirm("Вы уверены, что хотите покинуть группу?")) return;
    try {
      await chatApi.leaveGroup(chatId);
      onClose();
      window.location.href = "/app";
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка выхода из группы");
    }
  };

  const deleteChat = async () => {
    if (!window.confirm("⚠️ Внимание! Чат будет полностью удалён без возможности восстановления. Продолжить?")) return;
    try {
      await chatApi.deleteChat(chatId);
      onClose();
      window.location.href = "/app";
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка удаления чата");
    }
  };

  const badgeStyle = {
    backgroundColor: "#f3f4f6",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "10px",
    color: "#4b5563",
    display: "inline-block",
    whiteSpace: "nowrap"
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content chatinfo-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Информация</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chatinfo-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isGroup ? "Информация о группе" : "Информация о чате"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="chat-name">
            <strong>Название:</strong> {chatName || (isGroup ? "Группа" : "Личный чат")}
          </div>

          <div className="participants-section">
            <div className="participants-header">
              <strong>Участники ({participants.length})</strong>
              {isGroup && isCreator && !addingMode && (
                <button className="add-participant-btn" onClick={() => setAddingMode(true)}>+ Добавить</button>
              )}
            </div>

            {addingMode && (
              <div className="add-participant-form">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="btn-search" onClick={searchUsers}>Найти</button>
                  <button className="btn-cancel" onClick={() => { setAddingMode(false); setSearchResults([]); setSearchQuery(""); }}>Отмена</button>
                </div>
                {searchLoading && <div className="loading-text">Поиск...</div>}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(u => (
                      <div key={u.id} className="search-result-item">
                        <span>{u.username}</span>
                        <button className="add-user-btn" onClick={() => addParticipants([u.id])}>+</button>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && searchQuery && !searchLoading && (
                  <div className="no-results">Пользователи не найдены</div>
                )}
              </div>
            )}

            <div className="participants-list" style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {participants.map(p => (
                <div 
                  key={p.id} 
                  className="participant-row" 
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #f0f0f0",
                    width: "100%",
                    boxSizing: "border-box",
                    gap: "12px"
                  }}
                >
                  <div 
                    className="participant-info" 
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      flex: 1,
                      minWidth: 0,
                      textAlign: "left"
                    }}
                  >
                    <div 
                      className="participant-name" 
                      style={{
                        fontWeight: 500,
                        fontSize: "14px",
                        color: "#111827",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {p.username || p.display_name}
                    </div>
                    
                    <div className="participant-badges" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {p.id === chatCreatedBy ? (
                        <span className="creator-badge" style={badgeStyle}>создатель</span>
                      ) : (
                        <span className="member-badge" style={badgeStyle}>участник</span>
                      )}
                      {p.id === user?.id && <span className="self-badge" style={badgeStyle}>Вы</span>}
                    </div>
                  </div>

                  {isGroup && isCreator && p.id !== user?.id && (
                    <button 
                      className="remove-user-btn" 
                      onClick={() => removeParticipant(p.id, p.username)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "18px",
                        color: "#ef4444",
                        padding: "4px 8px",
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            {isGroup && !isCreator && (
              <button className="btn-secondary full-width" onClick={leaveGroup}>Выйти из группы</button>
            )}
            {isGroup && isCreator && (
              <button className="btn-danger full-width" onClick={deleteChat}>Удалить чат</button>
            )}
            {isPrivate && (
              <button className="btn-danger full-width" onClick={deleteChat}>Удалить чат</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}