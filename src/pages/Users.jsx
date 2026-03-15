import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import api from "../services/api";
import Chat from "./Chat";

const Users = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Profile modal state
  const [showProfile, setShowProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/users");
      // Sort by most recent message — users with latest message come first
      // The API returns lastMessage; we sort by who we've chatted with most recently
      setUsers(data);
    } catch (err) { console.error("Failed to fetch users", err); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!socket) return;
    socket.on("online_users", (ids) => { setOnlineUsers(ids); fetchUsers(); });

    // When a new message arrives, refresh the user list so the sender bubbles to top
    socket.on("receive_message", () => {
      fetchUsers();
    });

    // When we send a message, also refresh so recipient moves to top
    socket.on("message_sent", () => {
      fetchUsers();
    });

    return () => {
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("message_sent");
    };
  }, [socket, fetchUsers]);

  useEffect(() => {
    if (searchTerm.trim() === "") { fetchUsers(); setIsSearchActive(false); return; }
    setIsSearchActive(true);
    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/users/search?q=${searchTerm}`);
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) { console.error("Search failed", err); }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm, fetchUsers]);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const handleSelectUser = (u) => {
    setSelectedUserId(u._id);
    setSelectedUser(u);
    setShowSidebar(false);
    // Refresh users list when opening a chat (clears unread indicator)
    setTimeout(fetchUsers, 500);
  };

  const handleBackToList = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
    setShowSidebar(true);
    fetchUsers(); // refresh to update last message previews
  };

  const isOnline = (uid) => onlineUsers.includes(uid.toString());

  const handleOpenProfile = () => {
    setShowProfile(true);
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setProfileImage(null); setProfilePreview(null);
    setProfileError(""); setProfileSuccess("");
    setNameError(""); setNameSuccess("");
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setProfileImage(null); setProfilePreview(null);
    setProfileError(""); setProfileSuccess("");
    setNameError(""); setNameSuccess("");
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) { setProfileError("Please upload a jpeg, jpg, or png file."); return; }
    if (file.size > 5 * 1024 * 1024) { setProfileError("File size must be under 5MB."); return; }
    setProfileError(""); setProfileImage(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleProfileUpload = async () => {
    if (!profileImage) return;
    setProfileLoading(true); setProfileError(""); setProfileSuccess("");
    try {
      const formData = new FormData();
      formData.append("image", profileImage);
      const { data } = await api.put("/api/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      login({ ...user, avatar: data.avatar });
      setProfileSuccess("Profile photo updated!"); setProfileImage(null);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally { setProfileLoading(false); }
  };

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) { setNameError("First and last name are required."); return; }
    if (firstName.trim() === user?.firstName && lastName.trim() === user?.lastName) { setNameError("No changes detected."); return; }
    setNameLoading(true); setNameError(""); setNameSuccess("");
    try {
      const { data } = await api.put("/api/auth/name", { firstName: firstName.trim(), lastName: lastName.trim() });
      login({ ...user, firstName: data.firstName, lastName: data.lastName });
      setNameSuccess("Name updated successfully!");
    } catch (err) {
      setNameError(err.response?.data?.message || "Failed to update name.");
    } finally { setNameLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; font-family: 'Poppins', sans-serif; }

        .messenger-page { display: flex; height: 100vh; width: 100vw; background: #f0f4f8; overflow: hidden; font-family: 'Poppins', sans-serif; }

        .messenger-sidebar { width: 320px; min-width: 320px; background: #fff; border-right: 1px solid #e8edf2; display: flex; flex-direction: column; height: 100vh; overflow: hidden; box-shadow: 2px 0 12px rgba(0,0,0,0.04); flex-shrink: 0; }
        .sidebar-header { padding: 18px 16px 14px; border-bottom: 1px solid #f0f4f8; flex-shrink: 0; }
        .sidebar-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .sidebar-brand { display: flex; align-items: center; gap: 10px; }
        .sidebar-brand-icon { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #89253E, #3A6186); display: flex; align-items: center; justify-content: center; }
        .sidebar-brand-icon i { font-size: 18px; color: #fff; }
        .sidebar-brand-name { font-size: 18px; font-weight: 700; color: #1a202c; }
        .sidebar-logout-btn { width: 38px; height: 38px; border-radius: 10px; border: none; background: #fff5f5; color: #89253E; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s, transform 0.15s; flex-shrink: 0; }
        .sidebar-logout-btn:hover { background: #fed7d7; transform: scale(1.05); }

        .sidebar-current-user { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(137,37,62,0.06), rgba(58,97,134,0.06)); padding: 12px 14px; border-radius: 14px; margin-bottom: 14px; border: 1px solid rgba(137,37,62,0.1); cursor: pointer; transition: background 0.2s; position: relative; }
        .sidebar-current-user:hover { background: linear-gradient(135deg, rgba(137,37,62,0.1), rgba(58,97,134,0.1)); }
        .sidebar-current-user:hover .sidebar-me-edit-hint { opacity: 1; }
        .sidebar-me-edit-hint { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 11px; color: #89253E; font-weight: 600; opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; gap: 4px; }
        .sidebar-me-edit-hint i { font-size: 10px; }
        .sidebar-me-avatar-wrap { position: relative; flex-shrink: 0; }
        .sidebar-me-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #89253E; }
        .sidebar-me-online-dot { position: absolute; bottom: 1px; right: 1px; width: 12px; height: 12px; border-radius: 50%; background: #48bb78; border: 2px solid #fff; }
        .sidebar-me-name { font-size: 14px; font-weight: 600; color: #2d3748; }
        .sidebar-me-status { font-size: 12px; color: #718096; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .sidebar-me-status i { font-size: 8px; color: #48bb78; }

        .sidebar-search-wrap { position: relative; display: flex; align-items: center; }
        .sidebar-search-icon { position: absolute; left: 12px; color: #a0aec0; font-size: 13px; z-index: 1; }
        .sidebar-search-input { width: 100%; height: 40px; padding: 0 36px 0 36px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; outline: none; background: #f8fafc; color: #2d3748; font-family: 'Poppins', sans-serif; transition: border-color 0.2s; }
        .sidebar-search-input:focus { border-color: #89253E; }
        .sidebar-search-clear { position: absolute; right: 12px; color: #a0aec0; font-size: 12px; cursor: pointer; }

        .sidebar-users-list { flex: 1; overflow-y: auto; padding: 6px 8px; }
        .sidebar-list-label { font-size: 11px; font-weight: 600; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.8px; padding: 10px 10px 6px; display: flex; align-items: center; gap: 6px; }
        .sidebar-empty { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
        .sidebar-empty i { font-size: 32px; color: #e2e8f0; margin-bottom: 12px; }
        .sidebar-empty p { font-size: 14px; color: #a0aec0; text-align: center; }

        .sidebar-user-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px; border-left: 3px solid transparent; }
        .sidebar-user-item:hover { background: #f7fafc; }
        .sidebar-user-item.active { background: linear-gradient(135deg, rgba(137,37,62,0.07), rgba(58,97,134,0.07)); border-left-color: #89253E; }
        .sidebar-user-avatar-wrap { position: relative; flex-shrink: 0; }
        .sidebar-user-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .sidebar-user-status-dot { position: absolute; bottom: 1px; right: 1px; width: 13px; height: 13px; border-radius: 50%; border: 2px solid #fff; }
        .sidebar-user-info { flex: 1; min-width: 0; }
        .sidebar-user-info-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
        .sidebar-user-name { font-size: 14px; font-weight: 600; color: #2d3748; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-online-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; margin-left: 6px; }
        .sidebar-online-badge.online { background: #f0fff4; color: #276749; }
        .sidebar-online-badge.offline { background: #f7fafc; color: #a0aec0; }
        .sidebar-last-msg { font-size: 12px; color: #a0aec0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
        .sidebar-last-msg i { font-size: 10px; color: #89253E; flex-shrink: 0; }

        .sidebar-users-list::-webkit-scrollbar { width: 4px; }
        .sidebar-users-list::-webkit-scrollbar-track { background: transparent; }
        .sidebar-users-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .messenger-chat-area { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; min-width: 0; }
        .chat-empty-state { flex: 1; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
        .chat-empty-inner { text-align: center; padding: 20px; }
        .chat-empty-icon-wrap { width: 96px; height: 96px; border-radius: 50%; background: linear-gradient(135deg, rgba(137,37,62,0.08), rgba(58,97,134,0.08)); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .chat-empty-icon-wrap i { font-size: 44px; background: linear-gradient(135deg, #89253E, #3A6186); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .chat-empty-title { font-size: 26px; font-weight: 700; color: #2d3748; margin-bottom: 10px; }
        .chat-empty-text { font-size: 15px; color: #718096; margin-bottom: 32px; }
        .chat-empty-hints { display: flex; flex-direction: column; gap: 10px; align-items: center; }
        .chat-empty-hint { display: flex; align-items: center; gap: 10px; background: #fff; padding: 11px 22px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .chat-empty-hint i { font-size: 14px; background: linear-gradient(135deg, #89253E, #3A6186); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .chat-empty-hint span { font-size: 13px; color: #4a5568; font-weight: 500; }

        /* ── PROFILE MODAL ── */
        .profile-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: profileFadeIn 0.2s ease forwards; }
        .profile-modal { background: #fff; border-radius: 24px; width: 100%; max-width: 460px; box-shadow: 0 24px 80px rgba(0,0,0,0.25); animation: profileSlideUp 0.3s ease forwards; overflow: hidden; max-height: 90vh; overflow-y: auto; }
        .profile-modal::-webkit-scrollbar { width: 4px; }
        .profile-modal::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .profile-modal-header { background: linear-gradient(135deg, #89253E, #3A6186); padding: 28px 28px 64px; position: relative; text-align: center; }
        .profile-modal-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.2); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .profile-modal-close:hover { background: rgba(255,255,255,0.3); }
        .profile-modal-title { font-size: 20px; font-weight: 700; color: #fff; }
        .profile-modal-subtitle { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px; }
        .profile-avatar-section { display: flex; flex-direction: column; align-items: center; margin-top: -52px; padding: 0 28px 20px; position: relative; }
        .profile-avatar-wrap { position: relative; margin-bottom: 14px; }
        .profile-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .profile-avatar-edit-btn { position: absolute; bottom: 2px; right: 2px; width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #89253E, #3A6186); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
        .profile-avatar-edit-btn:hover { transform: scale(1.1); }
        .profile-avatar-edit-btn i { font-size: 12px; color: #fff; }
        .profile-avatar-edit-input { display: none; }
        .profile-user-name { font-size: 18px; font-weight: 700; color: #1a202c; }
        .profile-user-email { font-size: 13px; color: #718096; margin-top: 3px; }
        .profile-section { padding: 0 28px 20px; }
        .profile-section-label { font-size: 11px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; padding-bottom: 8px; border-bottom: 1px solid #f0f4f8; }
        .profile-section-label i { color: #89253E; font-size: 12px; }
        .profile-name-row { display: flex; gap: 12px; }
        .profile-field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .profile-field-label { font-size: 12px; font-weight: 600; color: #4a5568; display: flex; align-items: center; gap: 6px; }
        .profile-field-label i { color: #89253E; font-size: 11px; }
        .profile-input { height: 44px; width: 100%; font-size: 14px; padding: 0 14px; border-radius: 10px; border: 2px solid #e2e8f0; outline: none; background: #f8fafc; color: #2d3748; font-family: 'Poppins', sans-serif; transition: border-color 0.2s, background 0.2s; }
        .profile-input:focus { border-color: #89253E; background: #fff; }
        .profile-save-name-btn { width: 100%; height: 44px; border-radius: 10px; border: none; background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; font-size: 14px; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; transition: opacity 0.2s, transform 0.15s; box-shadow: 0 3px 12px rgba(137,37,62,0.25); }
        .profile-save-name-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .profile-save-name-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .profile-preview-box { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 18px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .profile-preview-box:hover { border-color: #89253E; background: rgba(137,37,62,0.02); }
        .profile-preview-box label { cursor: pointer; display: block; }
        .profile-preview-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid #89253E; margin: 0 auto 10px; display: block; }
        .profile-preview-placeholder { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .profile-preview-placeholder i { font-size: 26px; color: #cbd5e0; }
        .profile-preview-placeholder span { font-size: 13px; color: #a0aec0; }
        .profile-preview-placeholder small { font-size: 11px; color: #cbd5e0; }
        .profile-upload-btn { width: 100%; height: 44px; border-radius: 10px; border: none; background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; font-size: 14px; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; transition: opacity 0.2s, transform 0.15s; box-shadow: 0 3px 12px rgba(137,37,62,0.25); }
        .profile-upload-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .profile-upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .profile-msg { margin: 0 28px 14px; padding: 10px 14px; border-radius: 10px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .profile-msg.error { background: #fff5f5; border: 1px solid #fed7d7; color: #c53030; }
        .profile-msg.success { background: #f0fff4; border: 1px solid #9ae6b4; color: #276749; }
        .profile-close-row { padding: 0 28px 28px; }
        .profile-close-btn { width: 100%; height: 44px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #718096; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; transition: border-color 0.2s, color 0.2s; }
        .profile-close-btn:hover { border-color: #89253E; color: #89253E; }

        @keyframes profileFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes profileSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        @media (max-width: 768px) {
          .messenger-sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; width: 100vw; min-width: unset; transform: translateX(0); transition: transform 0.3s ease; }
          .messenger-sidebar.hidden { transform: translateX(-100%); }
          .messenger-chat-area { position: fixed; inset: 0; z-index: 99; }
          .profile-name-row { flex-direction: column; gap: 12px; }
        }
        @media (min-width: 769px) and (max-width: 1100px) { .messenger-sidebar { width: 280px; min-width: 280px; } }
        @media (min-width: 1101px) { .messenger-sidebar { width: 340px; min-width: 340px; } }
      `}</style>

      <div className="messenger-page">
        <div className={`messenger-sidebar ${!showSidebar ? 'hidden' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-top-row">
              <div className="sidebar-brand">
                <div className="sidebar-brand-icon"><i className="fa-solid fa-comments"></i></div>
                <span className="sidebar-brand-name">Trevio</span>
              </div>
              <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
            <div className="sidebar-current-user" onClick={handleOpenProfile} title="Edit profile">
              <div className="sidebar-me-avatar-wrap">
                <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=89253E&color=fff`} alt={user?.firstName} className="sidebar-me-avatar" />
                <div className="sidebar-me-online-dot" />
              </div>
              <div>
                <div className="sidebar-me-name">{user?.firstName} {user?.lastName}</div>
                <div className="sidebar-me-status"><i className="fa-solid fa-circle"></i> Active now</div>
              </div>
              <div className="sidebar-me-edit-hint"><i className="fa-solid fa-pen"></i> Edit</div>
            </div>
            <div className="sidebar-search-wrap">
              <i className="fa-solid fa-magnifying-glass sidebar-search-icon"></i>
              <input type="text" placeholder="Search people..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="sidebar-search-input" />
              {searchTerm && <i className="fa-solid fa-xmark sidebar-search-clear" onClick={() => setSearchTerm("")} />}
            </div>
          </div>

          <div className="sidebar-users-list">
            <p className="sidebar-list-label">
              <i className="fa-solid fa-users"></i>
              {isSearchActive ? 'Search Results' : 'All Conversations'}
            </p>
            {users.length === 0 ? (
              <div className="sidebar-empty">
                <i className="fa-solid fa-user-slash"></i>
                <p>{isSearchActive ? "No users found" : "No users available"}</p>
              </div>
            ) : (
              users.map((u) => (
                <div key={u._id} className={`sidebar-user-item ${selectedUserId === u._id ? 'active' : ''}`} onClick={() => handleSelectUser(u)}>
                  <div className="sidebar-user-avatar-wrap">
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.firstName}+${u.lastName}&background=3A6186&color=fff`} alt={u.firstName} className="sidebar-user-avatar" />
                    <div className="sidebar-user-status-dot" style={{ background: isOnline(u._id) ? '#48bb78' : '#cbd5e0' }} />
                  </div>
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-info-top">
                      <span className="sidebar-user-name">{u.firstName} {u.lastName}</span>
                      <span className={`sidebar-online-badge ${isOnline(u._id) ? 'online' : 'offline'}`}>
                        {isOnline(u._id) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="sidebar-last-msg">
                      {u.lastMessageIsYours && <i className="fa-solid fa-reply"></i>}
                      {u.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="messenger-chat-area">
          {selectedUserId ? (
            <Chat inlineUserId={selectedUserId} inlineChatUser={selectedUser} onBack={handleBackToList} />
          ) : (
            <div className="chat-empty-state">
              <div className="chat-empty-inner">
                <div className="chat-empty-icon-wrap"><i className="fa-solid fa-comments"></i></div>
                <h2 className="chat-empty-title">Your Messages</h2>
                <p className="chat-empty-text">Select a conversation to start chatting</p>
                <div className="chat-empty-hints">
                  {[
                    { icon: 'fa-solid fa-arrow-pointer', text: 'Click any user to open chat' },
                    { icon: 'fa-solid fa-paper-plane',   text: 'Send messages instantly' },
                    { icon: 'fa-solid fa-bolt',          text: 'Real-time delivery' },
                  ].map((h, i) => (
                    <div key={i} className="chat-empty-hint">
                      <i className={h.icon}></i><span>{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {showProfile && (
          <div className="profile-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseProfile()}>
            <div className="profile-modal">
              <div className="profile-modal-header">
                <button className="profile-modal-close" onClick={handleCloseProfile}><i className="fa-solid fa-xmark"></i></button>
                <div className="profile-modal-title">Profile Settings</div>
                <div className="profile-modal-subtitle">Update your name and photo</div>
              </div>
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrap">
                  <img src={profilePreview || user?.avatar || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=89253E&color=fff&size=200`} alt="avatar" className="profile-avatar" />
                  <label className="profile-avatar-edit-btn" htmlFor="profile-avatar-input" title="Change photo"><i className="fa-solid fa-camera"></i></label>
                  <input id="profile-avatar-input" type="file" accept="image/jpeg,image/jpg,image/png" className="profile-avatar-edit-input" onChange={handleProfileImageChange} />
                </div>
                <div className="profile-user-name">{user?.firstName} {user?.lastName}</div>
                <div className="profile-user-email">{user?.email}</div>
              </div>
              <div className="profile-section">
                <div className="profile-section-label"><i className="fa-solid fa-user-pen"></i> Edit Name</div>
                <div className="profile-name-row">
                  <div className="profile-field">
                    <label className="profile-field-label"><i className="fa-solid fa-user"></i> First Name</label>
                    <input type="text" value={firstName} onChange={e => { setFirstName(e.target.value); setNameError(""); setNameSuccess(""); }} placeholder="First name" className="profile-input" />
                  </div>
                  <div className="profile-field">
                    <label className="profile-field-label"><i className="fa-solid fa-user"></i> Last Name</label>
                    <input type="text" value={lastName} onChange={e => { setLastName(e.target.value); setNameError(""); setNameSuccess(""); }} placeholder="Last name" className="profile-input" />
                  </div>
                </div>
                <button className="profile-save-name-btn" onClick={handleSaveName} disabled={nameLoading || !firstName.trim() || !lastName.trim()}>
                  {nameLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> Save Name</>}
                </button>
              </div>
              {nameError && <div className="profile-msg error"><i className="fa-solid fa-circle-exclamation"></i>{nameError}</div>}
              {nameSuccess && <div className="profile-msg success"><i className="fa-solid fa-circle-check"></i>{nameSuccess}</div>}
              <div className="profile-section">
                <div className="profile-section-label"><i className="fa-solid fa-image"></i> Profile Photo</div>
                <div className="profile-preview-box">
                  <label htmlFor="profile-avatar-input">
                    {profilePreview ? (
                      <><img src={profilePreview} alt="preview" className="profile-preview-img" /><span style={{ fontSize: 13, color: '#89253E', fontWeight: 600 }}><i className="fa-solid fa-check" style={{ marginRight: 6 }}></i>Photo selected — click Save Photo to upload</span></>
                    ) : (
                      <div className="profile-preview-placeholder"><i className="fa-solid fa-cloud-arrow-up"></i><span>Click to choose a photo</span><small>JPEG, JPG, PNG — max 5MB</small></div>
                    )}
                  </label>
                </div>
                <button className="profile-upload-btn" onClick={handleProfileUpload} disabled={!profileImage || profileLoading}>
                  {profileLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> Uploading...</> : <><i className="fa-solid fa-cloud-arrow-up"></i> Save Photo</>}
                </button>
              </div>
              {profileError && <div className="profile-msg error"><i className="fa-solid fa-circle-exclamation"></i>{profileError}</div>}
              {profileSuccess && <div className="profile-msg success"><i className="fa-solid fa-circle-check"></i>{profileSuccess}</div>}
              <div className="profile-close-row">
                <button className="profile-close-btn" onClick={handleCloseProfile}><i className="fa-solid fa-xmark" style={{ marginRight: 8 }}></i>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Users;