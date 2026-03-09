import axios from "axios";

// Replaces: all new XMLHttpRequest() calls across chat.js, login.js, signup.js, users.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Automatically attach JWT token to every request
// Replaces: PHP session_start() + $_SESSION['unique_id'] check on every page
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
