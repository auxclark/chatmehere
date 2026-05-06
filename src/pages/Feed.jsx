import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import MessengerPopup from "../components/MessengerPopup";
import {
  Heart, MessageCircle, Share2, Image, Video, Send,
  Trash2, LogOut, Home, Users as UsersIcon, MessageSquare,
  Loader2, Sparkles, Link, ChevronDown, Globe, Clock, X
} from "lucide-react";

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
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Avatar ────────────────────────────────
const Avatar = ({ user, size = 40 }) => {
  const src = user?.avatar || user?.profileImage;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #89253E, #3A6186)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      flexShrink: 0, overflow: "hidden", letterSpacing: "-0.5px",
    }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
        : getInitials(user)
      }
    </div>
  );
};

// ── Post Card ─────────────────────────────
const PostCard = ({ post, currentUser, onLike, onComment, onShare, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const uid = currentUser?._id?.toString() || currentUser?.id?.toString();
  const isLiked = post.likes?.some(l => l?.toString() === uid);
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const isOwner = (post.author?._id?.toString() || post.author?.id?.toString()) === uid;

  const handleLikeClick = () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    onLike(post._id);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    await onComment(post._id, commentText);
    setCommentText("");
    setSubmitting(false);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 14, marginBottom: 14,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(137,37,62,0.05)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar user={post.author} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", lineHeight: 1.3 }}>
            {post.author?.firstName} {post.author?.lastName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Clock size={11} color="#9ca3af" />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{timeAgo(post.createdAt)}</span>
            <span style={{ color: "#d1d5db", margin: "0 2px" }}>·</span>
            <Globe size={11} color="#9ca3af" />
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(post._id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#d1d5db", padding: "6px", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#89253E"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#d1d5db"; }}
            title="Delete post"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Text */}
      {post.text && (
        <div style={{ padding: "2px 16px 14px", fontSize: 14, lineHeight: 1.65, color: "#374151" }}>
          {post.text}
        </div>
      )}

      {/* Media */}
      {post.mediaUrl && post.mediaType === "image" && (
        <div style={{ width: "100%", background: "#f9fafb", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }}>
          <img
            src={post.mediaUrl} alt=""
            style={{ width: "100%", display: "block", maxHeight: 460, objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        </div>
      )}
      {post.mediaUrl && post.mediaType === "video" && !videoError && (
        <div style={{ background: "#000", borderTop: "1px solid #f3f4f6" }}>
          <video src={post.mediaUrl} controls
            style={{ width: "100%", display: "block", maxHeight: 420 }}
            onError={() => setVideoError(true)}
          />
        </div>
      )}

      {/* Stats row */}
      {(likeCount > 0 || commentCount > 0) && (
        <div style={{
          padding: "8px 16px", display: "flex", justifyContent: "space-between",
          fontSize: 13, color: "#6b7280",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {likeCount > 0 && (
              <>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "linear-gradient(135deg, #89253E, #c2566b)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Heart size={10} color="#fff" fill="#fff" />
                </div>
                <span>{likeCount}</span>
              </>
            )}
          </div>
          {commentCount > 0 && (
            <button
              onClick={() => setShowComments(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: "Poppins, sans-serif" }}
            >
              {commentCount} comment{commentCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        padding: "2px 8px 2px", borderTop: "1px solid #f3f4f6",
        display: "flex",
      }}>
        <ActionBtn
          icon={<Heart size={17} fill={isLiked ? "#89253E" : "none"} />}
          label="Like"
          active={isLiked}
          onClick={handleLikeClick}
          activeColor="#89253E"
          anim={likeAnim}
        />
        <ActionBtn
          icon={<MessageCircle size={17} />}
          label="Comment"
          onClick={() => setShowComments(v => !v)}
          active={showComments}
          activeColor="#3A6186"
        />
        <ActionBtn
          icon={<Share2 size={17} />}
          label="Share"
          onClick={() => onShare(post._id)}
        />
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 16px 14px", background: "#fafafa" }}>
          {post.comments?.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 9, marginBottom: 10 }}>
              <Avatar user={c.author} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "8px 12px",
                  fontSize: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  border: "1px solid #f3f4f6",
                }}>
                  <span style={{ fontWeight: 600, color: "#111827", marginRight: 6 }}>
                    {c.author?.firstName} {c.author?.lastName}
                  </span>
                  <span style={{ color: "#374151" }}>{c.text}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, paddingLeft: 4 }}>
                  {timeAgo(c.createdAt)}
                </div>
              </div>
            </div>
          ))}

          <form onSubmit={handleComment} style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Avatar user={currentUser} size={32} />
            <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                style={{
                  flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 22,
                  padding: "7px 14px", fontSize: 13, outline: "none",
                  fontFamily: "Poppins, sans-serif", background: "#fff",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#89253E"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: commentText.trim() ? "linear-gradient(135deg, #89253E, #3A6186)" : "#e5e7eb",
                  border: "none", cursor: commentText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                {submitting
                  ? <Loader2 size={14} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={14} color={commentText.trim() ? "#fff" : "#9ca3af"} />
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const ActionBtn = ({ icon, label, active, onClick, activeColor = "#374151", anim }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, background: "none", border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "9px 4px", borderRadius: 8,
      fontSize: 13, fontFamily: "Poppins, sans-serif", fontWeight: 500,
      color: active ? activeColor : "#6b7280",
      transition: "all 0.15s",
      transform: anim ? "scale(1.2)" : "scale(1)",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
    onMouseLeave={e => e.currentTarget.style.background = "none"}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// ── Create Post ───────────────────────────
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
    setMediaPreview(URL.createObjectURL(f));
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
      background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 14,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(137,37,62,0.05)",
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Avatar user={user} size={42} />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`What's on your mind, ${user?.firstName || "there"}?`}
          rows={text.length > 80 ? 3 : 1}
          style={{
            flex: 1, border: "1.5px solid #f3f4f6", borderRadius: 22,
            padding: "10px 16px", fontSize: 14, fontFamily: "Poppins, sans-serif",
            resize: "none", outline: "none", lineHeight: 1.5,
            background: "#f9fafb", color: "#111827",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onFocus={e => { e.target.style.borderColor = "#89253E"; e.target.style.background = "#fff"; }}
          onBlur={e => { e.target.style.borderColor = "#f3f4f6"; e.target.style.background = "#f9fafb"; }}
        />
      </div>

      {mediaPreview && (
        <div style={{ marginTop: 12, position: "relative", borderRadius: 10, overflow: "hidden", background: "#000" }}>
          {mediaType === "image"
            ? <img src={mediaPreview} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
            : <video src={mediaPreview} style={{ width: "100%", maxHeight: 220, display: "block" }} />
          }
          <button
            onClick={clearMedia}
            style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.55)", border: "none", color: "#fff",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          ><X size={14} /></button>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6",
      }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
        <MediaBtn icon={<Image size={16} color="#3A6186" />} label="Photo" onClick={() => { fileRef.current.accept = "image/*"; fileRef.current.click(); }} />
        <MediaBtn icon={<Video size={16} color="#89253E" />} label="Video" onClick={() => { fileRef.current.accept = "video/*"; fileRef.current.click(); }} />
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !media)}
          style={{
            background: (loading || (!text.trim() && !media))
              ? "#e5e7eb"
              : "linear-gradient(135deg, #89253E 0%, #5a2d5a 50%, #3A6186 100%)",
            border: "none", borderRadius: 22, color: (loading || (!text.trim() && !media)) ? "#9ca3af" : "#fff",
            padding: "9px 22px", fontSize: 13, fontWeight: 600,
            cursor: (loading || (!text.trim() && !media)) ? "default" : "pointer",
            fontFamily: "Poppins, sans-serif",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}
        >
          {loading
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Posting…</>
            : <><Send size={14} /> Post</>
          }
        </button>
      </div>
    </div>
  );
};

const MediaBtn = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "none", border: "none", cursor: "pointer",
      padding: "6px 12px", borderRadius: 8, fontSize: 13,
      color: "#6b7280", fontFamily: "Poppins, sans-serif", fontWeight: 500,
      transition: "background 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
    onMouseLeave={e => e.currentTarget.style.background = "none"}
  >
    {icon}<span>{label}</span>
  </button>
);

// ── People Sidebar ─────────────────────────
const PeopleSidebar = ({ users, onMessage }) => (
  <div style={{
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(137,37,62,0.05)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
      <UsersIcon size={14} color="#89253E" />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#89253E", letterSpacing: "0.6px", textTransform: "uppercase" }}>
        People on Trevio
      </span>
    </div>
    {users.slice(0, 8).map(u => (
      <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar user={u} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {u.firstName} {u.lastName}
          </div>
        </div>
        <button
          onClick={() => onMessage(u)}
          style={{
            background: "linear-gradient(135deg, #89253E, #3A6186)",
            border: "none", borderRadius: 8, color: "#fff",
            padding: "5px 11px", fontSize: 11, cursor: "pointer",
            fontFamily: "Poppins, sans-serif", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 4,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <MessageSquare size={11} />
          Chat
        </button>
      </div>
    ))}
  </div>
);

// ── Main Feed ──────────────────────────────
const Feed = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const menuRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

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
      alert(err?.response?.data?.message || "Failed to create post. Check console for details.");
    }
  };

  const handleLike = async (postId) => {
    try {
      const { data } = await api.post(`/api/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: data.likes } : p));
    } catch { /* ignore */ }
  };

  const handleComment = async (postId, text) => {
    try {
      const { data } = await api.post(`/api/posts/${postId}/comment`, { text });
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: data.comments } : p));
    } catch { fetchPosts(); }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard?.writeText(url).then(() => showToast("Link copied to clipboard"));
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch { /* ignore */ }
  };

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const myPostCount = posts.filter(p =>
    p.author?._id?.toString() === (user?._id?.toString() || user?.id?.toString()) ||
    p.author?.id?.toString() === (user?._id?.toString() || user?.id?.toString())
  ).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "Poppins, sans-serif" }}>
      {/* ── Messenger Popup ── */}
      {showMessages && <MessengerPopup onClose={() => setShowMessages(false)} />}

      {/* ── Navbar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 45%, #3A6186 100%)",
        boxShadow: "0 2px 20px rgba(137,37,62,0.35)",
      }}>
        <div style={{
          maxWidth: 1400, margin: "0 auto",
          display: "flex", alignItems: "center", height: 56, padding: "0 20px", gap: 12,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
            
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px" }}>
              Trevio<span style={{ opacity: 0.7, fontWeight: 600 }}></span>
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Messages button */}
          <button
            onClick={() => setShowMessages(true)}
            style={{
              position: "relative",
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10, color: "#fff", cursor: "pointer",
              padding: "7px 16px", display: "flex", alignItems: "center", gap: 7,
              fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <MessageSquare size={15} />
            <span>Messages</span>
          </button>

          {/* Profile dropdown */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfileMenu(v => !v)}
              style={{
                background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.3)",
                borderRadius: 24, padding: "3px 10px 3px 4px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              <Avatar user={user} size={30} />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.firstName}
              </span>
              <ChevronDown size={13} color="rgba(255,255,255,0.8)" />
            </button>

            {showProfileMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", borderRadius: 12, minWidth: 210,
                boxShadow: "0 8px 32px rgba(0,0,0,0.14)", overflow: "hidden",
                animation: "fadeSlide 0.15s ease",
              }}>
                <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", background: "none", border: "none",
                    padding: "11px 16px", textAlign: "left", cursor: "pointer",
                    fontSize: 13, color: "#89253E", fontFamily: "Poppins, sans-serif",
                    fontWeight: 600, display: "flex", alignItems: "center", gap: 9,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#111827", color: "#fff", padding: "10px 20px", borderRadius: 22,
          fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "fadeSlide 0.2s ease",
        }}>
          <Link size={13} color="#9ca3af" /> {toast}
        </div>
      )}

      {/* ── Layout ── */}
      <div className="feed-layout">

        {/* Left sidebar */}
        <div className="feed-left-col">
          {/* Profile card */}
          <div style={{
            background: "#fff", borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(137,37,62,0.05)",
          }}>
            <div style={{
              height: 64,
              background: "linear-gradient(135deg, #89253E 0%, #5a2d5a 50%, #3A6186 100%)",
            }} />
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ marginTop: -20, marginBottom: 10 }}>
                <div style={{ border: "3px solid #fff", borderRadius: "50%", display: "inline-block" }}>
                  <Avatar user={user} size={48} />
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{user?.email}</div>
              <div style={{
                marginTop: 10, display: "flex", gap: 12,
                padding: "8px 0", borderTop: "1px solid #f3f4f6",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#89253E" }}>{myPostCount}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Posts</div>
                </div>
                <div style={{ width: 1, background: "#f3f4f6" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#3A6186" }}>{users.length}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Connections</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick nav */}
          <div style={{
            background: "#fff", borderRadius: 14, padding: "8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(137,37,62,0.05)",
          }}>
            {[
              { icon: <Home size={16} />, label: "Home Feed", action: null },
              { icon: <MessageSquare size={16} />, label: "Messages", action: () => setShowMessages(true) },
              { icon: <UsersIcon size={16} />, label: "People", action: null },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: "100%", background: "none", border: "none",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 9, cursor: "pointer",
                  fontSize: 13, fontFamily: "Poppins, sans-serif",
                  color: "#374151", fontWeight: 500,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fef2f4"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ color: "#89253E" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center feed */}
        <div>
          <CreatePost user={user} onPost={handlePost} />

          {loading ? (
            <div style={{
              background: "#fff", borderRadius: 14, padding: "48px 20px",
              textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <Loader2 size={32} color="#89253E" style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: "#9ca3af" }}>Loading posts…</div>
            </div>
          ) : posts.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: 14, padding: "48px 20px",
              textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(137,37,62,0.1), rgba(58,97,134,0.1))",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <Sparkles size={26} color="#89253E" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 6 }}>
                Be the first to post!
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Share something with the Trevio community
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

        {/* Right sidebar */}
        <div className="feed-right-col">
          <PeopleSidebar users={users} onMessage={() => setShowMessages(true)} />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Responsive ── */
        .feed-layout {
          display: grid;
          grid-template-columns: 280px minmax(0,1fr) 260px;
          gap: 16px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 18px 20px;
        }
        .feed-left-col { display: flex; flex-direction: column; gap: 12px; }
        .feed-right-col { display: block; }

        /* Large desktop: even wider */
        @media (min-width: 1400px) {
          .feed-layout { grid-template-columns: 300px minmax(0,1fr) 280px; }
        }

        /* Tablet landscape: hide right sidebar */
        @media (max-width: 1100px) {
          .feed-layout { grid-template-columns: 260px minmax(0,1fr); }
          .feed-right-col { display: none; }
        }

        /* Tablet portrait: hide both sidebars */
        @media (max-width: 768px) {
          .feed-layout { grid-template-columns: 1fr; padding: 14px 12px; gap: 12px; }
          .feed-left-col { display: none; }
          .feed-right-col { display: none; }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .feed-layout { padding: 10px 8px; gap: 10px; }
          .nav-msg-label { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Feed;