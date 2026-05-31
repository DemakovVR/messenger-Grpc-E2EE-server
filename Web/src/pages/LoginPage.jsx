import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

import AuthContainer from "../components/ui/AuthContainer";
import AuthCard from "../components/ui/AuthCard";
import AuthForm from "../components/ui/AuthForm";
import AuthInput from "../components/ui/AuthInput";
import AuthButton from "../components/ui/AuthButton";
import AuthSwitch from "../components/ui/AuthSwitch";

import "../styles/auth.css";

function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <AuthContainer>
      <AuthCard>
        <h1>SecureTalk</h1>
        <p>Вход в систему</p>

        <AuthForm onSubmit={handleLogin}>
          <AuthInput
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <AuthInput
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

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