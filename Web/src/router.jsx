import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./components/ui/layouts/AppLayout";
import ChatPage from "./pages/ChatPage";
import UserAuditPage from "./pages/UserAuditPage";


function ChatsPage() {
  return <div className="flex-1 flex items-center justify-center text-gray-500 text-base"></div>;
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
      {
        path: "audit",
        element: <UserAuditPage />,
      },
    ],
  },
]);