export default function AuthButton({ children, ...props }) {
  return (
    <button {...props}>
      {children}
    </button>
  );
}