import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Users from "./Users";

/* ─────────────────────────────────────────
   FEED PAGE  — Social dashboard for ChatMeHere
   ───────────────────────────────────────── */

// ── Helpers ──────────────────────────────
const getInitials = (u) => {
  if (!u) return "?";
  return ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase() || u.email?.[0]?.toUpperCase() || "?";
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

// ── Avatar Component ─────────────────────
const Avatar = ({ user, size = 40, className = "" }) => {
  const src = user?.profileImage;
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #89253E, #3A6186)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700, color: "#fff",
        flexShrink: 0, overflow: "hidden",
      }}
    >
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : getInitials(user)
      }
    </div>
  );
};

// ── Post Card ────────────────────────────
const PostCard = ({ post, currentUser, onLike, onComment, onShare, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const isLiked = post.likes?.includes(currentUser?._id || currentUser?.id);
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const isOwner = (post.author?._id || post.author?.id) === (currentUser?._id || currentUser?.id);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    await onComment(post._id, commentText);
    setCommentText("");
    setSubmitting(false);
    setShowComments(true);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 16, marginBottom: 16,
      boxShadow: "0 2px 12px rgba(137,37,62,0.07), 0 1px 3px rgba(0,0,0,0.06)",
      overflow: "hidden", transition: "box-shadow 0.2s",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar user={post.author} size={42} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>
            {post.author?.firstName} {post.author?.lastName}
          </div>
          <div style={{ fontSize: 12, color: "#999" }}>{timeAgo(post.createdAt)}</div>
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(post._id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#ccc", fontSize: 18, padding: "4px 8px", borderRadius: 8,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => e.target.style.color = "#89253E"}
            onMouseLeave={e => e.target.style.color = "#ccc"}
          >
            ×
          </button>
        )}
      </div>

      {/* Text */}
      {post.text && (
        <div style={{ padding: "0 16px 12px", fontSize: 14, lineHeight: 1.6, color: "#333" }}>
          {post.text}
        </div>
      )}

      {/* Media */}
      {post.mediaUrl && post.mediaType === "image" && (
        <div style={{ width: "100%", maxHeight: 400, overflow: "hidden", background: "#f5f5f5" }}>
          <img
            src={post.mediaUrl}
            alt=""
            style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 400 }}
            onError={e => { e.target.style.display = "none"; }}
          />
        </div>
      )}
      {post.mediaUrl && post.mediaType === "video" && !videoError && (
        <div style={{ background: "#000" }}>
          <video
            src={post.mediaUrl}
            controls
            style={{ width: "100%", display: "block", maxHeight: 400 }}
            onError={() => setVideoError(true)}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid #f0f0f0",
        display: "flex", gap: 4,
      }}>
        <ActionBtn
          icon={isLiked ? "❤️" : "🤍"}
          label={`${likeCount > 0 ? likeCount : ""} Like`}
          active={isLiked}
          onClick={() => onLike(post._id)}
          activeColor="#89253E"
        />
        <ActionBtn
          icon="💬"
          label={`${commentCount > 0 ? commentCount : ""} Comment`}
          onClick={() => setShowComments(v => !v)}
        />
        <ActionBtn
          icon="↗️"
          label="Share"
          onClick={() => onShare(post._id)}
        />
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "12px 16px" }}>
          {post.comments?.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Avatar user={c.author} size={30} />
              <div>
                <div style={{
                  background: "#f7f7f9", borderRadius: 12, padding: "6px 12px",
                  fontSize: 13,
                }}>
                  <span style={{ fontWeight: 600, color: "#1a1a2e", marginRight: 6 }}>
                    {c.author?.firstName} {c.author?.lastName}
                  </span>
                  {c.text}
                </div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 2, paddingLeft: 4 }}>
                  {timeAgo(c.createdAt)}
                </div>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Avatar user={currentUser} size={30} />
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              style={{
                flex: 1, border: "1px solid #e8e8e8", borderRadius: 20,
                padding: "6px 14px", fontSize: 13, outline: "none",
                fontFamily: "Poppins, sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#89253E"}
              onBlur={e => e.target.style.borderColor = "#e8e8e8"}
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              style={{
                background: "linear-gradient(135deg, #89253E, #3A6186)",
                border: "none", borderRadius: 20, color: "#fff",
                padding: "6px 16px", fontSize: 13, cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                opacity: submitting || !commentText.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? "…" : "Post"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const ActionBtn = ({ icon, label, active, onClick, activeColor = "#3A6186" }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, background: "none", border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "8px 4px", borderRadius: 8,
      fontSize: 13, fontFamily: "Poppins, sans-serif",
      fontWeight: active ? 600 : 400,
      color: active ? activeColor : "#666",
      transition: "background 0.15s, color 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#f7f0f2"}
    onMouseLeave={e => e.currentTarget.style.background = "none"}
  >
    <span style={{ fontSize: 16 }}>{icon}</span>
    <span>{label}</span>
  </button>
);

// ── Create Post Box ───────────────────────
const CreatePost = ({ user, onPost }) => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const isVid = f.type.startsWith("video/");
    setMediaType(isVid ? "video" : "image");
    setMedia(f);
    const url = URL.createObjectURL(f);
    setMediaPreview(url);
  };

  const clearMedia = () => {
    setMedia(null); setMediaType(null); setMediaPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!text.trim() && !media) return;
    setLoading(true);
    const formData = new FormData();
    if (text.trim()) formData.append("text", text.trim());
    if (media) { formData.append("media", media); formData.append("mediaType", mediaType); }
    await onPost(formData);
    setText(""); clearMedia();
    setLoading(false);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
      boxShadow: "0 2px 12px rgba(137,37,62,0.07)",
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar user={user} size={42} />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`What's on your mind, ${user?.firstName || "there"}?`}
          rows={text.length > 60 ? 3 : 1}
          style={{
            flex: 1, border: "1.5px solid #eee", borderRadius: 22,
            padding: "10px 16px", fontSize: 14, fontFamily: "Poppins, sans-serif",
            resize: "none", outline: "none", lineHeight: 1.5,
            transition: "border-color 0.2s, height 0.2s",
            background: "#f9f9fb",
          }}
          onFocus={e => e.target.style.borderColor = "#89253E"}
          onBlur={e => e.target.style.borderColor = "#eee"}
        />
      </div>

      {mediaPreview && (
        <div style={{ marginTop: 12, position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          {mediaType === "image"
            ? <img src={mediaPreview} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
            : <video src={mediaPreview} style={{ width: "100%", maxHeight: 200, display: "block" }} />
          }
          <button
            onClick={clearMedia}
            style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.6)", border: "none", color: "#fff",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
        <MediaBtn icon="🖼️" label="Photo" onClick={() => { fileRef.current.accept = "image/*"; fileRef.current.click(); }} />
        <MediaBtn icon="🎬" label="Video" onClick={() => { fileRef.current.accept = "video/*"; fileRef.current.click(); }} />
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !media)}
          style={{
            background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 50%, #3A6186 100%)",
            border: "none", borderRadius: 22, color: "#fff",
            padding: "9px 24px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "Poppins, sans-serif",
            opacity: loading || (!text.trim() && !media) ? 0.5 : 1,
            transition: "opacity 0.2s, transform 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
};

const MediaBtn = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 5,
      background: "none", border: "none", cursor: "pointer",
      padding: "6px 12px", borderRadius: 8, fontSize: 13,
      color: "#666", fontFamily: "Poppins, sans-serif",
      transition: "background 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#f7f0f2"}
    onMouseLeave={e => e.currentTarget.style.background = "none"}
  >
    <span>{icon}</span><span>{label}</span>
  </button>
);

