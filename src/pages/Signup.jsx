import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "" });
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
      // Send as JSON — no image upload needed anymore
      const { data: responseData } = await api.post("/api/auth/signup", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      login(responseData);
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

        .signup-page {
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

        .signup-card-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 920px;
          min-height: 560px;
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          box-shadow:
            0 24px 80px rgba(0,0,0,0.18),
            0 8px 24px rgba(0,0,0,0.1);
          animation: signupFadeUp 0.7s ease forwards;
        }

        /* LEFT */
        .signup-left {
          flex: 1.1;
          background: linear-gradient(145deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%);
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          padding: 40px 44px;
          position: relative;
          overflow: hidden;
          min-height: 560px;
        }
        .signup-left-circle {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.06); pointer-events: none;
        }
        .signup-left-logo {
          position: absolute; top: 36px; left: 40px;
          display: flex; align-items: center; gap: 10px;
        }
        .signup-left-logo i { font-size: 22px; color: rgba(255,255,255,0.9); }
        .signup-left-logo span { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
        .signup-left-content { position: relative; z-index: 2; color: #fff; }
        .signup-left-heading { font-size: 30px; font-weight: 700; line-height: 1.25; margin-bottom: 14px; color: #fff; }
        .signup-left-sub {
          font-size: 14px; font-weight: 300;
          color: rgba(255,255,255,0.75); line-height: 1.7;
          margin-bottom: 28px; max-width: 280px;
        }
        .signup-left-steps { display: flex; flex-direction: column; gap: 10px; }
        .signup-left-step {
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 10px 16px; border-radius: 10px;
        }
        .signup-step-num { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); min-width: 18px; }
        .signup-step-icon {
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .signup-step-icon i { font-size: 11px; color: #fff; }
        .signup-step-text { font-size: 13px; color: rgba(255,255,255,0.9); }

        /* RIGHT */
        .signup-right {
          flex: 1;
          background: #1e1e2e;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 52px 44px;
          overflow-y: auto;
        }
        .signup-form-inner { width: 100%; max-width: 340px; }
        .signup-form-title {
          font-size: 32px; font-weight: 300;
          color: #e2e8f0; margin-bottom: 30px; letter-spacing: 0.5px;
        }
        .signup-error {
          background: rgba(197,48,48,0.15);
          border: 1px solid rgba(197,48,48,0.3);
          color: #fc8181; padding: 10px 14px;
          border-radius: 8px; font-size: 13px;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 18px;
        }
        .signup-name-row { display: flex; gap: 18px; }
        .signup-field { margin-bottom: 18px; flex: 1; }
        .signup-field-label {
          font-size: 12px; font-weight: 500; color: #a0aec0;
          display: flex; align-items: center; gap: 7px;
          margin-bottom: 8px; letter-spacing: 0.3px;
        }
        .signup-field-label i { color: #89253E; font-size: 11px; }
        .signup-input-wrap { position: relative; }
        .signup-input {
          width: 100%; height: 46px;
          background: transparent; border: none;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          color: #e2e8f0; font-size: 15px;
          font-family: 'Poppins', sans-serif;
          outline: none; padding: 0 40px 0 0;
          transition: border-color 0.2s;
        }
        .signup-input::placeholder { color: rgba(255,255,255,0.25); font-size: 14px; }
        .signup-input:focus { border-bottom-color: #89253E; }
        .signup-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #1e1e2e inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
        .signup-eye {
          position: absolute; right: 0; top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3); cursor: pointer;
          font-size: 15px; transition: color 0.2s;
        }
        .signup-eye:hover { color: #89253E; }
        .signup-avatar-note {
          display: flex; align-items: flex-start; gap: 9px;
          background: rgba(137,37,62,0.12);
          border: 1px solid rgba(137,37,62,0.25);
          padding: 10px 14px; border-radius: 8px; margin-bottom: 6px;
        }
        .signup-avatar-note i { color: #89253E; font-size: 13px; margin-top: 2px; flex-shrink: 0; }
        .signup-avatar-note span { font-size: 12px; color: #a0aec0; line-height: 1.5; }
        .signup-submit-btn {
          width: 100%; height: 50px;
          border: none; border-radius: 10px;
          background: linear-gradient(135deg, #89253E, #3A6186);
          color: #fff; font-size: 16px; font-weight: 600;
          font-family: 'Poppins', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          margin-top: 22px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(137,37,62,0.4); letter-spacing: 0.3px;
        }
        .signup-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px); box-shadow: 0 8px 28px rgba(137,37,62,0.5);
        }
        .signup-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .signup-link-row {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; margin-top: 22px; font-size: 13px;
        }
        .signup-link-row span { color: #718096; }
        .signup-link-row a {
          color: #89253E; font-weight: 600; text-decoration: none;
          display: flex; align-items: center; gap: 5px; transition: color 0.2s;
        }
        .signup-link-row a:hover { color: #a83050; }

        @keyframes signupFadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 768px) {
          .signup-left { display: none; }
          .signup-card-container { max-width: 440px; min-height: auto; border-radius: 20px; }
          .signup-right { padding: 44px 32px; border-radius: 20px; }
        }
        @media (max-width: 600px) { .signup-name-row { flex-direction: column; gap: 0; } }
        @media (max-width: 480px) {
          .signup-right { padding: 36px 24px; }
          .signup-form-title { font-size: 26px; }
        }
      `}</style>

      <div className="signup-page">
        <div className="signup-card-container">

          {/* LEFT */}
          <div className="signup-left">
            {[
              { w:220, h:220, top:'-60px',  left:'-60px'  },
              { w:160, h:160, top:'60px',   right:'-40px' },
              { w:120, h:120, bottom:'80px',left:'30px'   },
              { w:80,  h:80,  bottom:'20px',right:'60px'  },
            ].map((c, i) => (
              <div key={i} className="signup-left-circle" style={{
                width: c.w, height: c.h,
                top: c.top, left: c.left, right: c.right, bottom: c.bottom,
              }} />
            ))}
            <div className="signup-left-logo">
              <i className="fa-solid fa-comments"></i>
              <span>TREVIO</span>
            </div>
            <div className="signup-left-content">
              <h2 className="signup-left-heading">Create your<br />account</h2>
              <p className="signup-left-sub">
                Join Trevio and start connecting with people around you. It's free!
              </p>
              <div className="signup-left-steps">
                {[
                  { icon: 'fa-solid fa-user-plus',        num: '01', text: 'Create your account' },
                  { icon: 'fa-solid fa-magnifying-glass', num: '02', text: 'Find your friends'   },
                  { icon: 'fa-solid fa-paper-plane',      num: '03', text: 'Start chatting!'     },
                ].map((s, i) => (
                  <div key={i} className="signup-left-step">
                    <span className="signup-step-num">{s.num}</span>
                    <div className="signup-step-icon"><i className={s.icon}></i></div>
                    <span className="signup-step-text">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="signup-right">
            <div className="signup-form-inner">
              <h2 className="signup-form-title">Sign up</h2>
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="signup-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                  </div>
                )}
                <div className="signup-name-row">
                  <div className="signup-field">
                    <div className="signup-field-label">
                      <i className="fa-solid fa-user"></i> First Name
                    </div>
                    <input
                      type="text" name="firstName" placeholder="First name"
                      value={formData.firstName} onChange={handleChange}
                      required className="signup-input"
                    />
                  </div>
                  <div className="signup-field">
                    <div className="signup-field-label">
                      <i className="fa-solid fa-user"></i> Last Name
                    </div>
                    <input
                      type="text" name="lastName" placeholder="Last name"
                      value={formData.lastName} onChange={handleChange}
                      required className="signup-input"
                    />
                  </div>
                </div>
                <div className="signup-field">
                  <div className="signup-field-label">
                    <i className="fa-solid fa-envelope"></i> E-mail
                  </div>
                  <input
                    type="text" name="email" placeholder="your@email.com"
                    value={formData.email} onChange={handleChange}
                    required className="signup-input"
                  />
                </div>
                <div className="signup-field">
                  <div className="signup-field-label">
                    <i className="fa-solid fa-lock"></i> Password
                  </div>
                  <div className="signup-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password" placeholder="••••••••••••"
                      value={formData.password} onChange={handleChange}
                      required className="signup-input"
                    />
                    <i
                      className={`signup-eye fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>
                <div className="signup-avatar-note">
                  <i className="fa-solid fa-circle-info"></i>
                  <span>You can upload a profile photo after creating your account in settings.</span>
                </div>
                <button type="submit" disabled={loading} className="signup-submit-btn">
                  {loading
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating account...</>
                    : <><i className="fa-solid fa-rocket"></i> Sign Up</>
                  }
                </button>
              </form>
              <div className="signup-link-row">
                <span>Have an account?</span>
                <Link to="/login">
                  <i className="fa-solid fa-right-to-bracket"></i> Login now
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Signup;