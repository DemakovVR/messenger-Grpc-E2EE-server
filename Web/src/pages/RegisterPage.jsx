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
  validateEmail,
  validatePassword,
} from "../utils/validators";

import "../styles/auth.css";

function RegisterPage() {
  const { register } = useAuth();

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [errors, setErrors] =
    useState({});

  const handleRegister = async (e) => {
    e.preventDefault();

    const usernameError =
      validateUsername(username);

    const emailError =
      validateEmail(email);

    const passwordError =
      validatePassword(password);

    setErrors({
      username: usernameError,
      email: emailError,
      password: passwordError,
    });

    if (
      usernameError ||
      emailError ||
      passwordError
    ) {
      return;
    }

    try {
      await register(
        username,
        email,
        password
      );
    } catch (err) {
      alert("Ошибка регистрации");
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <h1>Создание аккаунта</h1>

        <AuthForm
          onSubmit={handleRegister}
        >
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
            placeholder="E-mail"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          {errors.email && (
            <span className="errorText">
              {errors.email}
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