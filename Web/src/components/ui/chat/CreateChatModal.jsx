import { useState } from "react";
import { chatApi } from "../../../api/chatApi";
import "../../../styles/CreateChatModal.css";

export default function CreateChatModal({ onClose, onChatCreated }) {
  const [chatType, setChatType] = useState("private");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("search");

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await chatApi.searchUsers(searchQuery);
      setSearchResults(data.users || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setStep("confirm");
  };

  const addParticipant = (user) => {
    if (!participants.find(p => p.id === user.id)) {
      setParticipants([...participants, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeParticipant = (userId) => {
    setParticipants(participants.filter(p => p.id !== userId));
  };

  const handleCreatePrivate = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await chatApi.createPrivateChat(selectedUser.id);
      console.log("Create chat response:", data);
      
      if (data.isExisting === true) {
        setError("Чат с этим пользователем уже существует");
        setLoading(false);
      } else if (data.chatId) {
        onChatCreated(data.chatId);
        onClose();
      } else {
        setError("Ошибка: не получен ID чата");
        setLoading(false);
      }
    } catch (err) {
      console.error("Create error:", err);
      setError(err.response?.data?.message || "Ошибка создания чата");
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Введите название группы");
      return;
    }
    if (participants.length === 0) {
      setError("Добавьте хотя бы одного участника");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const participantIds = participants.map(p => p.id);
      const data = await chatApi.createGroupChat(groupName, participantIds);
      console.log("Create group response:", data);
      
      if (data.chatId) {
        onChatCreated(data.chatId);
        onClose();
      } else {
        setError("Ошибка: не получен ID чата");
        setLoading(false);
      }
    } catch (err) {
      console.error("Create group error:", err);
      setError(err.response?.data?.message || "Ошибка создания группы");
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("search");
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setGroupName("");
    setParticipants([]);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать чат</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="chat-type-selector">
            <button
              type="button"
              className={chatType === "private" ? "active" : ""}
              onClick={() => { reset(); setChatType("private"); }}
            >
              Личный чат
            </button>
            <button
              type="button"
              className={chatType === "group" ? "active" : ""}
              onClick={() => { reset(); setChatType("group"); }}
            >
              Групповой чат
            </button>
          </div>

          {chatType === "private" ? (
            <>
              {step === "search" && (
                <>
                  <div className="form-group">
                    <label>Поиск пользователя</label>
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Введите username или email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <button type="button" className="btn-primary btn-search" onClick={searchUsers}>Найти</button>
                    </div>
                  </div>

                  {loading && <div className="loading-text">Поиск...</div>}

                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map(user => (
                        <div key={user.id} className="search-result-item" onClick={() => selectUser(user)}>
                          <span>{user.username}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && searchQuery && !loading && (
                    <div className="no-results">Пользователи не найдены</div>
                  )}
                </>
              )}

              {step === "confirm" && selectedUser && (
                <>
                  <div className="selected-user">
                    <p>Выбран пользователь:</p>
                    <div className="selected-user-info">
                      <strong>{selectedUser.username}</strong>
                      <span className="user-email">{selectedUser.email}</span>
                    </div>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <div className="modal-buttons text-right">
                    <button type="button" className="btn-secondary" onClick={() => setStep("search")}>Назад</button>
                    <button type="button" className="btn-primary" onClick={handleCreatePrivate} disabled={loading}>
                      {loading ? "Создание..." : "Создать чат"}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Название группы</label>
                <input
                  type="text"
                  placeholder="Введите название группы..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Добавить участников</label>
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Введите username или email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="button" className="btn-primary btn-search" onClick={searchUsers}>Найти</button>
                </div>
                
                {loading && <div className="loading-text">Поиск...</div>}

                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(user => (
                      <div key={user.id} className="search-result-item" onClick={() => addParticipant(user)}>
                        <span>{user.username}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {participants.length > 0 && (
                <div className="participants-list">
                  <label>Участники ({participants.length})</label>
                  <div className="participants-scroll">
                    {participants.map(user => (
                      <div key={user.id} className="participant-item">
                        <span>{user.username}</span>
                        <button type="button" className="btn-remove" onClick={() => removeParticipant(user.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="error-message">{error}</div>}

              <div className="modal-buttons text-full">
                <button type="button" className="btn-primary" onClick={handleCreateGroup} disabled={loading}>
                  {loading ? "Создание..." : "Создать группу"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}