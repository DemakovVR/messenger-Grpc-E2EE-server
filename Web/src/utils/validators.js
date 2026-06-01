export const validateUsername = (username) => {
  if (!username.trim()) {
    return "Логин обязателен";
  }

  const allowedPattern = /^[a-zA-Z0-9._-]+$/;

  if (!allowedPattern.test(username)) {
    return "Логин может содержать только латинские буквы, цифры, дефис (-), подчёркивание (_) и точку (.)";
  }

  if (
    username.includes("@") ||
    username.includes(" ")
  ) {
    return "Логин не может содержать @ или пробел";
  }

  if (
    username.startsWith(".") ||
    username.endsWith(".")
  ) {
    return "Логин не может начинаться или заканчиваться точкой";
  }

  return "";
};

export const validateEmail = (email) => {
  if (!email) {
    return "Email обязателен";
  }

  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!re.test(email)) {
    return "Некорректный email";
  }

  const [localPart, domain] =
    email.split("@");

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".")
  ) {
    return "Email не может начинаться или заканчиваться точкой до @";
  }

  if (localPart.includes("..")) {
    return "Email не может содержать две точки подряд до @";
  }

  const domainParts = domain.split(".");
  const tld =
    domainParts[domainParts.length - 1];

  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return "Некорректный домен";
  }

  if (
    domainParts.some(
      (part) =>
        part.startsWith("-") ||
        part.endsWith("-")
    )
  ) {
    return "Некорректный домен";
  }

  return "";
};

export const validatePassword = (
  password
) => {
  if (!password) {
    return "Пароль обязателен";
  }

  if (password.length < 8) {
    return "Пароль должен содержать минимум 8 символов";
  }

  if (
    !/^[A-Za-z0-9 !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/.test(
      password
    )
  ) {
    return "Пароль содержит недопустимые символы";
  }

  return "";
};