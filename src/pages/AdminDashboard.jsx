import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "";

// ── Mini Bar Chart ─────────────────────────────────────────────────────────
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

// ── Confirm Modal ──────────────────────────────────────────────────────────
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

// ── Edit User Modal ────────────────────────────────────────────────────────
const EditUserModal = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState({
    firstName: user.firstName, lastName: user.lastName,
    email: user.email, status: user.status, password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setLoading(true); setError("");
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
      <div style={{ ...mS.modal, maxWidth: 480 }}>
        <div style={mS.modalHeader}>
          <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=89253E&color=fff`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a202c" }}>Edit User</h3>
          <button onClick={onClose} style={mS.closeX}>✕</button>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={mS.errBox}>{error}</div>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ ...mS.formField, minWidth: 120 }}>
              <label style={mS.formLabel}>First Name</label>
              <input style={mS.formInput} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div style={{ ...mS.formField, minWidth: 120 }}>
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
            <label style={mS.formLabel}>New Password <span style={{ color: "#a0aec0" }}>(leave blank to keep)</span></label>
            <input style={mS.formInput} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={mS.cancelBtn}>Cancel</button>
            <button onClick={handleSave} disabled={loading} style={mS.saveBtn}>{loading ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MAIN ADMIN DASHBOARD ───────────────────────────────────────────────────
const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle

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
    const opts = { method: method.toUpperCase(), headers: { "Content-Type": "application/json", "x-admin-token": key } };
    if (body) opts.body = JSON.stringify(body);
    return fetch(`${API_URL}${path}`, opts).then(r => r.json());
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const data = await api("GET", "/api/admin/stats");
    setStats(data); setStatsLoading(false);
  }, [api]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const data = await api("GET", `/api/admin/users?page=${userPage}&limit=10&search=${userSearch}`);
    setUsers(data.users || []); setUserTotal(data.total || 0); setUserPages(data.pages || 1); setUsersLoading(false);
  }, [api, userPage, userSearch]);

  const fetchMessages = useCallback(async () => {
    setMsgsLoading(true);
    const data = await api("GET", `/api/admin/messages?page=${msgPage}&limit=20&search=${msgSearch}`);
    setMessages(data.messages || []); setMsgTotal(data.total || 0); setMsgPages(data.pages || 1); setMsgsLoading(false);
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
    setConfirmDeleteUser(null); showToast(`User "${confirmDeleteUser.firstName}" deleted`);
    fetchUsers(); fetchStats();
  };

  const handleDeleteMsg = async () => {
    await api("DELETE", `/api/admin/messages/${confirmDeleteMsg._id}`);
    setConfirmDeleteMsg(null); showToast("Message deleted");
    fetchMessages(); fetchStats();
  };

  const handleBulkDelete = async () => {
    await api("POST", "/api/admin/messages/bulk-delete", { ids: selectedMsgs });
    setSelectedMsgs([]); setConfirmBulkDelete(false);
    showToast(`${selectedMsgs.length} messages deleted`);
    fetchMessages(); fetchStats();
  };

  const toggleSelectMsg = (id) => setSelectedMsgs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleLogout = () => {
    localStorage.removeItem("adminKey"); window.__ADMIN_KEY__ = null;
    setIsLoggedIn(false); setAdminKey(""); setStats(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // close sidebar on mobile after selecting tab
  };

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────
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
          .admin-login-page {
            min-height: 100vh; width: 100%;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Poppins', sans-serif;
            background: #ffffff; padding: 24px 16px;
          }
          .admin-login-card {
            display: flex; width: 100%; max-width: 900px; min-height: 500px;
            border-radius: 24px; overflow: hidden;
            box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1);
            animation: adminFadeUp 0.7s ease forwards;
          }
          .admin-login-left {
            flex: 1.1;
            background: linear-gradient(145deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%);
            display: flex; align-items: flex-end; justify-content: flex-start;
            padding: 40px 44px; position: relative; overflow: hidden;
          }
          .admin-login-right {
            flex: 1; background: #1e1e2e;
            display: flex; align-items: center; justify-content: center;
            padding: 52px 44px;
          }
          .admin-login-circle {
            position: absolute; border-radius: 50%;
            background: rgba(255,255,255,0.06); pointer-events: none;
          }
          .admin-login-logo-row {
            position: absolute; top: 36px; left: 40px;
            display: flex; align-items: center; gap: 10px;
          }
          .admin-login-features { display: flex; flex-direction: column; gap: 10px; }
          .admin-login-feature {
            display: flex; align-items: center; gap: 12px;
            background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.12);
            padding: 10px 16px; border-radius: 10px;
          }
          .admin-login-feature-icon {
            width: 28px; height: 28px; border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .admin-key-input {
            width: 100%; height: 46px;
            background: transparent; border: none;
            border-bottom: 1px solid rgba(255,255,255,0.15);
            color: #e2e8f0; font-size: 15px;
            font-family: 'Poppins', sans-serif;
            outline: none; padding: 0 40px 0 0;
            transition: border-color 0.2s;
          }
          .admin-key-input:focus { border-bottom-color: #89253E; }
          .admin-access-btn {
            width: 100%; height: 50px; border: none; border-radius: 10px;
            background: linear-gradient(135deg, #89253E, #3A6186);
            color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;
            font-family: 'Poppins', sans-serif;
            display: flex; align-items: center; justify-content: center; gap: 9px;
            box-shadow: 0 4px 20px rgba(137,37,62,0.4);
            transition: transform 0.15s, box-shadow 0.2s;
          }
          .admin-access-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(137,37,62,0.5); }

          /* Hide left panel on small screens */
          @media (max-width: 700px) {
            .admin-login-left { display: none; }
            .admin-login-card { max-width: 440px; min-height: auto; border-radius: 20px; }
            .admin-login-right { padding: 44px 28px; border-radius: 20px; }
          }
          @media (max-width: 420px) {
            .admin-login-right { padding: 36px 20px; }
          }
        `}</style>

        <div className="admin-login-page">
          <div className="admin-login-card">
            {/* LEFT */}
            <div className="admin-login-left">
              {[
                { w: 220, h: 220, top: "-60px",   left: "-60px"  },
                { w: 160, h: 160, top: "60px",    right: "-40px" },
                { w: 120, h: 120, bottom: "80px", left: "30px"   },
                { w: 80,  h: 80,  bottom: "20px", right: "60px"  },
              ].map((c, i) => (
                <div key={i} className="admin-login-circle" style={{ width: c.w, height: c.h, top: c.top, left: c.left, right: c.right, bottom: c.bottom }} />
              ))}
              <div className="admin-login-logo-row">
                <i className="fa-solid fa-shield-halved" style={{ fontSize: 22, color: "rgba(255,255,255,0.9)" }}></i>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>CHATMEHERE</span>
              </div>
              <div style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                <h2 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25, marginBottom: 14, color: "#fff" }}>Admin<br />Control Panel</h2>
                <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 28, maxWidth: 280 }}>
                  Manage users, monitor messages and track platform activity all in one place.
                </p>
                <div className="admin-login-features">
                  {[
                    { icon: "fa-solid fa-users",     text: "User management & CRUD" },
                    { icon: "fa-solid fa-comments",   text: "Message monitoring"     },
                    { icon: "fa-solid fa-chart-line", text: "Real-time statistics"   },
                  ].map((f, i) => (
                    <div key={i} className="admin-login-feature">
                      <div className="admin-login-feature-icon">
                        <i className={f.icon} style={{ fontSize: 12, color: "#fff" }}></i>
                      </div>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="admin-login-right">
              <div style={{ width: "100%", maxWidth: 340 }}>
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                  <div style={{ width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(135deg, #89253E, #3A6186)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 4px 18px rgba(137,37,62,0.35)" }}>
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 24, color: "#fff" }}></i>
                  </div>
                  <h2 style={{ fontSize: 28, fontWeight: 300, color: "#e2e8f0", letterSpacing: "0.5px", marginBottom: 6 }}>Admin Portal</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Enter your secret key to continue</p>
                </div>

                {loginError && (
                  <div style={{ background: "rgba(197,48,48,0.15)", border: "1px solid rgba(197,48,48,0.3)", color: "#fc8181", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="fa-solid fa-circle-exclamation"></i> {loginError}
                  </div>
                )}

                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#a0aec0", display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <i className="fa-solid fa-key" style={{ color: "#89253E", fontSize: 11 }}></i> Admin Secret Key
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your admin key..."
                      value={adminKey}
                      onChange={e => { setAdminKey(e.target.value); setLoginError(""); }}
                      onKeyUp={e => e.key === "Enter" && handleAdminLogin()}
                      className="admin-key-input"
                    />
                    <i
                      className={`fa-solid ${showLoginPassword ? "fa-eye-slash" : "fa-eye"}`}
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15 }}
                    />
                  </div>
                </div>

                <button onClick={handleAdminLogin} className="admin-access-btn">
                  <i className="fa-solid fa-right-to-bracket"></i> Access Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── MAIN DASHBOARD ─────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; font-family: 'Poppins', sans-serif; }
        body { overflow-x: hidden; }

        .admin-page { display: flex; height: 100vh; width: 100vw; background: #f0f4f8; font-family: 'Poppins', sans-serif; overflow: hidden; position: relative; }

        /* ── SIDEBAR ── */
        .admin-sidebar {
          width: 240px; min-width: 240px; height: 100vh;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          display: flex; flex-direction: column; flex-shrink: 0;
          box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          transition: transform 0.3s ease;
          z-index: 100;
        }
        .admin-sidebar-logo { padding: 24px 20px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; }
        .admin-sidebar-logo-icon { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #89253E, #3A6186); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .admin-sidebar-logo-icon i { font-size: 17px; color: #fff; }
        .admin-sidebar-logo-text h2 { font-size: 15px; font-weight: 700; color: #fff; }
        .admin-sidebar-logo-text p { font-size: 11px; color: rgba(255,255,255,0.4); }
        .admin-nav { flex: 1; padding: 14px 10px; display: flex; flex-direction: column; gap: 4; }
        .admin-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px; cursor: pointer; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500; transition: all 0.2s; border: 1px solid transparent; }
        .admin-nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .admin-nav-item.active { background: linear-gradient(135deg, rgba(137,37,62,0.3), rgba(58,97,134,0.3)); color: #fff; border-color: rgba(137,37,62,0.3); }
        .admin-nav-item i { width: 18px; text-align: center; font-size: 15px; flex-shrink: 0; }
        .admin-sidebar-footer { padding: 14px 10px; border-top: 1px solid rgba(255,255,255,0.08); }
        .admin-logout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; cursor: pointer; color: rgba(255,255,255,0.4); font-size: 13px; width: 100%; border: none; background: transparent; font-family: 'Poppins', sans-serif; transition: all 0.2s; }
        .admin-logout-btn:hover { background: rgba(197,48,48,0.15); color: #fc8181; }

        /* Sidebar overlay on mobile */
        .admin-sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }

        /* ── MAIN ── */
        .admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .admin-topbar { background: #fff; padding: 14px 20px; border-bottom: 1px solid #e8edf2; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04); flex-shrink: 0; gap: 12px; }
        .admin-topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .admin-menu-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f0f4f8; color: #4a5568; font-size: 16px; cursor: pointer; display: none; align-items: center; justify-content: center; flex-shrink: 0; }
        .admin-topbar-title { font-size: 18px; font-weight: 700; color: #1a202c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-topbar-sub { font-size: 12px; color: #718096; margin-top: 2px; }
        .admin-refresh-btn { display: flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; color: #4a5568; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
        .admin-refresh-btn:hover { border-color: #89253E; color: #89253E; }
        .admin-refresh-btn span { display: inline; }

        .admin-content { flex: 1; overflow-y: auto; padding: 20px; }
        .admin-content::-webkit-scrollbar { width: 4px; }
        .admin-content::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        /* ── STATS GRID ── */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px; border-left: 4px solid transparent; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .stat-card-top { display: flex; align-items: center; justify-content: space-between; }
        .stat-card-label { font-size: 11px; font-weight: 600; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-card-icon i { font-size: 17px; color: #fff; }
        .stat-card-value { font-size: 28px; font-weight: 700; color: #1a202c; line-height: 1; }
        .stat-card-sub { font-size: 12px; color: #48bb78; display: flex; align-items: center; gap: 4px; }

        /* ── CHARTS ── */
        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .chart-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .chart-title { font-size: 14px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
        .chart-sub { font-size: 12px; color: #a0aec0; margin-bottom: 14px; }

        /* ── TABLE ── */
        .admin-table-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
        .admin-table-header { padding: 16px 20px; border-bottom: 1px solid #f0f4f8; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .admin-table-title { font-size: 15px; font-weight: 700; color: #1a202c; }
        .admin-search-wrap { position: relative; }
        .admin-search-wrap i { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #a0aec0; font-size: 12px; }
        .admin-search-input { height: 36px; padding: 0 12px 0 32px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; outline: none; background: #f8fafc; color: #2d3748; font-family: 'Poppins', sans-serif; width: 200px; }
        .admin-search-input:focus { border-color: #89253E; }

        /* Table scroll wrapper for mobile */
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .table-scroll::-webkit-scrollbar { height: 4px; }
        .table-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; background: #f8fafc; border-bottom: 1px solid #f0f4f8; white-space: nowrap; }
        td { padding: 12px 16px; font-size: 13px; color: #2d3748; border-bottom: 1px solid #f7f9fc; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fafbfc; }

        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-cell img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .user-cell-name { font-size: 13px; font-weight: 600; color: #2d3748; white-space: nowrap; }
        .user-cell-email { font-size: 11px; color: #a0aec0; white-space: nowrap; }

        .badge { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .badge.online { background: #f0fff4; color: #276749; }
        .badge.offline { background: #f7f8fc; color: #a0aec0; }

        .action-btn { width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.2s; margin-right: 4px; }
        .edit-btn { background: #ebf8ff; color: #3182ce; }
        .edit-btn:hover { background: #3182ce; color: #fff; }
        .del-btn { background: #fff5f5; color: #e53e3e; }
        .del-btn:hover { background: #e53e3e; color: #fff; }

        /* ── PAGINATION ── */
        .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #f0f4f8; flex-wrap: wrap; gap: 10px; }
        .pagination-info { font-size: 12px; color: #718096; }
        .page-btns { display: flex; gap: 5px; flex-wrap: wrap; }
        .page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #4a5568; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
        .page-btn:hover { border-color: #89253E; color: #89253E; }
        .page-btn.active { background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; border-color: transparent; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── BULK BAR ── */
        .bulk-bar { background: linear-gradient(135deg, #89253E, #3A6186); padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .bulk-bar span { font-size: 13px; font-weight: 600; color: #fff; }
        .bulk-del-btn { display: flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 8px; border: none; background: rgba(255,255,255,0.2); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; transition: background 0.2s; }
        .bulk-del-btn:hover { background: rgba(255,255,255,0.35); }

        /* ── MSG CELLS ── */
        .msg-preview { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .msg-from { display: flex; align-items: center; gap: 8px; }
        .msg-from img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }

        /* ── TOAST ── */
        .admin-toast { position: fixed; bottom: 20px; right: 20px; z-index: 9999; padding: 12px 18px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 10px; animation: toastIn 0.3s ease forwards; box-shadow: 0 8px 24px rgba(0,0,0,0.2); max-width: calc(100vw - 40px); }
        .admin-toast.success { background: linear-gradient(135deg, #38a169, #276749); }
        .admin-toast.error { background: linear-gradient(135deg, #e53e3e, #c53030); }

        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ── RESPONSIVE BREAKPOINTS ── */

        /* Large tablet / small laptop */
        @media (max-width: 1100px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-row { grid-template-columns: 1fr; }
          .admin-sidebar { width: 200px; min-width: 200px; }
        }

        /* Tablet */
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .admin-sidebar { width: 180px; min-width: 180px; }
          .admin-nav-item { font-size: 13px; padding: 10px 12px; }
        }

        /* Mobile — sidebar becomes drawer */
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0;
            width: 260px; min-width: 260px;
            transform: translateX(-100%);
            z-index: 200;
          }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-sidebar-overlay { display: block; }
          .admin-menu-btn { display: flex; }
          .admin-content { padding: 14px; }
          .admin-topbar { padding: 12px 14px; }
          .admin-refresh-btn span { display: none; }
          .admin-refresh-btn { padding: 8px 10px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .stat-card { padding: 16px; }
          .stat-card-value { font-size: 24px; }
          .charts-row { grid-template-columns: 1fr; gap: 12px; }
          .admin-search-input { width: 160px; }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-card { padding: 14px; }
          .stat-card-value { font-size: 22px; }
          .stat-card-label { font-size: 10px; }
          .admin-table-header { flex-direction: column; align-items: flex-start; }
          .admin-search-input { width: 100%; }
          .pagination { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="admin-page">
        {/* ── Sidebar ── */}
        <div className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
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
              <div key={item.id} className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => handleTabChange(item.id)}>
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

        {/* ── Main ── */}
        <div className="admin-main">
          <div className="admin-topbar">
            <div className="admin-topbar-left">
              {/* Hamburger — visible on mobile only */}
              <button className="admin-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <i className="fa-solid fa-bars"></i>
              </button>
              <div>
                <div className="admin-topbar-title">
                  {activeTab === "dashboard" && "Dashboard"}
                  {activeTab === "users"     && "User Management"}
                  {activeTab === "messages"  && "Messages"}
                </div>
                <div className="admin-topbar-sub">
                  {activeTab === "dashboard" && "Stats & activity"}
                  {activeTab === "users"     && `${userTotal} users`}
                  {activeTab === "messages"  && `${msgTotal} messages`}
                </div>
              </div>
            </div>
            <button className="admin-refresh-btn" onClick={() => {
              if (activeTab === "dashboard") fetchStats();
              if (activeTab === "users")     fetchUsers();
              if (activeTab === "messages")  fetchMessages();
            }}>
              <i className="fa-solid fa-rotate-right"></i>
              <span>Refresh</span>
            </button>
          </div>

          <div className="admin-content">

            {/* ── DASHBOARD TAB ── */}
            {activeTab === "dashboard" && stats && (
              <>
                <div className="stats-grid">
                  {[
                    { label: "Total Users",    value: stats.totalUsers,    sub: `+${stats.newUsersToday} today`,    icon: "fa-solid fa-users",     color: "#89253E", bg: "linear-gradient(135deg, #89253E, #b03060)" },
                    { label: "Active Now",     value: stats.activeUsers,   sub: "currently online",                icon: "fa-solid fa-circle",    color: "#48bb78", bg: "linear-gradient(135deg, #38a169, #48bb78)" },
                    { label: "Total Messages", value: stats.totalMessages, sub: `+${stats.newMessagesToday} today`, icon: "fa-solid fa-comments",  color: "#3A6186", bg: "linear-gradient(135deg, #3A6186, #5a8fc4)" },
                    { label: "New Today",      value: stats.newUsersToday, sub: "new registrations",               icon: "fa-solid fa-user-plus", color: "#ed8936", bg: "linear-gradient(135deg, #ed8936, #f6ad55)" },
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
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>Metric</th><th>Value</th><th>Details</th></tr></thead>
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
                    <div className="table-scroll">
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
                                    <div className="user-cell-email">{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: 12 }}>{u.email}</td>
                              <td><span className={`badge ${u.status === "Active now" ? "online" : "offline"}`}>{u.status === "Active now" ? "Online" : "Offline"}</span></td>
                              <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                              <td>
                                <button className="action-btn edit-btn" onClick={() => setEditingUser(u)} title="Edit"><i className="fa-solid fa-pen"></i></button>
                                <button className="action-btn del-btn" onClick={() => setConfirmDeleteUser(u)} title="Delete"><i className="fa-solid fa-trash"></i></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                    <input className="admin-search-input" placeholder="Search content..." value={msgSearch} onChange={e => { setMsgSearch(e.target.value); setMsgPage(1); }} />
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
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}>
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
                                  <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{m.senderId?.firstName} {m.senderId?.lastName}</span>
                                </div>
                              </td>
                              <td>
                                <div className="msg-from">
                                  <img src={m.receiverId?.avatar || `https://ui-avatars.com/api/?name=${m.receiverId?.firstName}&background=3A6186&color=fff`} alt="" />
                                  <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{m.receiverId?.firstName} {m.receiverId?.lastName}</span>
                                </div>
                              </td>
                              <td><div className="msg-preview">{m.message}</div></td>
                              <td><span className={`badge ${m.status === "seen" ? "online" : "offline"}`}>{m.status === "seen" ? "Seen" : "Delivered"}</span></td>
                              <td style={{ fontSize: 11, color: "#a0aec0", whiteSpace: "nowrap" }}>{new Date(m.createdAt).toLocaleString()}</td>
                              <td>
                                <button className="action-btn del-btn" onClick={() => setConfirmDeleteMsg(m)} title="Delete"><i className="fa-solid fa-trash"></i></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
      {editingUser && <EditUserModal user={editingUser} onSave={() => { setEditingUser(null); showToast("User updated successfully"); fetchUsers(); }} onClose={() => setEditingUser(null)} />}
      {confirmDeleteUser && <ConfirmModal title="Delete User" message={`Delete "${confirmDeleteUser.firstName} ${confirmDeleteUser.lastName}"? This also deletes ALL their messages. Cannot be undone.`} onConfirm={handleDeleteUser} onCancel={() => setConfirmDeleteUser(null)} danger />}
      {confirmDeleteMsg && <ConfirmModal title="Delete Message" message={`Delete: "${confirmDeleteMsg.message.substring(0, 60)}..."? Cannot be undone.`} onConfirm={handleDeleteMsg} onCancel={() => setConfirmDeleteMsg(null)} danger />}
      {confirmBulkDelete && <ConfirmModal title="Bulk Delete" message={`Permanently delete ${selectedMsgs.length} messages? Cannot be undone.`} onConfirm={handleBulkDelete} onCancel={() => setConfirmBulkDelete(false)} danger />}

      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <i className={`fa-solid ${toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}`}></i>
          {toast.msg}
        </div>
      )}
    </>
  );
};

const mS = {
  overlay: { position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 24px 80px rgba(0,0,0,0.25)", overflow: "hidden" },
  modalHeader: { padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f0f4f8" },
  closeX: { marginLeft: "auto", width: 30, height: 30, borderRadius: "50%", border: "none", background: "#f0f4f8", color: "#718096", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  formRow: { display: "flex", gap: 12 },
  formField: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  formLabel: { fontSize: 12, fontWeight: 600, color: "#4a5568" },
  formInput: { height: 42, padding: "0 12px", borderRadius: 10, border: "2px solid #e2e8f0", fontSize: 14, outline: "none", fontFamily: "'Poppins', sans-serif", color: "#2d3748", background: "#f8fafc", width: "100%" },
  errBox: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, border: "2px solid #e2e8f0", background: "#fff", color: "#718096", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  saveBtn: { flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #89253E, #3A6186)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  dangerBtn: { flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e53e3e, #c53030)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  confirmBtn: { flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #38a169, #276749)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
};

export default AdminDashboard;