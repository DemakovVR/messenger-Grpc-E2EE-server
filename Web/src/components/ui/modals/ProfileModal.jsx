import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { validateUsername, validateEmail } from "../../../utils/validators";
import "../../../styles/ProfileModal.css";

export default function ProfileModal({ onClose, onProfileUpdate }) {
  const { user, getProfile, updateProfile, deleteAccount } = useAuth();
  
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        if (data) {
          setUsername(data.username || user?.username || "");
          setEmail(data.email || user?.email || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        setUsername(user?.username || "");
        setEmail(user?.email || "");
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);

    try {
      await updateProfile(username, email);
      setSuccess("Профиль успешно обновлён!");
      if (onProfileUpdate) onProfileUpdate({ username, email });
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Update profile error:", err);
      setError(err.response?.data?.message || "Ошибка обновления профиля");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "УДАЛИТЬ") {
      setError('Введите "УДАЛИТЬ" для подтверждения');
      return;
    }

    setLoading(true);
    try {
      await deleteAccount();
      onClose();
      window.location.href = "/";
    } catch (err) {
      console.error("Delete account error:", err);
      setError(err.response?.data?.message || "Ошибка удаления аккаунта");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Профиль пользователя</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!showDeleteConfirm ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Логин</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Введите логин"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Введите email"
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button type="submit" className="btn-primary btn-full" disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </form>
          ) : (
            <div className="delete-confirm">
              <div className="delete-warning">
                ⚠️ <strong>Внимание!</strong> Это действие необратимо.
              </div>
              <p>Все ваши данные, чаты и сообщения будут удалены навсегда.</p>
              <p>Введите <strong>"УДАЛИТЬ"</strong> для подтверждения:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Введите УДАЛИТЬ"
                className="delete-input"
              />
              {error && <div className="error-message">{error}</div>}
              <button
                type="button"
                className="btn-danger btn-full"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                {loading ? "Удаление..." : "Удалить навсегда"}
              </button>
            </div>
          )}
        </div>

        {!showDeleteConfirm && (
          <div className="modal-footer">
            <button
              type="button"
              className="delete-account-btn btn-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              🗑️  Удалить аккаунт
            </button>
          </div>
        )}
      </div>
    </div>
  );
}