import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./components/ui/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./layouts/AppLayout";

function ChatsPage() {
  return <div>Список чатов (будет здесь)</div>;
}

function ChatPage() {
  return <div>Чат (будет здесь)</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ChatsPage />,
      },
      {
        path: "chat/:chatId",
        element: <ChatPage />,
      },
    ],
  },
]);