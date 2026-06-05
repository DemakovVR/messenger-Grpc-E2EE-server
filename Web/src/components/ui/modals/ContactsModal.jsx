import { useState, useEffect } from "react";
import { chatApi } from "../../../api/chatApi";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../../styles/ContactsModal.css";

export default function ContactsModal({ onClose }) {
  const { user, blockedUsers, updateBlockedUsers } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [blockedDetails, setBlockedDetails] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(false);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getContacts();
      setContacts(data.contacts || []);
    } catch (err) {
      setError("Не удалось загрузить контакты");
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    setBlockedLoading(true);
    try {
      const data = await chatApi.getBlockedUsers();
      setBlockedDetails(data.users || []);
    } catch (err) {
      setError("Не удалось загрузить список заблокированных");
    } finally {
      setBlockedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "contacts") {
      loadContacts();
    } else if (activeTab === "blocked") {
      loadBlockedUsers();
    }
  }, [activeTab]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await chatApi.searchUsers(searchQuery);
      setSearchResults(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const addContact = async (userId) => {
    if (userId === user?.id) {
      setError("Нельзя добавить самого себя в контакты");
      setTimeout(() => setError(""), 3000);
      return;
    }
    try {
      await chatApi.addContact(userId);
      setSuccess("Пользователь добавлен в контакты");
      await loadContacts();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка добавления");
    }
  };

  const deleteContact = async (contactId, username) => {
    if (!window.confirm(`Удалить контакт ${username}?`)) return;
    try {
      await chatApi.deleteContact(contactId);
      setSuccess(`Контакт ${username} удалён`);
      await loadContacts();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка удаления");
    }
  };

  const blockContact = async (contactId, username) => {
    if (blockedUsers.includes(contactId)) {
      setError(`Пользователь ${username} уже заблокирован`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (!window.confirm(`Заблокировать пользователя ${username}? Вы не будете видеть его сообщения и не сможете писать ему.`)) return;
    try {
      await chatApi.blockContact(contactId);
      updateBlockedUsers(contactId, true);
      setSuccess(`Пользователь ${username} заблокирован`);
      await loadContacts();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка блокировки");
    }
  };

  const unblockUser = async (userId, username) => {
    if (!window.confirm(`Разблокировать пользователя ${username}?`)) return;
    try {
      await chatApi.unblockUser(userId);
      updateBlockedUsers(userId, false);
      setSuccess(`Пользователь ${username} разблокирован`);
      await loadBlockedUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка разблокировки");
    }
  };

  const openChat = async (userId) => {
    if (userId === user?.id) {
      setError("Нельзя создать чат с самим собой");
      setTimeout(() => setError(""), 3000);
      return;
    }
    try {
      const data = await chatApi.createPrivateChat(userId);
      navigate(`/app/chat/${data.chatId}`);
      onClose();
    } catch (err) {
      console.error("Failed to open chat", err);
      setError(err.response?.data?.message || "Не удалось создать/открыть чат");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contacts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Контакты и блокировки</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="tabs">
            <button className={`tab ${activeTab === "contacts" ? "active" : ""}`} onClick={() => setActiveTab("contacts")}>
              Контакты
            </button>
            <button className={`tab ${activeTab === "blocked" ? "active" : ""}`} onClick={() => setActiveTab("blocked")}>
              Заблокированные
            </button>
          </div>

          {activeTab === "contacts" && (
            <>
              <div className="search-section">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="btn-search" onClick={searchUsers}>Найти</button>
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
                        <button className="add-contact-btn" onClick={() => addContact(u.id)}>➕</button>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && searchQuery && !searchLoading && (
                  <div className="no-results">Пользователи не найдены</div>
                )}
              </div>

              <div className="contacts-list">
                <h3>Мои контакты</h3>
                {loading ? (
                  <div className="loading-text">Загрузка...</div>
                ) : contacts.length === 0 ? (
                  <div className="no-results">Нет контактов</div>
                ) : (
                  contacts.map(contact => (
                    <div key={contact.id} className="contact-item">
                      <div className="contact-info" onClick={() => openChat(contact.id)}>
                        <div className="contact-name">{contact.username}</div>
                        <div className="contact-email">{contact.email}</div>
                      </div>
                      <div className="contact-actions">
                        <button
                          className="block-btn"
                          onClick={() => blockContact(contact.id, contact.username)}
                          title="Заблокировать"
                        >
                          🚫
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => deleteContact(contact.id, contact.username)}
                          title="Удалить контакт"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "blocked" && (
            <div className="blocked-list">
              <h3>Заблокированные пользователи</h3>
              {blockedLoading ? (
                <div className="loading-text">Загрузка...</div>
              ) : blockedDetails.length === 0 ? (
                <div className="no-results">Нет заблокированных</div>
              ) : (
                blockedDetails.map(u => {
                  return (
                    <div key={u.id} className="contact-item blocked-item">
                      <div className="contact-info">
                        <div className="contact-name">{u.username}</div>
                        <div className="contact-email">{u.email}</div>
                      </div>
                      <div className="contact-actions">
                        <button
                          className="unblock-btn"
                          onClick={() => unblockUser(u.id, u.username)}
                          title="Разблокировать"
                        >
                          🔓
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}