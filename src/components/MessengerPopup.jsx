import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import api from "../services/api";
import Chat from "../pages/Chat";
import {
  X, Search, MessageSquare, ChevronLeft, Minus
} from "lucide-react";



const getInitials = (u) => {
  if (!u) return "?";
  return ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase() || "?";
};

const Avatar = ({ user, size = 36, showOnline = false, isOnline = false }) => {
  const src = user?.avatar || user?.profileImage;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #89253E, #3A6186)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 700, color: "#fff",
        overflow: "hidden", flexShrink: 0,
      }}>
        {src
          ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
          : getInitials(user)
        }
      </div>
      {showOnline && (
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          background: isOnline ? "#22c55e" : "#d1d5db",
          border: "2px solid #fff",
        }} />
      )}
    </div>
  );
};

const MessengerPopup = ({ onClose }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const searchRef = useRef();

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!socket) return;
    socket.on("online_users", (ids) => setOnlineUsers(ids));
    socket.on("receive_message", fetchUsers);
    return () => { socket.off("online_users"); socket.off("receive_message"); };
  }, [socket, fetchUsers]);

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const popupW = selectedUser ? 680 : 320;
  const popupH = minimized ? 52 : 520;

  return (
    <>
      <style>{`
        .mp-popup { font-family: 'Poppins', sans-serif; }
        .mp-user-row:hover { background: rgba(137,37,62,0.06) !important; }
        .mp-user-row.active-row { background: rgba(137,37,62,0.09) !important; }
        .mp-close-btn:hover { background: rgba(255,255,255,0.25) !important; }
        .mp-min-btn:hover { background: rgba(255,255,255,0.25) !important; }
        /* Mobile: fullscreen popup */
        @media (max-width: 640px) {
          .mp-outer {
            width: 100vw !important;
            height: 100vh !important;
            bottom: 0 !important;
            right: 0 !important;
            border-radius: 0 !important;
            max-width: 100vw !important;
          }
          .mp-user-list-panel {
            width: 100% !important;
            min-width: 100% !important;
          }
          .mp-user-list-panel.has-chat {
            display: none !important;
          }
          .mp-chat-panel {
            position: absolute !important;
            inset: 52px 0 0 0 !important;
            width: 100% !important;
          }
        }
        /* Tablet: wider popup */
        @media (min-width: 641px) and (max-width: 960px) {
          .mp-outer {
            width: min(680px, calc(100vw - 24px)) !important;
            right: 12px !important;
          }
        }
      `}</style>

      {/* Backdrop on mobile */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(0,0,0,0.3)",
          display: "none",
        }}
        className="mp-backdrop"
      />

      <div
        className="mp-popup mp-outer"
        style={{
          position: "fixed",
          bottom: 20, right: 20,
          width: popupW,
          height: popupH,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(137,37,62,0.12)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.25s ease, height 0.25s ease",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 50%, #3A6186 100%)",
          padding: "0 14px",
          height: 52, minHeight: 52,
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          {selectedUser && !minimized && (
            <button
              onClick={() => setSelectedUser(null)}
              className="mp-min-btn"
              style={{
                background: "rgba(255,255,255,0.15)", border: "none",
                borderRadius: 8, color: "#fff", cursor: "pointer",
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {selectedUser
              ? <Avatar user={selectedUser} size={30} showOnline isOnline={onlineUsers.includes(selectedUser._id)} />
              : <MessageSquare size={18} color="#fff" />
            }
            <span style={{
              color: "#fff", fontWeight: 700, fontSize: 14,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "Messages"}
            </span>
            {selectedUser && onlineUsers.includes(selectedUser._id) && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginLeft: 2 }}>· Active now</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => setMinimized(v => !v)}
              className="mp-min-btn"
              style={{
                background: "rgba(255,255,255,0.15)", border: "none",
                borderRadius: 8, color: "#fff", cursor: "pointer",
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              title={minimized ? "Expand" : "Minimize"}
            >
              <Minus size={14} />
            </button>
            <button
              onClick={onClose}
              className="mp-close-btn"
              style={{
                background: "rgba(255,255,255,0.15)", border: "none",
                borderRadius: 8, color: "#fff", cursor: "pointer",
                width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {!minimized && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* User list panel */}
            <div className={`mp-user-list-panel${selectedUser ? " has-chat" : ""}`} style={{
              width: selectedUser ? 320 : "100%", minWidth: selectedUser ? 320 : "100%", flexShrink: 0,
              display: "flex", flexDirection: "column",
              borderRight: selectedUser ? "1px solid #f3f4f6" : "none",
              overflow: "hidden",
            }}>
              {/* Search */}
              <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} color="#9ca3af" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search people…"
                    style={{
                      width: "100%", height: 36, paddingLeft: 32, paddingRight: 12,
                      border: "1.5px solid #f3f4f6", borderRadius: 22,
                      fontSize: 13, outline: "none", fontFamily: "Poppins, sans-serif",
                      background: "#f9fafb", color: "#111827",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#89253E"}
                    onBlur={e => e.target.style.borderColor = "#f3f4f6"}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
                      display: "flex", alignItems: "center",
                    }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Online users strip */}
              {!search && onlineUsers.filter(id => id !== (user?._id || user?.id)).length > 0 && (
                <div style={{ padding: "8px 12px 4px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
                    Online
                  </div>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                    {users.filter(u => onlineUsers.includes(u._id)).map(u => (
                      <button key={u._id} onClick={() => setSelectedUser(u)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0,
                      }}>
                        <Avatar user={u} size={38} showOnline isOnline />
                        <span style={{ fontSize: 10, color: "#374151", fontFamily: "Poppins, sans-serif", maxWidth: 44, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.firstName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All contacts label */}
              <div style={{ padding: "6px 14px 4px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                {search ? "Results" : "All Messages"}
              </div>

              {/* User list */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "30px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    No users found
                  </div>
                ) : filtered.map(u => {
                  const isOnline = onlineUsers.includes(u._id);
                  const isActive = selectedUser?._id === u._id;
                  return (
                    <div
                      key={u._id}
                      className={`mp-user-row${isActive ? " active-row" : ""}`}
                      onClick={() => setSelectedUser(u)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", cursor: "pointer",
                        background: isActive ? "rgba(137,37,62,0.09)" : "none",
                        borderLeft: isActive ? "3px solid #89253E" : "3px solid transparent",
                        transition: "background 0.15s",
                      }}
                    >
                      <Avatar user={u} size={42} showOnline isOnline={isOnline} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.firstName} {u.lastName}
                        </div>
                        {u.lastMessage && (
                          <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {u.lastMessage}
                          </div>
                        )}
                      </div>
                      {isOnline && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat panel */}
            {selectedUser && (
              <div className="mp-chat-panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
                <Chat
                  inlineUserId={selectedUser._id}
                  inlineChatUser={selectedUser}
                  onBack={() => setSelectedUser(null)}
                  popupMode={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MessengerPopup;