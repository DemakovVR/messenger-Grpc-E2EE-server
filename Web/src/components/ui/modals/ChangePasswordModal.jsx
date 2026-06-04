import { useState } from "react";
import { authApi } from "../../../api/authApi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../../../styles/ChangePasswordModal.css";

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password) => {
    if (!password) return "Пароль обязателен";
    if (password.length < 8) return "Пароль должен содержать минимум 8 символов";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const oldPassError = validatePassword(oldPassword);
    if (oldPassError) {
      setError("Старый пароль: " + oldPassError);
      return;
    }

    const newPassError = validatePassword(newPassword);
    if (newPassError) {
      setError("Новый пароль: " + newPassError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Новый пароль и подтверждение не совпадают");
      return;
    }

    if (oldPassword === newPassword) {
      setError("Новый пароль должен отличаться от старого");
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword(oldPassword, newPassword);
      
      alert("Пароль успешно изменён! Пожалуйста, войдите снова.");
      
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      
      window.location.href = "/";
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Change password error:", err);
      setError(err.response?.data?.message || "Ошибка смены пароля. Проверьте правильность старого пароля.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content change-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Смена пароля</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Старый пароль</label>
              <div className="input-wrapper">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Введите старый пароль"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Новый пароль</label>
              <div className="input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль (мин. 8 символов)"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Подтверждение нового пароля</label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Подтвердите новый пароль"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? "Смена..." : "Сменить пароль"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}