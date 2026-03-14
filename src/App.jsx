import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Chat from "./pages/Chat";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/users" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Signup page */}
    <Route path="/" element={<PublicRoute><Signup /></PublicRoute>} />

    {/* Login page */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

    {/* Main messenger layout — Users sidebar + Chat panel inline */}
    <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />

    {/* Fallback: direct URL access to a specific chat */}
    {/* e.g. someone bookmarks https://chatmehere.vercel.app/chat/abc123 */}
    <Route path="/chat/:userId" element={
      <ProtectedRoute>
        <div style={{ display: 'flex', height: '100vh' }}>
          <Chat />
        </div>
      </ProtectedRoute>
    } />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;