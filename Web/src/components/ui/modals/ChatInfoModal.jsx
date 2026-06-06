import { useState, useEffect } from "react";
import { chatApi } from "../../../api/chatApi";
import { authApi } from "../../../api/authApi";
import { useAuth } from "../../../contexts/AuthContext";
import { translateAuditLog } from "../../../utils/auditFormatter"; 
import "../../../styles/ChatInfoModal.css";

export default function ChatInfoModal({ chatId, chatType, chatName, chatCreatedBy, onClose, onUpdate }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("participants");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [chatLogs, setChatLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const isCreator = chatCreatedBy === user?.id;
  const isGroup = chatType === "group";
  const isPrivate = chatType === "private";
  const showLogsTab = isPrivate || (isGroup && isCreator);

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

  const loadChatLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await authApi.getChatLogs(chatId);
      setChatLogs(data.logs || []);
    } catch (err) {
      setError("Не удалось загрузить журнал чата");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadChatInfo();
  }, [chatId]);

  useEffect(() => {
    if (activeTab === "logs" && showLogsTab && chatId) {
      loadChatLogs();
    }
  }, [activeTab, chatId, showLogsTab]);

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
      setActiveTab("participants");
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

          <div className="group-tabs">
            <button className={`group-tab ${activeTab === "participants" ? "active" : ""}`} onClick={() => setActiveTab("participants")}>
              Участники ({participants.length})
            </button>
            {isGroup && isCreator && (
              <button className={`group-tab ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>
                Добавить участников
              </button>
            )}
            {showLogsTab && (
              <button className={`group-tab ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
                Журнал чата
              </button>
            )}
          </div>

          {activeTab === "participants" && (
            <div className="participants-list">
              {participants.map(p => (
                <div key={p.id} className="participant-row">
                  <div className="participant-info">
                    <div className="participant-name">{p.username || p.display_name}</div>
                    <div className="participant-badges">
                      {p.id === chatCreatedBy ? (
                        <span className="creator-badge" style={badgeStyle}>Создатель</span>
                      ) : (
                        <span className="member-badge" style={badgeStyle}>Участник</span>
                      )}
                      {p.id === user?.id && <span className="self-badge" style={badgeStyle}>Вы</span>}
                    </div>
                  </div>
                  {isGroup && isCreator && p.id !== user?.id && (
                    <button className="remove-user-btn" onClick={() => removeParticipant(p.id, p.username)}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "add" && isGroup && isCreator && (
            <div className="add-participants">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn-search" onClick={searchUsers}>Найти</button>
                <button className="btn-cancel" onClick={() => { setActiveTab("participants"); setSearchQuery(""); setSearchResults([]); }}>Отмена</button>
              </div>
              {searchLoading && <div className="loading-text">Поиск...</div>}
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(u => (
                    <div key={u.id} className="search-result-item">
                      <div>
                        <div className="result-name">{u.username}</div>
                        <div className="result-email">{u.email}</div>
                      </div>
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

          {activeTab === "logs" && showLogsTab && (
            <div className="chat-logs">
              {logsLoading ? (
                <div className="loading-text">Загрузка...</div>
              ) : chatLogs.length === 0 ? (
                <div className="no-results">Нет записей</div>
              ) : (
                <div className="logs-table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Дата и время</th>
                        <th>Автор</th>
                        <th>Действие</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chatLogs.map(rawLog => {
                        const log = translateAuditLog(rawLog);
                        return (
                          <tr key={rawLog.id}>
                            <td style={{ whiteSpace: "nowrap" }}>{log.time}</td>
                            <td style={{ fontWeight: "bold" }}>
                              {rawLog.actorUsername || rawLog.username || rawLog.user?.username || "Система"}
                            </td>
                            <td>
                              <div className="log-action-name">{log.action}</div>
                              {log.error && (
                                <div className="log-error-details" style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                                  {log.error}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`status-badge ${log.statusBg}`} style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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