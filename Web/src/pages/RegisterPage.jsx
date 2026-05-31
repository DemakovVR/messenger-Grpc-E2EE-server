import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

import AuthContainer from "../components/ui/AuthContainer";
import AuthCard from "../components/ui/AuthCard";
import AuthForm from "../components/ui/AuthForm";
import AuthInput from "../components/ui/AuthInput";
import AuthButton from "../components/ui/AuthButton";
import AuthSwitch from "../components/ui/AuthSwitch";

import "../styles/auth.css";

function RegisterPage() {
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    await register(username, email, password);
  };

  return (
    <AuthContainer>
      <AuthCard>
        <h1>Создание аккаунта</h1>

        <AuthForm onSubmit={handleRegister}>
          <AuthInput
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

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
            Зарегистрироваться
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