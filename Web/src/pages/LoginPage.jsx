import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import AuthContainer from "../components/ui/auth/AuthContainer";
import AuthCard from "../components/ui/auth/AuthCard";
import AuthForm from "../components/ui/auth/AuthForm";
import AuthInput from "../components/ui/auth/AuthInput";
import AuthButton from "../components/ui/auth/AuthButton";
import AuthSwitch from "../components/ui/auth/AuthSwitch";

import {
  validateUsername,
  validatePassword,
} from "../utils/validators";

import "../styles/auth.css";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);

    setErrors({
      username: usernameError,
      password: passwordError,
    });

    if (usernameError || passwordError) {
      return;
    }

    setIsLoading(true);

    try {
      await login(username, password);
      navigate("/app", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.message || "Ошибка входа. Проверьте логин и пароль.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <h1>SecureTalk</h1>
        <p>Вход в систему</p>

        <AuthForm onSubmit={handleLogin}>
          <AuthInput
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
          />

          <AuthInput
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <AuthButton type="submit" disabled={isLoading}>
            {isLoading ? "Вход..." : "Войти"}
          </AuthButton>
        </AuthForm>

        <AuthSwitch to="/register">
          Создать аккаунт
        </AuthSwitch>
      </AuthCard>
    </AuthContainer>
  );
}

export default LoginPage;