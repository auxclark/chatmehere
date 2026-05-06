import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/auth/login", formData);
      login(data);
      navigate("/feed");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Poppins', sans-serif; }

        /* Full page background */
        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', sans-serif;
         background: #ffffff;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle background blobs */
        .login-page::before {
          content: '';
          position: absolute;
          top: -20%;
          left: -10%;
          width: 60%;
          height: 70%;
          background: radial-gradient(circle, rgba(137,37,62,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-page::after {
          content: '';
          position: absolute;
          bottom: -20%;
          right: -10%;
          width: 60%;
          height: 70%;
          background: radial-gradient(circle, rgba(58,97,134,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* The floating card — exactly like reference image */
        .login-card-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 920px;
          min-height: 520px;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          box-shadow:
            0 24px 80px rgba(0,0,0,0.18),
            0 8px 24px rgba(0,0,0,0.1);
          animation: loginFadeUp 0.7s ease forwards;
        }

        /* LEFT side — gradient panel */
        .login-left {
          flex: 1.1;
          background: linear-gradient(145deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%);
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          padding: 40px 44px;
          position: relative;
          overflow: hidden;
          min-height: 520px;
        }

        /* Decorative circles on left like reference */
        .login-left-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
        }

        .login-left-content {
          position: relative;
          z-index: 2;
          color: #fff;
        }
        .login-left-logo {
          position: absolute;
          top: 36px;
          left: 40px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .login-left-logo i { font-size: 22px; color: rgba(255,255,255,0.9); }
        .login-left-logo span {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.5px;
        }

        .login-left-heading {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.25;
          margin-bottom: 14px;
          color: #fff;
        }
        .login-left-sub {
          font-size: 14px;
          font-weight: 300;
          color: rgba(255,255,255,0.75);
          line-height: 1.7;
          margin-bottom: 28px;
          max-width: 280px;
        }
        .login-left-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .login-left-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 10px 16px;
          border-radius: 10px;
        }
        .login-left-feature i { font-size: 13px; color: rgba(255,255,255,0.9); }
        .login-left-feature span { font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 400; }

        /* RIGHT side — form panel (dark like reference) */
        .login-right {
          flex: 1;
          background: #1e1e2e;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 52px 44px;
        }
        .login-form-inner {
          width: 100%;
          max-width: 340px;
        }

        .login-form-title {
          font-size: 32px;
          font-weight: 300;
          color: #e2e8f0;
          margin-bottom: 36px;
          letter-spacing: 0.5px;
        }

        .login-error {
          background: rgba(197,48,48,0.15);
          border: 1px solid rgba(197,48,48,0.3);
          color: #fc8181;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .login-field { margin-bottom: 22px; }
        .login-field-label {
          font-size: 12px;
          font-weight: 500;
          color: #a0aec0;
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
        }
        .login-field-label i { color: #89253E; font-size: 11px; }

        .login-input-wrap { position: relative; }
        .login-input {
          width: 100%;
          height: 46px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          color: #e2e8f0;
          font-size: 15px;
          font-family: 'Poppins', sans-serif;
          outline: none;
          padding: 0 40px 0 0;
          transition: border-color 0.2s;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.25); font-size: 14px; }
        .login-input:focus { border-bottom-color: #89253E; }
        .login-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #1e1e2e inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }

        .login-eye {
          position: absolute;
          right: 0; top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          font-size: 15px;
          transition: color 0.2s;
        }
        .login-eye:hover { color: #89253E; }

        .login-submit-btn {
          width: 100%;
          height: 50px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #89253E, #3A6186);
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-top: 30px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(137,37,62,0.4);
          letter-spacing: 0.3px;
        }
        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(137,37,62,0.5);
        }
        .login-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .login-link-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          font-size: 13px;
        }
        .login-link-row span { color: #718096; }
        .login-link-row a {
          color: #89253E;
          font-weight: 600;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: color 0.2s;
        }
        .login-link-row a:hover { color: #a83050; }

        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-card-container {
            max-width: 440px;
            min-height: auto;
            border-radius: 20px;
          }
          .login-right { padding: 44px 32px; border-radius: 20px; }
        }
        @media (max-width: 480px) {
          .login-right { padding: 36px 24px; }
          .login-form-title { font-size: 26px; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card-container">

          {/* ── LEFT gradient panel ── */}
          <div className="login-left">
            {/* decorative circles */}
            {[
              { w:220, h:220, top:'-60px',  left:'-60px',  op:1 },
              { w:160, h:160, top:'60px',   right:'-40px', op:1 },
              { w:120, h:120, bottom:'80px',left:'30px',   op:1 },
              { w:80,  h:80,  bottom:'20px',right:'60px',  op:1 },
            ].map((c,i) => (
              <div key={i} className="login-left-circle" style={{
                width: c.w, height: c.h,
                top: c.top, left: c.left, right: c.right, bottom: c.bottom,
              }} />
            ))}

            {/* Logo top left */}
            <div className="login-left-logo">
              <i className="fa-solid fa-comments"></i>
              <span>TREVIO</span>
            </div>

            {/* Bottom text */}
            <div className="login-left-content">
              <h2 className="login-left-heading">
                Don't have an<br />account?
              </h2>
              <p className="login-left-sub">
                Connect with friends and the world around you on Trevio. It's Free!
              </p>
              <div className="login-left-features">
                {[
                  { icon: 'fa-solid fa-bolt',          text: 'Where conversation meets!'},
                  { icon: 'fa-solid fa-user-friends',   text: 'Private conversations' },
                  { icon: 'fa-solid fa-shield-halved',  text: 'Secure & encrypted' },
                ].map((f, i) => (
                  <div key={i} className="login-left-feature">
                    <i className={f.icon}></i>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT form panel ── */}
          <div className="login-right">
            <div className="login-form-inner">
              <h2 className="login-form-title">Sign in</h2>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="login-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                  </div>
                )}

                <div className="login-field">
                  <div className="login-field-label">
                    <i className="fa-solid fa-envelope"></i> E-mail
                  </div>
                  <div className="login-input-wrap">
                    <input
                      type="text"
                      name="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="login-input"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="login-field-label">
                    <i className="fa-solid fa-lock"></i> Password
                  </div>
                  <div className="login-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="login-input"
                    />
                    <i
                      className={`login-eye fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-submit-btn">
                  {loading
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in...</>
                    : <><i className="fa-solid fa-right-to-bracket"></i> Sign In</>
                  }
                </button>
              </form>

              <div className="login-link-row">
                <span>Don't have an account?</span>
                <Link to="/">
                  <i className="fa-solid fa-user-plus"></i> Sign up 
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Login;