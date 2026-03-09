import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

// Replaces: PHP $_SESSION['unique_id'] — now stored as JWT in localStorage
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, restore user from token (replaces: session_start() on every PHP page)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Replaces: $_SESSION['unique_id'] = $result['unique_id']; in login.php + signup.php
  const login = (userData) => {
    localStorage.setItem("token", userData.token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  // Replaces: session_unset(); session_destroy(); in logout.php
  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      // still clear locally even if API fails
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
