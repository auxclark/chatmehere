import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Replaces: login.php (root) + javascript/login.js + javascript/pass-show-hide.js
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(""); // Replaces: errorText.style.display + .textContent
  const [showPassword, setShowPassword] = useState(false); // Replaces: pass-show-hide.js
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    // Replaces: inputField.onkeyup in login.js
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Replaces: form.onsubmit = (e) => { e.preventDefault(); }
    setLoading(true);
    setError("");

    try {
      // Replaces: xhr.open("POST", "php/login.php", true) in login.js
      const { data } = await api.post("/api/auth/login", formData);

      // Replaces: if(data === "success") { location.href = "users.php"; }
      login(data);
      navigate("/users");
    } catch (err) {
      // Replaces: errorText.style.display = "block"; errorText.textContent = data;
      setError(err.response?.data?.message || "Something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <section className="form login">
        <header>Login</header>
        <form onSubmit={handleSubmit}>
          {/* Replaces: <div class="error-text"> — only shown when there's an error */}
          {error && <div className="error-text">{error}</div>}

          <div className="field input">
            <input
              type="text"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field input">
            {/* Replaces: pass-show-hide.js toggle logic */}
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <i
              className={`fas fa-eye ${showPassword ? "active" : ""}`}
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <div className="field button">
            {/* Replaces: continueBtn.onclick in login.js */}
            <input
              type="submit"
              value={loading ? "Logging in..." : "Login"}
              disabled={loading}
            />
          </div>
        </form>

        {/* Replaces: <div class="link"> in login.php */}
        <div className="link">
          Don't have an account? <Link to="/">Signup here</Link>
        </div>
      </section>
    </div>
  );
};

export default Login;
