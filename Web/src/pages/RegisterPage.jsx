import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function RegisterPage() {
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      await register(username, email, password);
      alert("Register success");

    } catch (err) {
      alert("Register failed");
    }
  };

  return (
    <div>
      <h1>Register</h1>

      <input
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleRegister}>
        Register
      </button>
    </div>
  );
}

export default RegisterPage;