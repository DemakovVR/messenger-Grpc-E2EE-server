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
  validateEmail,
  validatePassword,
} from "../utils/validators";

import "../styles/auth.css";

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({
      username: usernameError,
      email: emailError,
      password: passwordError,
    });

    if (usernameError || emailError || passwordError) {
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password);
      alert("Регистрация успешна! Теперь войдите в систему.");
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Register error:", err);
      alert(err.response?.data?.message || "Ошибка регистрации. Попробуйте другой логин или email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <h1>SecureTalk</h1>
        <p>Создание аккаунта</p>

        <AuthForm onSubmit={handleRegister}>
          <AuthInput
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
          />

          <AuthInput
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <AuthInput
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <AuthButton type="submit" disabled={isLoading}>
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </AuthButton>
        </AuthForm>

        <AuthSwitch to="/">
          Уже есть аккаунт? Войти
        </AuthSwitch>
      </AuthCard>
    </AuthContainer>
  );
}

export default RegisterPage;