// ── Sidebar: People You May Know ─────────
const PeopleSidebar = ({ users, currentUser, onMessage }) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: 16,
    boxShadow: "0 2px 12px rgba(137,37,62,0.07)",
  }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#89253E", marginBottom: 14, letterSpacing: 0.5 }}>
      PEOPLE ON CHATMEHERE
    </div>
    {users.slice(0, 8).map(u => (
      <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar user={u} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {u.firstName} {u.lastName}
          </div>
        </div>
        <button
          onClick={() => onMessage(u)}
          style={{
            background: "linear-gradient(135deg, #89253E, #3A6186)",
            border: "none", borderRadius: 8, color: "#fff",
            padding: "4px 10px", fontSize: 11, cursor: "pointer",
            fontFamily: "Poppins, sans-serif", fontWeight: 600,
          }}
        >
          Chat
        </button>
      </div>
    ))}
  </div>
);

// ── Main Feed Component ───────────────────
const Feed = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [notifCount] = useState(0);
  const menuRef = useRef();

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowProfileMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get("/api/posts");
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchPosts error:", err?.response?.data || err.message);
      setPosts([]);
    } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
  }, []);

  useEffect(() => { fetchPosts(); fetchUsers(); }, [fetchPosts, fetchUsers]);

  const handlePost = async (formData) => {
    try {
      const { data } = await api.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPosts(prev => [data, ...prev]);
      setTimeout(fetchPosts, 500);
    } catch (err) {
      console.error("Failed to create post:", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Failed to create post. Check the browser console for details.");
    }
  };

  const handleLike = async (postId) => {
    try {
      const { data } = await api.post(`/api/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: data.likes } : p));
    } catch { /* optimistic */ }
  };

  const handleComment = async (postId, text) => {
    try {
      const { data } = await api.post(`/api/posts/${postId}/comment`, { text });
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: data.comments } : p));
    } catch { fetchPosts(); }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(postId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch { /* ignore */ }
  };

  const handleLogout = async () => { await logout(); navigate("/login"); };

  // If showing messages overlay
  if (showMessages) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Slim top bar when in messages */}
        <div style={{
          background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%)",
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 2px 12px rgba(137,37,62,0.3)",
        }}>
          <button
            onClick={() => setShowMessages(false)}
            style={{
              background: "rgba(255,255,255,0.18)", border: "none", color: "#fff",
              borderRadius: 10, padding: "6px 14px", cursor: "pointer",
              fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ← Feed
          </button>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "Poppins, sans-serif" }}>
            💬 Messages
          </span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Users embeddedMode={true} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f2f4f7", fontFamily: "Poppins, sans-serif" }}>

      {/* ── Top Navigation ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%)",
        boxShadow: "0 2px 16px rgba(137,37,62,0.35)",
        padding: "0 16px",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center", height: 56, gap: 12,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
            <div style={{
              width: 34, height: 34, background: "rgba(255,255,255,0.2)",
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>💬</div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}>
              ChatMe<span style={{ opacity: 0.75 }}>Here</span>
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Messages Button */}
          <button
            onClick={() => setShowMessages(true)}
            style={{
              position: "relative",
              background: "rgba(255,255,255,0.18)", border: "none",
              borderRadius: 12, color: "#fff", cursor: "pointer",
              padding: "8px 16px", display: "flex", alignItems: "center", gap: 7,
              fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600,
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.28)"; e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            <span style={{ fontSize: 17 }}>💬</span>
            <span style={{ display: "none" }} className="msg-label">Messages</span>
            {notifCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "#ff4757", color: "#fff", borderRadius: "50%",
                width: 18, height: 18, fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{notifCount}</span>
            )}
          </button>

          {/* Profile Menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfileMenu(v => !v)}
              style={{
                background: "none", border: "2px solid rgba(255,255,255,0.5)",
                borderRadius: "50%", padding: 2, cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.9)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}
            >
              <Avatar user={user} size={32} />
            </button>

            {showProfileMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", borderRadius: 14, minWidth: 200,
                boxShadow: "0 8px 30px rgba(0,0,0,0.15)", overflow: "hidden",
                animation: "fadeSlide 0.15s ease",
              }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", background: "none", border: "none",
                    padding: "12px 16px", textAlign: "left", cursor: "pointer",
                    fontSize: 13, color: "#89253E", fontFamily: "Poppins, sans-serif",
                    fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fff5f7"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Copy notification */}
      {copiedId && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a2e", color: "#fff", padding: "10px 20px", borderRadius: 22,
          fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          ✓ Link copied to clipboard
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "20px 16px",
        display: "grid", gridTemplateColumns: "1fr minmax(0,580px) 260px", gap: 20,
      }}>

        {/* Left: User info card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "#fff", borderRadius: 16,
            boxShadow: "0 2px 12px rgba(137,37,62,0.07)", overflow: "hidden",
          }}>
            <div style={{
              height: 70,
              background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 50%, #3A6186 100%)",
            }} />
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ marginTop: -22, marginBottom: 10 }}>
                <Avatar user={user} size={52} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{user?.email}</div>
              <div style={{
                marginTop: 12, padding: "8px 12px", borderRadius: 10,
                background: "linear-gradient(135deg, rgba(137,37,62,0.07), rgba(58,97,134,0.07))",
                fontSize: 12, color: "#666",
              }}>
                <span style={{ fontWeight: 600, color: "#89253E" }}>{posts.filter(p => (p.author?._id || p.author?.id) === (user?._id || user?.id)).length}</span> posts · <span style={{ fontWeight: 600, color: "#3A6186" }}>{users.length}</span> connections
              </div>
            </div>
          </div>

          {/* Quick nav */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 2px 12px rgba(137,37,62,0.07)" }}>
            {[
              { icon: "🏠", label: "Home Feed" },
              { icon: "💬", label: "Messages", action: () => setShowMessages(true) },
              { icon: "👥", label: "People" },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: "100%", background: "none", border: "none",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                  fontSize: 13, fontFamily: "Poppins, sans-serif", color: "#333",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f7f0f2"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Feed */}
        <div>
          <CreatePost user={user} onPost={handlePost} />

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              Loading posts…
            </div>
          ) : posts.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: 16, padding: "40px 20px",
              textAlign: "center", boxShadow: "0 2px 12px rgba(137,37,62,0.07)",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 6 }}>
                Be the first to post!
              </div>
              <div style={{ fontSize: 13, color: "#999" }}>
                Share something with the ChatMeHere community
              </div>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Right: People sidebar */}
        <div>
          <PeopleSidebar
            users={users}
            currentUser={user}
            onMessage={(u) => setShowMessages(true)}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .feed-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default Feed;