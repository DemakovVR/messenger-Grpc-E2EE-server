export default function AuthForm({ children, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      {children}
    </form>
  );
}