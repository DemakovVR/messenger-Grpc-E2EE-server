import { useState } from "react";
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

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();

    const usernameError =
      validateUsername(username);

    const passwordError =
      validatePassword(password);

    setErrors({
      username: usernameError,
      password: passwordError,
    });

    if (
      usernameError ||
      passwordError
    ) {
      return;
    }

    try {
      await login(username, password);
    } catch (err) {
      alert("Ошибка входа");
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
            onChange={(e) =>
              setUsername(e.target.value)
            }
          />

          {errors.username && (
            <span className="errorText">
              {errors.username}
            </span>
          )}

          <AuthInput
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          {errors.password && (
            <span className="errorText">
              {errors.password}
            </span>
          )}

          <AuthButton type="submit">
            Войти
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