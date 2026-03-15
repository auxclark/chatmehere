import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "";

// ── Mini Bar Chart ────────────────────────────────────────────────────────
const MiniBarChart = ({ data, valueKey, color }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, width: "100%" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{
            width: "100%", borderRadius: "4px 4px 0 0",
            height: `${Math.max((d[valueKey] / max) * 50, 3)}px`,
            background: color, opacity: 0.8, transition: "height 0.4s ease",
          }} />
          <span style={{ fontSize: 9, color: "#a0aec0", writingMode: "vertical-rl", transform: "rotate(180deg)", lineHeight: 1 }}>
            {d.date?.split(",")[0]}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger }) => (
  <div style={mS.overlay}>
    <div style={{ ...mS.modal, maxWidth: 380 }}>
      <div style={mS.modalHeader}>
        <span style={{ fontSize: 20 }}>{danger ? "⚠️" : "❓"}</span>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a202c" }}>{title}</h3>
      </div>
      <p style={{ fontSize: 14, color: "#718096", padding: "0 24px 20px", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
        <button onClick={onCancel} style={mS.cancelBtn}>Cancel</button>
        <button onClick={onConfirm} style={danger ? mS.dangerBtn : mS.confirmBtn}>Confirm</button>
      </div>
    </div>
  </div>
);

// ── Edit User Modal ───────────────────────────────────────────────────────
const EditUserModal = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const key = window.__ADMIN_KEY__ || localStorage.getItem("adminKey") || ADMIN_SECRET;
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const res = await fetch(`${API_URL}/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": key },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.message && !result._id) { setError(result.message); return; }
      onSave(result);
    } catch { setError("Failed to save."); }
    finally { setLoading(false); }
  };

  return (
    <div style={mS.overlay}>
      <div style={mS.modal}>
        <div style={mS.modalHeader}>
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=89253E&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a202c" }}>Edit User</h3>
          <button onClick={onClose} style={mS.closeX}>✕</button>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={mS.errBox}>{error}</div>}
          <div style={mS.formRow}>
            <div style={mS.formField}>
              <label style={mS.formLabel}>First Name</label>
              <input style={mS.formInput} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div style={mS.formField}>
              <label style={mS.formLabel}>Last Name</label>
              <input style={mS.formInput} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div style={mS.formField}>
            <label style={mS.formLabel}>Email</label>
            <input style={mS.formInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={mS.formField}>
            <label style={mS.formLabel}>Status</label>
            <select style={mS.formInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="Active now">Active now</option>
              <option value="Offline now">Offline now</option>
            </select>
          </div>
          <div style={mS.formField}>
            <label style={mS.formLabel}>New Password <span style={{ color: "#a0aec0" }}>(leave blank to keep current)</span></label>
            <input style={mS.formInput} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={mS.cancelBtn}>Cancel</button>
            <button onClick={handleSave} disabled={loading} style={mS.saveBtn}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MAIN ADMIN DASHBOARD ──────────────────────────────────────────────────
const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgPage, setMsgPage] = useState(1);
  const [msgPages, setMsgPages] = useState(1);
  const [msgSearch, setMsgSearch] = useState("");
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [selectedMsgs, setSelectedMsgs] = useState([]);
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdminLogin = () => {
    if (!adminKey.trim()) { setLoginError("Please enter the admin key."); return; }
    fetch(`${API_URL}/api/admin/stats`, { headers: { "x-admin-token": adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.message === "Unauthorized — admin access only") {
          setLoginError("Invalid admin key. Access denied.");
        } else {
          localStorage.setItem("adminKey", adminKey);
          window.__ADMIN_KEY__ = adminKey;
          setIsLoggedIn(true);
          setStats(data);
        }
      })
      .catch(() => setLoginError("Could not connect to server."));
  };

  const api = useCallback((method, path, body) => {
    const key = window.__ADMIN_KEY__ || localStorage.getItem("adminKey") || ADMIN_SECRET;
    const opts = {
      method: method.toUpperCase(),
      headers: { "Content-Type": "application/json", "x-admin-token": key },
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(`${API_URL}${path}`, opts).then(r => r.json());
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const data = await api("GET", "/api/admin/stats");
    setStats(data);
    setStatsLoading(false);
  }, [api]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const data = await api("GET", `/api/admin/users?page=${userPage}&limit=10&search=${userSearch}`);
    setUsers(data.users || []);
    setUserTotal(data.total || 0);
    setUserPages(data.pages || 1);
    setUsersLoading(false);
  }, [api, userPage, userSearch]);

  const fetchMessages = useCallback(async () => {
    setMsgsLoading(true);
    const data = await api("GET", `/api/admin/messages?page=${msgPage}&limit=20&search=${msgSearch}`);
    setMessages(data.messages || []);
    setMsgTotal(data.total || 0);
    setMsgPages(data.pages || 1);
    setMsgsLoading(false);
  }, [api, msgPage, msgSearch]);

  useEffect(() => {
    const saved = localStorage.getItem("adminKey");
    if (saved) { window.__ADMIN_KEY__ = saved; setIsLoggedIn(true); }
  }, []);

  useEffect(() => { if (isLoggedIn && activeTab === "dashboard") fetchStats(); }, [isLoggedIn, activeTab, fetchStats]);
  useEffect(() => { if (isLoggedIn && activeTab === "users") fetchUsers(); }, [isLoggedIn, activeTab, fetchUsers]);
  useEffect(() => { if (isLoggedIn && activeTab === "messages") fetchMessages(); }, [isLoggedIn, activeTab, fetchMessages]);

  const handleDeleteUser = async () => {
    await api("DELETE", `/api/admin/users/${confirmDeleteUser._id}`);
    setConfirmDeleteUser(null);
    showToast(`User "${confirmDeleteUser.firstName}" deleted`);
    fetchUsers(); fetchStats();
  };

  const handleDeleteMsg = async () => {
    await api("DELETE", `/api/admin/messages/${confirmDeleteMsg._id}`);
    setConfirmDeleteMsg(null);
    showToast("Message deleted");
    fetchMessages(); fetchStats();
  };

  const handleBulkDelete = async () => {
    await api("POST", "/api/admin/messages/bulk-delete", { ids: selectedMsgs });
    setSelectedMsgs([]);
    setConfirmBulkDelete(false);
    showToast(`${selectedMsgs.length} messages deleted`);
    fetchMessages(); fetchStats();
  };

  const toggleSelectMsg = (id) => {
    setSelectedMsgs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminKey");
    window.__ADMIN_KEY__ = null;
    setIsLoggedIn(false);
    setAdminKey("");
    setStats(null);
  };

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Poppins', sans-serif; }
          @keyframes adminFadeUp {
            from { opacity: 0; transform: translateY(28px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* White page background — same concept as Login/Signup */}
        <div style={{
          minHeight: "100vh", width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Poppins', sans-serif",
          background: "#ffffff",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden",
        }}>

          {/* Floating card — same style as Login/Signup */}
          <div style={{
            display: "flex",
            width: "100%",
            maxWidth: 900,
            minHeight: 500,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)",
            animation: "adminFadeUp 0.7s ease forwards",
          }}>

            {/* LEFT — gradient panel */}
            <div style={{
              flex: 1.1,
              background: "linear-gradient(145deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%)",
              display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
              padding: "40px 44px", position: "relative", overflow: "hidden",
            }}>
              {/* Decorative circles */}
              {[
                { w: 220, h: 220, top: "-60px",  left: "-60px"  },
                { w: 160, h: 160, top: "60px",   right: "-40px" },
                { w: 120, h: 120, bottom: "80px", left: "30px"  },
                { w: 80,  h: 80,  bottom: "20px", right: "60px" },
              ].map((c, i) => (
                <div key={i} style={{
                  position: "absolute", borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", pointerEvents: "none",
                  width: c.w, height: c.h, top: c.top, left: c.left,
                  right: c.right, bottom: c.bottom,
                }} />
              ))}

              {/* Logo top left */}
              <div style={{ position: "absolute", top: 36, left: 40, display: "flex", alignItems: "center", gap: 10 }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: 22, color: "rgba(255,255,255,0.9)" }}></i>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>CHATMEHERE</span>
              </div>

              {/* Bottom content */}
              <div style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                <h2 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25, marginBottom: 14, color: "#fff" }}>
                  Admin<br />Control Panel
                </h2>
                <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 28, maxWidth: 280 }}>
                  Manage users, monitor messages and track platform activity all in one place.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: "fa-solid fa-users",       text: "User management & CRUD" },
                    { icon: "fa-solid fa-comments",     text: "Message monitoring"     },
                    { icon: "fa-solid fa-chart-line",   text: "Real-time statistics"   },
                  ].map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "10px 16px", borderRadius: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <i className={f.icon} style={{ fontSize: 12, color: "#fff" }}></i>
                      </div>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — form panel */}
            <div style={{
              flex: 1,
              background: "#1e1e2e",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "52px 44px",
            }}>
              <div style={{ width: "100%", maxWidth: 340 }}>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: "50%",
                    background: "linear-gradient(135deg, #89253E, #3A6186)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 18px",
                    boxShadow: "0 4px 18px rgba(137,37,62,0.35)",
                  }}>
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 24, color: "#fff" }}></i>
                  </div>
                  <h2 style={{ fontSize: 30, fontWeight: 300, color: "#e2e8f0", letterSpacing: "0.5px", marginBottom: 6 }}>
                    Admin Portal
                  </h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                    Enter your secret key to continue
                  </p>
                </div>

                {/* Error */}
                {loginError && (
                  <div style={{
                    background: "rgba(197,48,48,0.15)", border: "1px solid rgba(197,48,48,0.3)",
                    color: "#fc8181", padding: "10px 14px", borderRadius: 10,
                    fontSize: 13, marginBottom: 20,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <i className="fa-solid fa-circle-exclamation"></i> {loginError}
                  </div>
                )}

                {/* Key input */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 500, color: "#a0aec0",
                    display: "flex", alignItems: "center", gap: 7,
                    marginBottom: 8, letterSpacing: "0.3px",
                  }}>
                    <i className="fa-solid fa-key" style={{ color: "#89253E", fontSize: 11 }}></i>
                    Admin Secret Key
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your admin key..."
                      value={adminKey}
                      onChange={e => { setAdminKey(e.target.value); setLoginError(""); }}
                      onKeyUp={e => e.key === "Enter" && handleAdminLogin()}
                      style={{
                        width: "100%", height: 46,
                        background: "transparent", border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.15)",
                        color: "#e2e8f0", fontSize: 15,
                        fontFamily: "'Poppins', sans-serif",
                        outline: "none", padding: "0 40px 0 0",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={e => e.target.style.borderBottomColor = "#89253E"}
                      onBlur={e => e.target.style.borderBottomColor = "rgba(255,255,255,0.15)"}
                    />
                    <i
                      className={`fa-solid ${showLoginPassword ? "fa-eye-slash" : "fa-eye"}`}
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{
                        position: "absolute", right: 0, top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15,
                      }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleAdminLogin}
                  style={{
                    width: "100%", height: 50, border: "none", borderRadius: 10,
                    background: "linear-gradient(135deg, #89253E, #3A6186)",
                    color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                    boxShadow: "0 4px 20px rgba(137,37,62,0.4)",
                    transition: "transform 0.15s, box-shadow 0.2s",
                  }}
                  onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 8px 28px rgba(137,37,62,0.5)"; }}
                  onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(137,37,62,0.4)"; }}
                >
                  <i className="fa-solid fa-right-to-bracket"></i> Access Dashboard
                </button>

              </div>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; font-family: 'Poppins', sans-serif; }

        .admin-page { display: flex; height: 100vh; width: 100vw; background: #f0f4f8; font-family: 'Poppins', sans-serif; overflow: hidden; }

        .admin-sidebar { width: 240px; min-width: 240px; height: 100vh; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; flex-direction: column; flex-shrink: 0; box-shadow: 4px 0 20px rgba(0,0,0,0.15); }
        .admin-sidebar-logo { padding: 28px 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; }
        .admin-sidebar-logo-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #89253E, #3A6186); display: flex; align-items: center; justify-content: center; }
        .admin-sidebar-logo-icon i { font-size: 18px; color: #fff; }
        .admin-sidebar-logo-text h2 { font-size: 15px; font-weight: 700; color: #fff; }
        .admin-sidebar-logo-text p { font-size: 11px; color: rgba(255,255,255,0.4); }
        .admin-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4; }
        .admin-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px; cursor: pointer; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500; transition: all 0.2s; border: 1px solid transparent; }
        .admin-nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .admin-nav-item.active { background: linear-gradient(135deg, rgba(137,37,62,0.3), rgba(58,97,134,0.3)); color: #fff; border-color: rgba(137,37,62,0.3); }
        .admin-nav-item i { width: 18px; text-align: center; font-size: 15px; }
        .admin-sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.08); }
        .admin-logout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.4); font-size: 13px; width: 100%; border: none; background: transparent; font-family: 'Poppins', sans-serif; transition: all 0.2s; }
        .admin-logout-btn:hover { background: rgba(197,48,48,0.15); color: #fc8181; }

        .admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .admin-topbar { background: #fff; padding: 16px 28px; border-bottom: 1px solid #e8edf2; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04); flex-shrink: 0; }
        .admin-topbar-title { font-size: 20px; font-weight: 700; color: #1a202c; }
        .admin-topbar-sub { font-size: 13px; color: #718096; margin-top: 2px; }
        .admin-refresh-btn { display: flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; color: #4a5568; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; transition: all 0.2s; }
        .admin-refresh-btn:hover { border-color: #89253E; color: #89253E; }

        .admin-content { flex: 1; overflow-y: auto; padding: 28px; }
        .admin-content::-webkit-scrollbar { width: 5px; }
        .admin-content::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; margin-bottom: 28px; }
        .stat-card { background: #fff; border-radius: 18px; padding: 22px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px; border-left: 4px solid transparent; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .stat-card-top { display: flex; align-items: center; justify-content: space-between; }
        .stat-card-label { font-size: 12px; font-weight: 600; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-card-icon i { font-size: 18px; color: #fff; }
        .stat-card-value { font-size: 32px; font-weight: 700; color: #1a202c; line-height: 1; }
        .stat-card-sub { font-size: 12px; color: #48bb78; display: flex; align-items: center; gap: 4px; }

        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 28px; }
        .chart-card { background: #fff; border-radius: 18px; padding: 22px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .chart-title { font-size: 14px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
        .chart-sub { font-size: 12px; color: #a0aec0; margin-bottom: 16px; }

        .admin-table-card { background: #fff; border-radius: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
        .admin-table-header { padding: 20px 24px; border-bottom: 1px solid #f0f4f8; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
        .admin-table-title { font-size: 16px; font-weight: 700; color: #1a202c; }
        .admin-search-input { height: 38px; padding: 0 14px 0 36px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; outline: none; background: #f8fafc; color: #2d3748; font-family: 'Poppins', sans-serif; width: 220px; }
        .admin-search-input:focus { border-color: #89253E; }
        .admin-search-wrap { position: relative; }
        .admin-search-wrap i { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #a0aec0; font-size: 13px; }

        table { width: 100%; border-collapse: collapse; }
        th { padding: 12px 20px; text-align: left; font-size: 11px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; background: #f8fafc; border-bottom: 1px solid #f0f4f8; }
        td { padding: 14px 20px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #f7f9fc; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fafbfc; }

        .user-cell { display: flex; align-items: center; gap: 12px; }
        .user-cell img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
        .user-cell-name { font-size: 14px; font-weight: 600; color: #2d3748; }
        .user-cell-email { font-size: 12px; color: #a0aec0; }

        .badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge.online { background: #f0fff4; color: #276749; }
        .badge.offline { background: #f7f8fc; color: #a0aec0; }

        .action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; transition: all 0.2s; margin-right: 4px; }
        .edit-btn { background: #ebf8ff; color: #3182ce; }
        .edit-btn:hover { background: #3182ce; color: #fff; }
        .del-btn { background: #fff5f5; color: #e53e3e; }
        .del-btn:hover { background: #e53e3e; color: #fff; }

        .pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid #f0f4f8; }
        .pagination-info { font-size: 13px; color: #718096; }
        .page-btns { display: flex; gap: 6px; }
        .page-btn { width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #4a5568; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
        .page-btn:hover { border-color: #89253E; color: #89253E; }
        .page-btn.active { background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; border-color: transparent; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .bulk-bar { background: linear-gradient(135deg, #89253E, #3A6186); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; }
        .bulk-bar span { font-size: 13px; font-weight: 600; color: #fff; }
        .bulk-del-btn { display: flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 8px; border: none; background: rgba(255,255,255,0.2); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; transition: background 0.2s; }
        .bulk-del-btn:hover { background: rgba(255,255,255,0.35); }

        .admin-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 10px; animation: toastIn 0.3s ease forwards; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .admin-toast.success { background: linear-gradient(135deg, #38a169, #276749); }
        .admin-toast.error { background: linear-gradient(135deg, #e53e3e, #c53030); }

        .msg-preview { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .msg-from { display: flex; align-items: center; gap: 8px; }
        .msg-from img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }

        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .admin-sidebar { width: 64px; min-width: 64px; } .admin-sidebar-logo-text, .admin-nav-item span { display: none; } .admin-nav-item { justify-content: center; } .stats-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div className="admin-page">
        {/* Sidebar */}
        <div className="admin-sidebar">
          <div className="admin-sidebar-logo">
            <div className="admin-sidebar-logo-icon">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div className="admin-sidebar-logo-text">
              <h2>Admin</h2>
              <p>ChatMeHere</p>
            </div>
          </div>
          <nav className="admin-nav">
            {[
              { id: "dashboard", icon: "fa-solid fa-chart-line", label: "Dashboard" },
              { id: "users",     icon: "fa-solid fa-users",      label: "Users"     },
              { id: "messages",  icon: "fa-solid fa-comments",   label: "Messages"  },
            ].map(item => (
              <div key={item.id} className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <button className="admin-logout-btn" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="admin-main">
          <div className="admin-topbar">
            <div>
              <div className="admin-topbar-title">
                {activeTab === "dashboard" && "Dashboard Overview"}
                {activeTab === "users"     && "User Management"}
                {activeTab === "messages"  && "Message Management"}
              </div>
              <div className="admin-topbar-sub">
                {activeTab === "dashboard" && "Real-time stats and activity"}
                {activeTab === "users"     && `${userTotal} total users`}
                {activeTab === "messages"  && `${msgTotal} total messages`}
              </div>
            </div>
            <button className="admin-refresh-btn" onClick={() => {
              if (activeTab === "dashboard") fetchStats();
              if (activeTab === "users")     fetchUsers();
              if (activeTab === "messages")  fetchMessages();
            }}>
              <i className="fa-solid fa-rotate-right"></i> Refresh
            </button>
          </div>

          <div className="admin-content">

            {/* ── DASHBOARD TAB ── */}
            {activeTab === "dashboard" && stats && (
              <>
                <div className="stats-grid">
                  {[
                    { label: "Total Users",    value: stats.totalUsers,    sub: `+${stats.newUsersToday} today`,    icon: "fa-solid fa-users",      color: "#89253E", bg: "linear-gradient(135deg, #89253E, #b03060)" },
                    { label: "Active Now",     value: stats.activeUsers,   sub: "currently online",                icon: "fa-solid fa-circle",     color: "#48bb78", bg: "linear-gradient(135deg, #38a169, #48bb78)" },
                    { label: "Total Messages", value: stats.totalMessages, sub: `+${stats.newMessagesToday} today`, icon: "fa-solid fa-comments",   color: "#3A6186", bg: "linear-gradient(135deg, #3A6186, #5a8fc4)" },
                    { label: "New Today",      value: stats.newUsersToday, sub: "new registrations",               icon: "fa-solid fa-user-plus",  color: "#ed8936", bg: "linear-gradient(135deg, #ed8936, #f6ad55)" },
                  ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ borderLeftColor: s.color }}>
                      <div className="stat-card-top">
                        <span className="stat-card-label">{s.label}</span>
                        <div className="stat-card-icon" style={{ background: s.bg }}>
                          <i className={s.icon}></i>
                        </div>
                      </div>
                      <div className="stat-card-value">{s.value?.toLocaleString()}</div>
                      <div className="stat-card-sub">
                        <i className="fa-solid fa-arrow-trend-up"></i> {s.sub}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="charts-row">
                  <div className="chart-card">
                    <div className="chart-title">User Registrations</div>
                    <div className="chart-sub">Last 7 days</div>
                    <MiniBarChart data={stats.userGrowth} valueKey="users" color="linear-gradient(to top, #89253E, #e94560)" />
                  </div>
                  <div className="chart-card">
                    <div className="chart-title">Message Activity</div>
                    <div className="chart-sub">Last 7 days</div>
                    <MiniBarChart data={stats.messageActivity} valueKey="messages" color="linear-gradient(to top, #3A6186, #5a8fc4)" />
                  </div>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-header">
                    <span className="admin-table-title">Platform Summary</span>
                  </div>
                  <table>
                    <thead>
                      <tr><th>Metric</th><th>Value</th><th>Details</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Total Registered Users</td><td><strong>{stats.totalUsers}</strong></td><td>All time</td></tr>
                      <tr><td>Currently Online</td><td><strong style={{ color: "#48bb78" }}>{stats.activeUsers}</strong></td><td>Active now</td></tr>
                      <tr><td>Total Messages Sent</td><td><strong>{stats.totalMessages}</strong></td><td>All time</td></tr>
                      <tr><td>New Users Today</td><td><strong style={{ color: "#89253E" }}>{stats.newUsersToday}</strong></td><td>Registered today</td></tr>
                      <tr><td>Messages Today</td><td><strong style={{ color: "#3A6186" }}>{stats.newMessagesToday}</strong></td><td>Sent today</td></tr>
                      <tr><td>Offline Users</td><td><strong>{stats.totalUsers - stats.activeUsers}</strong></td><td>Not currently active</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === "users" && (
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <span className="admin-table-title">All Users</span>
                  <div className="admin-search-wrap">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input className="admin-search-input" placeholder="Search by name or email..." value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }} />
                  </div>
                </div>
                {usersLoading ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#a0aec0" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
                  </div>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr><th>User</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id}>
                            <td>
                              <div className="user-cell">
                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}&background=89253E&color=fff`} alt="" />
                                <div>
                                  <div className="user-cell-name">{u.firstName} {u.lastName}</div>
                                  <div className="user-cell-email">{u._id}</div>
                                </div>
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td><span className={`badge ${u.status === "Active now" ? "online" : "offline"}`}>{u.status === "Active now" ? "Online" : "Offline"}</span></td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td>
                              <button className="action-btn edit-btn" onClick={() => setEditingUser(u)} title="Edit"><i className="fa-solid fa-pen"></i></button>
                              <button className="action-btn del-btn" onClick={() => setConfirmDeleteUser(u)} title="Delete"><i className="fa-solid fa-trash"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pagination">
                      <span className="pagination-info">Showing {(userPage - 1) * 10 + 1}–{Math.min(userPage * 10, userTotal)} of {userTotal}</span>
                      <div className="page-btns">
                        <button className="page-btn" onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}><i className="fa-solid fa-chevron-left"></i></button>
                        {Array.from({ length: Math.min(userPages, 5) }, (_, i) => i + 1).map(p => (
                          <button key={p} className={`page-btn ${userPage === p ? "active" : ""}`} onClick={() => setUserPage(p)}>{p}</button>
                        ))}
                        <button className="page-btn" onClick={() => setUserPage(p => Math.min(userPages, p + 1))} disabled={userPage === userPages}><i className="fa-solid fa-chevron-right"></i></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── MESSAGES TAB ── */}
            {activeTab === "messages" && (
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <span className="admin-table-title">All Messages</span>
                  <div className="admin-search-wrap">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input className="admin-search-input" placeholder="Search message content..." value={msgSearch} onChange={e => { setMsgSearch(e.target.value); setMsgPage(1); }} />
                  </div>
                </div>

                {selectedMsgs.length > 0 && (
                  <div className="bulk-bar">
                    <span><i className="fa-solid fa-check-square" style={{ marginRight: 8 }}></i>{selectedMsgs.length} selected</span>
                    <button className="bulk-del-btn" onClick={() => setConfirmBulkDelete(true)}>
                      <i className="fa-solid fa-trash"></i> Delete Selected
                    </button>
                  </div>
                )}

                {msgsLoading ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#a0aec0" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
                  </div>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input type="checkbox" onChange={e => setSelectedMsgs(e.target.checked ? messages.map(m => m._id) : [])} checked={selectedMsgs.length === messages.length && messages.length > 0} />
                          </th>
                          <th>From</th><th>To</th><th>Message</th><th>Status</th><th>Date</th><th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.map(m => (
                          <tr key={m._id}>
                            <td><input type="checkbox" checked={selectedMsgs.includes(m._id)} onChange={() => toggleSelectMsg(m._id)} /></td>
                            <td>
                              <div className="msg-from">
                                <img src={m.senderId?.avatar || `https://ui-avatars.com/api/?name=${m.senderId?.firstName}&background=89253E&color=fff`} alt="" />
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.senderId?.firstName} {m.senderId?.lastName}</span>
                              </div>
                            </td>
                            <td>
                              <div className="msg-from">
                                <img src={m.receiverId?.avatar || `https://ui-avatars.com/api/?name=${m.receiverId?.firstName}&background=3A6186&color=fff`} alt="" />
                                <span style={{ fontSize: 13 }}>{m.receiverId?.firstName} {m.receiverId?.lastName}</span>
                              </div>
                            </td>
                            <td><div className="msg-preview">{m.message}</div></td>
                            <td><span className={`badge ${m.status === "seen" ? "online" : "offline"}`}>{m.status === "seen" ? "Seen" : "Delivered"}</span></td>
                            <td style={{ fontSize: 12, color: "#a0aec0" }}>{new Date(m.createdAt).toLocaleString()}</td>
                            <td>
                              <button className="action-btn del-btn" onClick={() => setConfirmDeleteMsg(m)} title="Delete"><i className="fa-solid fa-trash"></i></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pagination">
                      <span className="pagination-info">Showing {(msgPage - 1) * 20 + 1}–{Math.min(msgPage * 20, msgTotal)} of {msgTotal}</span>
                      <div className="page-btns">
                        <button className="page-btn" onClick={() => setMsgPage(p => Math.max(1, p - 1))} disabled={msgPage === 1}><i className="fa-solid fa-chevron-left"></i></button>
                        {Array.from({ length: Math.min(msgPages, 5) }, (_, i) => i + 1).map(p => (
                          <button key={p} className={`page-btn ${msgPage === p ? "active" : ""}`} onClick={() => setMsgPage(p)}>{p}</button>
                        ))}
                        <button className="page-btn" onClick={() => setMsgPage(p => Math.min(msgPages, p + 1))} disabled={msgPage === msgPages}><i className="fa-solid fa-chevron-right"></i></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modals */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={() => { setEditingUser(null); showToast("User updated successfully"); fetchUsers(); }}
          onClose={() => setEditingUser(null)}
        />
      )}
      {confirmDeleteUser && (
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to delete "${confirmDeleteUser.firstName} ${confirmDeleteUser.lastName}"? This will also delete ALL their messages. This cannot be undone.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setConfirmDeleteUser(null)}
          danger
        />
      )}
      {confirmDeleteMsg && (
        <ConfirmModal
          title="Delete Message"
          message={`Delete this message: "${confirmDeleteMsg.message.substring(0, 60)}..."? This cannot be undone.`}
          onConfirm={handleDeleteMsg}
          onCancel={() => setConfirmDeleteMsg(null)}
          danger
        />
      )}
      {confirmBulkDelete && (
        <ConfirmModal
          title="Bulk Delete Messages"
          message={`Are you sure you want to permanently delete ${selectedMsgs.length} selected messages? This cannot be undone.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
          danger
        />
      )}

      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <i className={`fa-solid ${toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}`}></i>
          {toast.msg}
        </div>
      )}
    </>
  );
};

// Modal shared styles
const mS = {
  overlay: { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden" },
  modalHeader: { padding: "22px 24px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f0f4f8" },
  closeX: { marginLeft: "auto", width: 30, height: 30, borderRadius: "50%", border: "none", background: "#f0f4f8", color: "#718096", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  formRow: { display: "flex", gap: 12 },
  formField: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  formLabel: { fontSize: 12, fontWeight: 600, color: "#4a5568" },
  formInput: { height: 42, padding: "0 12px", borderRadius: 10, border: "2px solid #e2e8f0", fontSize: 14, outline: "none", fontFamily: "'Poppins', sans-serif", color: "#2d3748", background: "#f8fafc" },
  errBox: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, border: "2px solid #e2e8f0", background: "#fff", color: "#718096", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  saveBtn: { flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #89253E, #3A6186)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  dangerBtn: { flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e53e3e, #c53030)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  confirmBtn: { flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #38a169, #276749)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
};

export default AdminDashboard;