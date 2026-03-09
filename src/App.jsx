import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Chat from "./pages/Chat";

// Replaces: PHP session checks + header("location: ...") redirects
// index.php → if(isset($_SESSION)) → redirect to users.php
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  // Replaces: if(isset($_SESSION['unique_id'])) { header("location: users.php"); }
  if (user) return <Navigate to="/users" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Replaces: index.php (signup page) */}
    <Route path="/" element={<PublicRoute><Signup /></PublicRoute>} />

    {/* Replaces: login.php */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

    {/* Replaces: users.php — protected, requires session */}
    <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />

    {/* Replaces: chat.php?user_id=123 → /chat/123 */}
    <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

    {/* Catch-all redirect */}
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
