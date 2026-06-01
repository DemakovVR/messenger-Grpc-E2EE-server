import { Link } from "react-router-dom";

export default function AuthSwitch({ to, children }) {
  return (
    <Link to={to} className="switch">
      {children}
    </Link>
  );
}