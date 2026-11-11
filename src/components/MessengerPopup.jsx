import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import api from "../services/api";
import Chat from "../pages/Chat";
import { X, Search, MessageSquare, Minus, Maximize2 } from "lucide-react";
import "../styles/messenger.css";

const BRAND_GRADIENT =
  "linear-gradient(135deg, #89253E 0%, #5a2d5a 50%, #3A6186 100%)";

const getInitials = (u) => {
  if (!u) return "?";
  return ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase() || "?";
};

const formatListTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  if (now - d < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const Avatar = ({ user, size = 40, showOnline = false, isOnline = false }) => {
  const src = user?.avatar || user?.profileImage;
  const [failedSrc, setFailedSrc] = useState(null);

  const dotSize = Math.max(9, Math.round(size * 0.26));

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: BRAND_GRADIENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.36,
          fontWeight: 700,
          color: "#fff",
          overflow: "hidden",
          flexShrink: 0,
          letterSpacing: "-0.3px",
        }}
      >
        {src && failedSrc !== src ? (
          <img
            src={src}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setFailedSrc(src)}
          />
        ) : (
          getInitials(user)
        )}
      </div>
      {showOnline && (
        <span
          className={`mp-presence${isOnline ? " online" : ""}`}
          style={{
            width: dotSize,
            height: dotSize,
            borderWidth: Math.max(2, Math.round(size * 0.055)),
          }}
        />
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
    } catch {
      setUsers([]);
    }
  }, []);

  const handleBackToInbox = useCallback(() => {
    setSelectedUser(null);
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/api/users")
      .then(({ data }) => {
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("online_users", (ids) => setOnlineUsers(Array.isArray(ids) ? ids : []));
    socket.on("receive_message", fetchUsers);
    return () => {
      socket.off("online_users");
      socket.off("receive_message");
    };
  }, [socket, fetchUsers]);

  const myId = user?._id || user?.id;
  const query = search.trim().toLowerCase();
  const filtered = query
    ? users.filter((u) =>
        `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(query)
      )
    : users;
  const onlineContacts = users.filter(
    (u) => u._id !== myId && onlineUsers.includes(u._id)
  );
  const selectedOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;
  const popupW = minimized ? 340 : selectedUser ? 780 : 340;
  const popupH = minimized ? 56 : 580;
  const title = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`
    : "Messages";

  return (
    <>
      <div
        className={`mp-popup mp-outer${minimized ? " mp-minimized" : ""}`}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: popupW,
          height: popupH,
          background: "#fff",
          borderRadius: 18,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.25s ease, height 0.25s ease",
        }}
        role="dialog"
        aria-label="Messages"
      >
        {minimized && (
          <div className="mp-min-bar">
            {selectedUser ? (
              <Avatar user={selectedUser} size={34} showOnline isOnline={selectedOnline} />
            ) : (
              <div className="mp-min-icon">
                <MessageSquare size={16} />
              </div>
            )}
            <span className="mp-min-title">{title}</span>
            {selectedOnline && <span className="mp-min-status" />}
            <div className="mp-head-actions">
              <button
                className="mp-head-btn"
                onClick={() => setMinimized(false)}
                title="Expand"
                aria-label="Expand messages"
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="mp-head-btn"
                onClick={onClose}
                title="Close"
                aria-label="Close messages"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className={`mp-shell${minimized ? " is-hidden" : ""}`}>
          <aside className={`mp-sidebar${selectedUser ? " has-chat" : ""}`}>
            <div className="mp-side-head">
              <div className="mp-side-title">
                <div className="mp-side-title-icon">
                  <MessageSquare size={16} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="mp-side-title-text">Messages</div>
                  <div className="mp-side-title-sub">
                    {onlineContacts.length > 0
                      ? `${onlineContacts.length} online now`
                      : "Trevio chat"}
                  </div>
                </div>
              </div>
              <div className="mp-head-actions">
                <button
                  className="mp-head-btn"
                  onClick={() => setMinimized(true)}
                  title="Minimize"
                  aria-label="Minimize messages"
                >
                  <Minus size={14} />
                </button>
                <button
                  className="mp-head-btn"
                  onClick={onClose}
                  title="Close"
                  aria-label="Close messages"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="mp-search-wrap">
              <div className="mp-search">
                <Search size={14} className="mp-search-icon" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="mp-search-input"
                  aria-label="Search conversations"
                />
                {search && (
                  <button
                    className="mp-search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {!search && onlineContacts.length > 0 && (
              <div className="mp-online-strip">
                <div className="mp-section-label">
                  <span>Online now</span>
                  <span className="mp-count-pill">{onlineContacts.length}</span>
                </div>
                <div className="mp-online-scroll">
                  {onlineContacts.map((u) => (
                    <button
                      key={u._id}
                      className="mp-online-person"
                      onClick={() => setSelectedUser(u)}
                      title={`Message ${u.firstName}`}
                    >
                      <Avatar user={u} size={44} showOnline isOnline />
                      <span className="mp-online-name">{u.firstName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mp-list-label">
              <span>{search ? "Results" : "All messages"}</span>
              <span>{filtered.length}</span>
            </div>

            <div className="mp-list">
              {filtered.length === 0 ? (
                <div className="mp-empty">
                  <div className="mp-empty-icon">
                    {search ? <Search size={20} /> : <MessageSquare size={20} />}
                  </div>
                  <div className="mp-empty-title">
                    {search ? "No conversations found" : "No messages yet"}
                  </div>
                  <div className="mp-empty-text">
                    {search
                      ? "Try a different name."
                      : "Start a conversation with someone from your feed."}
                  </div>
                </div>
              ) : (
                filtered.map((u) => {
                  const isOnline = onlineUsers.includes(u._id);
                  const isActive = selectedUser?._id === u._id;
                  const hasConversation = Boolean(u.lastMessageTime);
                  const preview =
                    u.lastMessage && u.lastMessage !== "No message available"
                      ? u.lastMessage
                      : hasConversation
                        ? "Sent an attachment"
                        : "No messages yet";

                  return (
                    <div
                      key={u._id}
                      className={`mp-row${isActive ? " active" : ""}`}
                      onClick={() => setSelectedUser(u)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedUser(u);
                        }
                      }}
                    >
                      <Avatar user={u} size={44} showOnline isOnline={isOnline} />
                      <div className="mp-row-main">
                        <div className="mp-row-top">
                          <span className="mp-row-name">
                            {u.firstName} {u.lastName}
                          </span>
                          {u.lastMessageTime && (
                            <span className="mp-row-time">
                              {formatListTime(u.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <div
                          className={`mp-row-preview${
                            hasConversation ? "" : " empty"
                          }`}
                        >
                          {hasConversation && u.lastMessageIsYours && (
                            <span className="you">You: </span>
                          )}
                          {preview}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {selectedUser && (
            <section className="mp-chat-pane">
              <Chat
                inlineUserId={selectedUser._id}
                inlineChatUser={selectedUser}
                onBack={handleBackToInbox}
                popupMode
                onClose={onClose}
              />
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default MessengerPopup;
