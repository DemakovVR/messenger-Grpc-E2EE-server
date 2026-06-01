import { useState, useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function AuthInput({ type = "text", placeholder, value, onChange, error }) {
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  
  const isPassword = type === "password";

  const handleWrapperClick = (e) => {
    if (!e.target.closest('.togglePassword') && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="inputGroup">
      <div className="inputWrapper" onClick={handleWrapperClick}>
        <input
          ref={inputRef}
          className={`authInput ${error ? "inputError" : ""}`}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />

        {isPassword && (
          <button
            type="button"
            className="togglePassword"
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword(!showPassword);
            }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>

      {error && <span className="errorText">{error}</span>}
    </div>
  );
}

export default AuthInput;