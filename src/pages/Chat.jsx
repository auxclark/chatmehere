import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import api from "../services/api";

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎"];

const getIceServers = () => [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: import.meta.env.VITE_TURN_USERNAME || "openrelayproject",
    credential: import.meta.env.VITE_TURN_CREDENTIAL || "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: import.meta.env.VITE_TURN_USERNAME || "openrelayproject",
    credential: import.meta.env.VITE_TURN_CREDENTIAL || "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: import.meta.env.VITE_TURN_USERNAME || "openrelayproject",
    credential: import.meta.env.VITE_TURN_CREDENTIAL || "openrelayproject",
  },
];

const CALL_STATE = {
  IDLE:     "idle",
  CALLING:  "calling",
  INCOMING: "incoming",
  ACTIVE:   "active",
};

const Chat = ({ inlineUserId, inlineChatUser, onBack }) => {
  const params   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = inlineUserId || params.userId;

  const [chatUser, setChatUser] = useState(inlineChatUser || null);
  const [messages, setMessages] = useState([]);
  const [message,  setMessage]  = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Reply
  const [replyingTo, setReplyingTo] = useState(null);

  // File attachment
  const [attachFile,    setAttachFile]    = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [attachType,    setAttachType]    = useState(null);
  const [uploading,     setUploading]     = useState(false);

  // Reactions
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState(null);
  const [reactionMenuPos,   setReactionMenuPos]   = useState({ x: 0, y: 0 });

  // Paste
  const [pastePreview, setPastePreview] = useState(null);
  const [pasteFile,    setPasteFile]    = useState(null);

  // ── CALL STATE ────────────────────────────────────────────────────────
  const [callState,       setCallState]       = useState(CALL_STATE.IDLE);
  const [callType,        setCallType]        = useState(null);
  const [incomingCallData,setIncomingCallData]= useState(null);
  const [callDuration,    setCallDuration]    = useState(0);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isCameraOff,     setIsCameraOff]     = useState(false);
  const [isSpeakerOff,    setIsSpeakerOff]    = useState(false);
  const [callError,       setCallError]       = useState(null);
  const [callStatus,      setCallStatus]      = useState(""); // connecting, reconnecting

  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localStreamRef    = useRef(null);
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const remoteAudioRef    = useRef(null); // ← KEY FIX: dedicated audio element
  const callTimerRef      = useRef(null);
  const callTimeoutRef    = useRef(null);
  const pendingCandidates = useRef([]);   // buffer ICE candidates before remote desc

  // Other refs
  const chatBoxRef       = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef         = useRef(null);
  const fileInputRef     = useRef(null);
  const socketRef        = useRef(null);
  const replyRefs        = useRef({});

  const roomId = [user?._id, userId].sort().join("_");

  // ── Fetch chat user ───────────────────────────────────────────────────
  useEffect(() => {
    if (inlineChatUser) { setChatUser(inlineChatUser); return; }
    api.get(`/api/users/${userId}`)
      .then(({ data }) => setChatUser(data))
      .catch(() => { if (!inlineUserId) navigate("/users"); });
  }, [userId, inlineChatUser, inlineUserId, navigate]);

  // ── Fetch messages ────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/chat/${userId}`);
      setMessages(data);
    } catch (err) { console.error("fetch messages error", err); }
  }, [userId]);

  useEffect(() => {
    setMessages([]); setMessage(""); setReplyingTo(null); fetchMessages();
  }, [userId, fetchMessages]);

  // ── Socket setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (socketRef.current) socketRef.current.disconnect();

    const s = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
    socketRef.current = s;

    s.emit("user_online", user._id);
    s.emit("join_room", roomId);
    s.emit("mark_seen", { roomId, userId: user._id });

    // Chat
    s.on("receive_message", (newMsg) => {
      const senderId = newMsg.senderId?._id || newMsg.senderId;
      if (senderId !== user._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        s.emit("mark_seen", { roomId, userId: user._id });
      }
    });
    s.on("reaction_updated", (updatedMsg) => {
      setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
    });
    s.on("messages_seen", ({ by }) => {
      if (by !== user._id) setMessages(prev => prev.map(m => ({ ...m, status: "seen" })));
    });
    s.on("user_typing",      () => setIsTyping(true));
    s.on("user_stop_typing", () => setIsTyping(false));

    // ── WebRTC signaling ──────────────────────────────────────────────
    s.on("incoming_call", ({ from, offer, callType: ct }) => {
      setIncomingCallData({ from, offer, callType: ct });
      setCallType(ct);
      setCallState(CALL_STATE.INCOMING);
    });

    s.on("call_answered", async ({ answer }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          // Flush buffered ICE candidates
          for (const c of pendingCandidates.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates.current = [];
          setCallStatus("connected");
          setCallState(CALL_STATE.ACTIVE);
          startCallTimer();
          clearCallTimeout();
        }
      } catch (err) { console.error("call_answered error", err); }
    });

    s.on("ice_candidate", async ({ candidate }) => {
      if (!candidate) return;
      try {
        if (peerConnectionRef.current?.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Buffer until remote description is set
          pendingCandidates.current.push(candidate);
        }
      } catch (err) { console.error("ICE error", err); }
    });

    s.on("call_rejected",   () => { showCallError("Call was declined."); endCallCleanup(); });
    s.on("call_ended",      () => { endCallCleanup(); });
    s.on("call_missed",     () => { showCallError("Missed call."); endCallCleanup(); });
    s.on("call_unavailable",({ message: m }) => { showCallError(m); endCallCleanup(); });
    s.on("user_offline",    (uid) => {
      if (uid === userId) { showCallError("User went offline."); endCallCleanup(); }
    });

    return () => { s.disconnect(); socketRef.current = null; };
  }, [user, roomId, userId]);

  useEffect(() => {
    const onFocus = () => socketRef.current?.emit("mark_seen", { roomId, userId: user._id });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [roomId, user]);

  useEffect(() => {
    const onClick = () => setReactionMenuMsgId(null);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) { setPasteFile(file); setPastePreview(URL.createObjectURL(file)); }
          break;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, [userId]);

  // ── Call helpers ──────────────────────────────────────────────────────
  const showCallError = (msg) => {
    setCallError(msg);
    setTimeout(() => setCallError(null), 4000);
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setCallDuration(0);
  };

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Create RTCPeerConnection ──────────────────────────────────────────
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit("ice_candidate", { to: userId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallStatus("connected");
      }
      if (pc.iceConnectionState === "disconnected") setCallStatus("reconnecting...");
      if (pc.iceConnectionState === "failed") { showCallError("Connection failed."); endCallCleanup(); }
    };

    // ── KEY FIX: attach remote stream to BOTH video AND audio elements ──
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      // Video element (for video calls)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      // Audio element — this is what was missing before!
      // Always attach to audio element regardless of call type
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(e => console.error("audio play error:", e));
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        endCallCleanup();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // ── Get camera/mic ────────────────────────────────────────────────────
  const getUserMedia = async (type) => {
    const constraints = {
      // ── KEY FIX: better audio constraints ──
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      },
      video: type === "video"
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Show your own camera in corner
      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error("getUserMedia error:", err);
      if (err.name === "NotAllowedError") throw new Error("PERMISSION_DENIED");
      if (err.name === "NotFoundError")   throw new Error("DEVICE_NOT_FOUND");
      throw err;
    }
  };

  // ── Start outgoing call ───────────────────────────────────────────────
  const startCall = async (type) => {
    setCallError(null);
    setCallType(type);
    setCallState(CALL_STATE.CALLING);
    setCallStatus("calling...");
    pendingCandidates.current = [];

    try {
      const stream = await getUserMedia(type);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
      await pc.setLocalDescription(offer);

      socketRef.current.emit("call_offer", {
        to: userId, offer, callType: type,
        callerInfo: { _id: user._id, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar },
      });

      // Auto-cancel after 30s
      callTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("call_missed", { to: userId });
        showCallError("No answer.");
        endCallCleanup();
      }, 30000);

    } catch (err) {
      console.error("startCall error:", err);
      if (err.message === "PERMISSION_DENIED") showCallError("Please allow camera/microphone access.");
      else if (err.message === "DEVICE_NOT_FOUND") showCallError("No camera/microphone found.");
      else showCallError("Could not start call.");
      setCallState(CALL_STATE.IDLE);
    }
  };

  // ── Accept incoming call ──────────────────────────────────────────────
  const acceptCall = async () => {
    if (!incomingCallData) return;
    setCallStatus("connecting...");
    pendingCandidates.current = [];

    try {
      const { from, offer, callType: ct } = incomingCallData;
      const stream = await getUserMedia(ct);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush any buffered candidates
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit("call_answer", { to: from._id, answer });

      setCallState(CALL_STATE.ACTIVE);
      startCallTimer();
      setIncomingCallData(null);

    } catch (err) {
      console.error("acceptCall error:", err);
      if (err.message === "PERMISSION_DENIED") showCallError("Please allow camera/microphone access.");
      else showCallError("Could not connect call.");
      rejectCall();
    }
  };

  // ── Reject incoming call ──────────────────────────────────────────────
  const rejectCall = () => {
    if (incomingCallData?.from?._id) {
      socketRef.current?.emit("call_rejected", { to: incomingCallData.from._id });
    }
    setIncomingCallData(null);
    setCallState(CALL_STATE.IDLE);
  };

  // ── End active call ───────────────────────────────────────────────────
  const endCall = () => {
    socketRef.current?.emit("call_ended", { to: userId });
    endCallCleanup();
  };

  const cancelCall = () => {
    socketRef.current?.emit("call_ended", { to: userId });
    clearCallTimeout();
    endCallCleanup();
  };

  // ── Full cleanup ──────────────────────────────────────────────────────
  const endCallCleanup = () => {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video/audio elements
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    pendingCandidates.current = [];
    stopCallTimer();
    clearCallTimeout();

    setCallState(CALL_STATE.IDLE);
    setCallType(null);
    setIncomingCallData(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsSpeakerOff(false);
    setCallStatus("");
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(p => !p);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerOff(p => !p);
    }
  };

  // ── Chat helpers ──────────────────────────────────────────────────────
  const scrollToMessage = (msgId) => {
    const el = replyRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "rgba(137,37,62,0.12)";
      setTimeout(() => { el.style.background = ""; }, 1500);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !attachFile && !pasteFile) return;
    if (attachFile || pasteFile) { await handleSendFile(attachFile || pasteFile); return; }
    const msgText = message.trim();
    setMessage("");
    try {
      const { data: savedMsg } = await api.post("/api/chat/send", {
        receiverId: userId, message: msgText, replyTo: replyingTo?._id || null,
      });
      setMessages(prev => {
        if (prev.some(m => m._id === savedMsg._id)) return prev;
        return [...prev, { ...savedMsg, status: "delivered" }];
      });
      socketRef.current?.emit("send_message", { roomId, message: savedMsg });
      setReplyingTo(null);
      scrollToBottom();
    } catch (err) { console.error("send error", err); setMessage(msgText); }
  };

  const handleSendFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("receiverId", userId);
      if (message.trim()) formData.append("message", message.trim());
      if (replyingTo?._id) formData.append("replyTo", replyingTo._id);
      const { data: savedMsg } = await api.post("/api/chat/send-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages(prev => {
        if (prev.some(m => m._id === savedMsg._id)) return prev;
        return [...prev, { ...savedMsg, status: "delivered" }];
      });
      socketRef.current?.emit("send_message", { roomId, message: savedMsg });
      setAttachFile(null); setAttachPreview(null); setAttachType(null);
      setPasteFile(null); setPastePreview(null);
      setMessage(""); setReplyingTo(null);
      scrollToBottom();
    } catch (err) { console.error("send file error", err); }
    finally { setUploading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    setAttachFile(file); setAttachType(isImage ? "image" : "file");
    if (isImage) setAttachPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const clearAttachment = () => {
    setAttachFile(null); setAttachPreview(null); setAttachType(null);
    setPasteFile(null); setPastePreview(null);
  };

  const handleReact = async (msgId, emoji) => {
    setReactionMenuMsgId(null);
    try {
      const { data: updatedMsg } = await api.put(`/api/chat/react/${msgId}`, { emoji });
      setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      socketRef.current?.emit("reaction_update", { roomId, message: updatedMsg });
    } catch (err) { console.error("react error", err); }
  };

  const handleKeyUp = (e) => {
    if (e.key === "Enter" && (message.trim() || attachFile || pasteFile)) { handleSend(); return; }
    if (e.key === "Escape") { setReplyingTo(null); return; }
    socketRef.current?.emit("typing", { roomId, userId: user._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { roomId, userId: user._id });
    }, 1000);
  };

  const handleBack = () => { if (onBack) onBack(); else navigate("/users"); };
  const isOnline = chatUser?.status === "Active now";
  const getAvatar = (u, size = 40) =>
    u?.avatar || `https://ui-avatars.com/api/?name=${u?.firstName}+${u?.lastName}&background=3A6186&color=fff&size=${size}`;

  const lastOutgoingMsg = [...messages].reverse().find(m => {
    const sid = m.senderId?._id || m.senderId;
    return sid === user?._id;
  });
  const lastOutgoingStatus = lastOutgoingMsg?.status || "delivered";

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getReplyPreview = (msg) => {
    if (!msg) return "";
    if (msg.fileType === "image")    return "📷 Photo";
    if (msg.fileType === "video")    return "🎥 Video";
    if (msg.fileType === "audio")    return "🎵 Audio";
    if (msg.fileType === "document") return `📄 ${msg.fileName || "File"}`;
    return msg.message || "";
  };

  const renderMsgContent = (msg, isOutgoing) => {
    const hasFile = msg.fileUrl;
    const hasText = msg.message?.trim();
    return (
      <div>
        {hasFile && msg.fileType === "image" && (
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
            <img src={msg.fileUrl} alt={msg.fileName || "image"} style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 10, display: "block", marginBottom: hasText ? 8 : 0, cursor: "pointer" }} />
          </a>
        )}
        {hasFile && msg.fileType !== "image" && (
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, background: isOutgoing ? "rgba(255,255,255,0.15)" : "rgba(58,97,134,0.08)", padding: "10px 14px", borderRadius: 10, textDecoration: "none", marginBottom: hasText ? 8 : 0, border: isOutgoing ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e2e8f0" }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: isOutgoing ? "rgba(255,255,255,0.2)" : "rgba(58,97,134,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`fa-solid ${msg.fileType === "video" ? "fa-video" : msg.fileType === "audio" ? "fa-music" : "fa-file"}`} style={{ fontSize: 16, color: isOutgoing ? "#fff" : "#3A6186" }}></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: isOutgoing ? "#fff" : "#2d3748", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{msg.fileName || "File"}</div>
              <div style={{ fontSize: 11, color: isOutgoing ? "rgba(255,255,255,0.7)" : "#a0aec0" }}>Tap to download</div>
            </div>
            <i className="fa-solid fa-download" style={{ fontSize: 14, color: isOutgoing ? "rgba(255,255,255,0.7)" : "#a0aec0", flexShrink: 0 }}></i>
          </a>
        )}
        {hasText && <span>{msg.message}</span>}
      </div>
    );
  };

  const renderReactions = (msg) => {
    const obj = msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : (msg.reactions || {});
    if (!Object.keys(obj).length) return null;
    const grouped = {};
    Object.values(obj).forEach(e => { grouped[e] = (grouped[e] || 0) + 1; });
    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
        {Object.entries(grouped).map(([emoji, count]) => (
          <button key={emoji} onClick={() => handleReact(msg._id, emoji)} style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.95)", border: "1px solid #e2e8f0", borderRadius: 20, padding: "2px 8px", fontSize: 13, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", fontFamily: "inherit" }}>
            {emoji}{count > 1 && <span style={{ fontSize: 11, color: "#718096" }}>{count}</span>}
          </button>
        ))}
      </div>
    );
  };

  const hasAttachment = attachFile || pasteFile;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .chat-panel { display: flex; flex-direction: column; height: 100vh; width: 100%; background: #f8fafc; overflow: hidden; font-family: 'Poppins', sans-serif; }

        .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; background: #fff; border-bottom: 1px solid #e8edf2; box-shadow: 0 2px 8px rgba(0,0,0,0.04); flex-shrink: 0; }
        .chat-header-left { display: flex; align-items: center; gap: 14px; }
        .chat-back-btn { width: 38px; height: 38px; border-radius: 10px; border: none; background: #f0f4f8; color: #4a5568; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
        .chat-back-btn:hover { background: #e2e8f0; }
        .chat-header-user { display: flex; align-items: center; gap: 14px; }
        .chat-header-avatar-wrap { position: relative; }
        .chat-header-avatar { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #e8edf2; }
        .chat-header-status-dot { position: absolute; bottom: 1px; right: 1px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; }
        .chat-header-name { font-size: 16px; font-weight: 600; color: #2d3748; }
        .chat-header-online { font-size: 12px; color: #718096; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .chat-header-actions { display: flex; gap: 8px; }
        .chat-action-btn { width: 38px; height: 38px; border-radius: 10px; border: none; background: #f0f4f8; color: #718096; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .chat-action-btn:hover { background: #e8edf2; color: #89253E; }
        .chat-action-btn.video-btn:hover { background: #ebf8ff; color: #3182ce; }
        .chat-action-btn.call-btn:hover  { background: #f0fff4; color: #38a169; }

        .chat-messages-area { flex: 1; overflow-y: auto; padding: 24px 28px 16px; display: flex; flex-direction: column; }
        .chat-messages-area::-webkit-scrollbar { width: 4px; }
        .chat-messages-area::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .chat-no-messages { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; }
        .chat-no-messages-icon { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, rgba(137,37,62,0.08), rgba(58,97,134,0.08)); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .chat-no-messages-icon i { font-size: 32px; background: linear-gradient(135deg, #89253E, #3A6186); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .chat-no-messages p { font-size: 15px; color: #a0aec0; font-weight: 500; }

        .chat-msg-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 2px; }
        .chat-msg-row.outgoing { justify-content: flex-end; }
        .chat-msg-row.incoming { justify-content: flex-start; }
        .chat-msg-avatar-space { width: 32px; flex-shrink: 0; }
        .chat-msg-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }

        .chat-bubble-wrap { position: relative; max-width: 55%; }
        .chat-bubble-wrap.outgoing { margin-left: auto; }
        .chat-msg-actions { position: absolute; top: 50%; transform: translateY(-50%); display: none; align-items: center; gap: 4px; z-index: 10; }
        .chat-bubble-wrap:hover .chat-msg-actions { display: flex; }
        .chat-bubble-wrap.outgoing .chat-msg-actions { left: -82px; flex-direction: row-reverse; }
        .chat-bubble-wrap.incoming .chat-msg-actions { right: -82px; }
        .chat-msg-action-btn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.15s; color: #718096; }
        .chat-msg-action-btn:hover { transform: scale(1.1); color: #89253E; }

        .chat-bubble { padding: 11px 16px; border-radius: 18px; word-break: break-word; box-shadow: 0 1px 4px rgba(0,0,0,0.07); line-height: 1.55; font-size: 14px; }
        .chat-bubble.outgoing { background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; border-bottom-right-radius: 4px; }
        .chat-bubble.incoming { background: #fff; color: #2d3748; border-bottom-left-radius: 4px; border: 1px solid #e8edf2; }

        .reply-preview-bubble { border-radius: 10px; padding: 8px 12px; margin-bottom: 8px; cursor: pointer; transition: opacity 0.2s; border-left: 3px solid; overflow: hidden; }
        .reply-preview-bubble:hover { opacity: 0.85; }
        .reply-preview-bubble.outgoing { background: rgba(255,255,255,0.15); border-left-color: rgba(255,255,255,0.6); }
        .reply-preview-bubble.incoming { background: rgba(137,37,62,0.06); border-left-color: #89253E; }
        .reply-preview-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; display: flex; align-items: center; gap: 4px; }
        .reply-preview-bubble.outgoing .reply-preview-name { color: rgba(255,255,255,0.9); }
        .reply-preview-bubble.incoming .reply-preview-name { color: #89253E; }
        .reply-preview-text { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
        .reply-preview-bubble.outgoing .reply-preview-text { color: rgba(255,255,255,0.75); }
        .reply-preview-bubble.incoming .reply-preview-text { color: #718096; }
        .reply-preview-img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; float: right; margin-left: 8px; }

        .chat-msg-highlight { border-radius: 12px; }
        .chat-msg-status { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 3px; margin-right: 4px; font-size: 11px; color: #a0aec0; }
        .chat-msg-status.seen { color: #3A6186; }
        .status-seen-icon { display: inline-flex; }
        .status-seen-icon .fa-check:last-child { margin-left: -5px; }

        .chat-typing-dots { display: flex; gap: 4px; align-items: center; padding: 2px 0; }
        .chat-typing-dot { width: 8px; height: 8px; border-radius: 50%; background: #a0aec0; animation: chatBounce 1.2s ease-in-out infinite; }
        .chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        .reaction-menu { position: fixed; z-index: 999; background: #fff; border-radius: 40px; padding: 8px 12px; display: flex; gap: 6px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); border: 1px solid #f0f4f8; animation: reactionPop 0.2s ease; }
        .reaction-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s; }
        .reaction-btn:hover { transform: scale(1.25); background: #f0f4f8; }

        .reply-bar { background: #fff; border-top: 1px solid #e8edf2; padding: 10px 20px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; animation: slideUp 0.2s ease; }
        .reply-bar-indicator { width: 3px; border-radius: 3px; background: linear-gradient(135deg, #89253E, #3A6186); align-self: stretch; flex-shrink: 0; }
        .reply-bar-content { flex: 1; min-width: 0; }
        .reply-bar-name { font-size: 12px; font-weight: 700; color: #89253E; margin-bottom: 2px; display: flex; align-items: center; gap: 5px; }
        .reply-bar-text { font-size: 12px; color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .reply-bar-img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .reply-bar-close { width: 26px; height: 26px; border-radius: 50%; border: none; background: #f0f4f8; color: #a0aec0; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .reply-bar-close:hover { background: #fee2e2; color: #e53e3e; }

        .attach-preview-bar { background: #fff; border-top: 1px solid #e8edf2; padding: 12px 20px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .attach-preview-img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 2px solid #89253E; }
        .attach-clear-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: #fee2e2; color: #e53e3e; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: auto; }

        .paste-preview-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .paste-preview-card { background: #fff; border-radius: 20px; padding: 28px; max-width: 480px; width: 100%; box-shadow: 0 24px 80px rgba(0,0,0,0.25); animation: chatFadeUp 0.3s ease; }
        .paste-preview-title { font-size: 16px; font-weight: 700; color: #1a202c; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .paste-preview-img-el { width: 100%; max-height: 300px; object-fit: contain; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
        .paste-caption-input { width: 100%; height: 42px; padding: 0 14px; border-radius: 10px; border: 2px solid #e2e8f0; font-size: 14px; outline: none; font-family: 'Poppins', sans-serif; color: #2d3748; background: #f8fafc; margin-bottom: 16px; }
        .paste-caption-input:focus { border-color: #89253E; background: #fff; }
        .paste-actions { display: flex; gap: 10px; }
        .paste-cancel-btn { flex: 1; height: 44px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #718096; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; }
        .paste-send-btn { flex: 2; height: 44px; border-radius: 10px; border: none; background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .paste-send-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .chat-input-area { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: #fff; border-top: 1px solid #e8edf2; flex-shrink: 0; }
        .chat-attach-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: #f0f4f8; color: #a0aec0; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
        .chat-attach-btn:hover { background: #e2e8f0; color: #89253E; }
        .chat-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
        .chat-message-input { width: 100%; height: 46px; padding: 0 48px 0 18px; border-radius: 23px; border: 2px solid #e2e8f0; font-size: 14px; outline: none; background: #f8fafc; color: #2d3748; font-family: 'Poppins', sans-serif; transition: all 0.2s; }
        .chat-message-input:focus { border-color: #89253E; background: #fff; }
        .chat-emoji-btn { position: absolute; right: 13px; background: none; border: none; color: #a0aec0; font-size: 18px; cursor: pointer; }
        .chat-emoji-btn:hover { color: #89253E; }
        .chat-send-btn { width: 46px; height: 46px; border-radius: 50%; border: none; background: linear-gradient(135deg, #89253E, #3A6186); color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all 0.2s; box-shadow: 0 3px 12px rgba(137,37,62,0.35); }
        .chat-send-btn:hover:not(:disabled) { transform: scale(1.07); }
        .chat-send-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
        .uploading-bar { background: linear-gradient(135deg, rgba(137,37,62,0.08), rgba(58,97,134,0.08)); padding: 8px 20px; font-size: 13px; color: #89253E; font-weight: 500; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        /* ══ CALL UI ══════════════════════════════════════════════════════ */

        /* Incoming call */
        .incoming-call-overlay { position: fixed; inset: 0; z-index: 900; background: rgba(0,0,0,0.75); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; animation: chatFadeUp 0.3s ease; }
        .incoming-call-card { background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 28px; padding: 40px 36px; text-align: center; width: 100%; max-width: 340px; box-shadow: 0 32px 80px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); }
        .incoming-call-avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 3px solid rgba(255,255,255,0.2); animation: callRing 1.5s ease-in-out infinite; }
        .incoming-call-name { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .incoming-call-type { font-size: 14px; color: rgba(255,255,255,0.45); margin-bottom: 36px; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .incoming-call-actions { display: flex; justify-content: center; gap: 40px; }
        .call-reject-btn { width: 66px; height: 66px; border-radius: 50%; border: none; background: #e53e3e; color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(229,62,62,0.5); transition: transform 0.15s; }
        .call-reject-btn:hover { transform: scale(1.08); }
        .call-accept-btn { width: 66px; height: 66px; border-radius: 50%; border: none; background: #38a169; color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(56,161,105,0.5); transition: transform 0.15s; animation: callRing 1.5s ease-in-out infinite; }
        .call-accept-btn:hover { transform: scale(1.08); }
        .call-btn-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 10px; }

        /* Outgoing calling */
        .calling-overlay { position: fixed; inset: 0; z-index: 900; background: linear-gradient(145deg, #1a1a2e, #16213e, #0f3460); display: flex; flex-direction: column; align-items: center; justify-content: center; animation: chatFadeUp 0.3s ease; }
        .calling-avatar { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; margin-bottom: 20px; border: 3px solid rgba(255,255,255,0.2); animation: callRing 1.5s ease-in-out infinite; }
        .calling-name { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .calling-status { font-size: 14px; color: rgba(255,255,255,0.45); margin-bottom: 60px; }
        .calling-cancel-btn { width: 68px; height: 68px; border-radius: 50%; border: none; background: #e53e3e; color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(229,62,62,0.5); transition: transform 0.15s; }
        .calling-cancel-btn:hover { transform: scale(1.08); }

        /* Active call screen */
        .call-screen { position: fixed; inset: 0; z-index: 900; background: #000; display: flex; flex-direction: column; animation: chatFadeUp 0.3s ease; }
        .call-remote-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #111; }
        .call-remote-fallback { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(145deg, #1a1a2e, #0f3460); }
        .call-remote-fallback img { width: 130px; height: 130px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.2); margin-bottom: 16px; }
        .call-remote-fallback p { font-size: 20px; font-weight: 600; color: #fff; }
        .call-local-video { position: absolute; bottom: 130px; right: 20px; width: 110px; height: 150px; border-radius: 16px; object-fit: cover; border: 2px solid rgba(255,255,255,0.3); background: #222; z-index: 10; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .call-info-bar { position: absolute; top: 0; left: 0; right: 0; padding: 52px 24px 20px; background: linear-gradient(to bottom, rgba(0,0,0,0.75), transparent); text-align: center; z-index: 10; }
        .call-info-name { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .call-info-sub { font-size: 13px; color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; gap: 6px; }
        .call-controls { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px 24px 52px; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); display: flex; justify-content: center; align-items: center; gap: 18px; z-index: 10; }
        .call-ctrl-btn { width: 58px; height: 58px; border-radius: 50%; border: none; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s, background 0.2s; }
        .call-ctrl-btn:hover { transform: scale(1.08); }
        .ctrl-mute   { background: rgba(255,255,255,0.18); color: #fff; }
        .ctrl-mute.active    { background: #fff; color: #1a1a2e; }
        .ctrl-camera { background: rgba(255,255,255,0.18); color: #fff; }
        .ctrl-camera.active  { background: #fff; color: #1a1a2e; }
        .ctrl-speaker{ background: rgba(255,255,255,0.18); color: #fff; }
        .ctrl-speaker.active { background: #fff; color: #1a1a2e; }
        .ctrl-end { background: #e53e3e; color: #fff; width: 68px; height: 68px; font-size: 22px; box-shadow: 0 4px 20px rgba(229,62,62,0.5); }

        /* Call error */
        .call-error-toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; background: #e53e3e; color: #fff; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 8px; animation: slideDown 0.3s ease; white-space: nowrap; }

        @keyframes chatBounce   { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        @keyframes chatFadeUp   { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        @keyframes reactionPop  { from { opacity:0; transform: scale(0.8); } to { opacity:1; transform: scale(1); } }
        @keyframes slideUp      { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes slideDown    { from { opacity:0; transform: translateX(-50%) translateY(-10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        @keyframes callRing     { 0%,100% { box-shadow: 0 0 0 0 rgba(56,161,105,0.4); } 50% { box-shadow: 0 0 0 18px rgba(56,161,105,0); } }

        @media (max-width: 600px) {
          .chat-header { padding: 12px 14px; }
          .chat-messages-area { padding: 14px 12px 8px; }
          .chat-bubble-wrap { max-width: 78%; }
          .chat-bubble { font-size: 13px; }
          .chat-input-area { padding: 10px 12px; gap: 8px; }
          .chat-msg-actions { display: none !important; }
          .call-local-video { width: 85px; height: 115px; bottom: 120px; right: 12px; }
        }
      `}</style>

      {/* ── Hidden remote audio element — ALWAYS in DOM ── */}
      {/* This is the KEY FIX: audio plays through this even on video calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Call error toast */}
      {callError && (
        <div className="call-error-toast">
          <i className="fa-solid fa-circle-exclamation"></i> {callError}
        </div>
      )}

      {/* Reaction popup */}
      {reactionMenuMsgId && (
        <div className="reaction-menu" style={{ left: Math.min(Math.max(reactionMenuPos.x, 10), window.innerWidth - 310), top: Math.max(reactionMenuPos.y, 10) }} onClick={e => e.stopPropagation()}>
          {REACTIONS.map(e => <button key={e} className="reaction-btn" onClick={() => handleReact(reactionMenuMsgId, e)}>{e}</button>)}
        </div>
      )}

      {/* Paste preview */}
      {pastePreview && (
        <div className="paste-preview-overlay" onClick={clearAttachment}>
          <div className="paste-preview-card" onClick={e => e.stopPropagation()}>
            <div className="paste-preview-title"><i className="fa-solid fa-image" style={{ color: "#89253E" }}></i> Send Image</div>
            <img src={pastePreview} alt="preview" className="paste-preview-img-el" />
            <input type="text" placeholder="Add a caption... (optional)" value={message} onChange={e => setMessage(e.target.value)} onKeyUp={e => e.key === "Enter" && handleSend()} className="paste-caption-input" autoFocus />
            <div className="paste-actions">
              <button className="paste-cancel-btn" onClick={clearAttachment}>Cancel</button>
              <button className="paste-send-btn" onClick={handleSend} disabled={uploading}>
                {uploading ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending...</> : <><i className="fa-solid fa-paper-plane"></i> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ INCOMING CALL ══ */}
      {callState === CALL_STATE.INCOMING && incomingCallData && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <img src={getAvatar(incomingCallData.from, 90)} alt="" className="incoming-call-avatar" />
            <div className="incoming-call-name">{incomingCallData.from?.firstName} {incomingCallData.from?.lastName}</div>
            <div className="incoming-call-type">
              <i className={`fa-solid ${incomingCallData.callType === "video" ? "fa-video" : "fa-phone"}`}></i>
              Incoming {incomingCallData.callType === "video" ? "Video" : "Voice"} Call...
            </div>
            <div className="incoming-call-actions">
              <div>
                <button className="call-reject-btn" onClick={rejectCall}><i className="fa-solid fa-phone-slash"></i></button>
                <div className="call-btn-label">Decline</div>
              </div>
              <div>
                <button className="call-accept-btn" onClick={acceptCall}>
                  <i className={`fa-solid ${incomingCallData.callType === "video" ? "fa-video" : "fa-phone"}`}></i>
                </button>
                <div className="call-btn-label">Accept</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ OUTGOING CALLING ══ */}
      {callState === CALL_STATE.CALLING && (
        <div className="calling-overlay">
          <img src={getAvatar(chatUser, 110)} alt="" className="calling-avatar" />
          <div className="calling-name">{chatUser?.firstName} {chatUser?.lastName}</div>
          <div className="calling-status">
            {callType === "video" ? "📹 Video calling..." : "📞 Voice calling..."}
          </div>
          <button className="calling-cancel-btn" onClick={cancelCall}>
            <i className="fa-solid fa-phone-slash"></i>
          </button>
        </div>
      )}

      {/* ══ ACTIVE CALL ══ */}
      {callState === CALL_STATE.ACTIVE && (
        <div className="call-screen">

          {/* Remote video OR fallback avatar */}
          {callType === "video"
            ? <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video" />
            : (
              <div className="call-remote-fallback">
                <img src={getAvatar(chatUser, 130)} alt="" />
                <p>{chatUser?.firstName} {chatUser?.lastName}</p>
              </div>
            )
          }

          {/* Your local video (corner) — video calls only */}
          {callType === "video" && (
            <video ref={localVideoRef} autoPlay playsInline muted className="call-local-video" />
          )}

          {/* Top info */}
          <div className="call-info-bar">
            <div className="call-info-name">{chatUser?.firstName} {chatUser?.lastName}</div>
            <div className="call-info-sub">
              <i className="fa-solid fa-circle" style={{ fontSize: 8, color: "#48bb78" }}></i>
              {formatDuration(callDuration)}
              {callStatus === "reconnecting..." && <span style={{ color: "#f6ad55", marginLeft: 8 }}>reconnecting...</span>}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="call-controls">

            {/* Mute mic */}
            <button className={`call-ctrl-btn ctrl-mute ${isMuted ? "active" : ""}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute mic"}>
              <i className={`fa-solid ${isMuted ? "fa-microphone-slash" : "fa-microphone"}`}></i>
            </button>

            {/* End call */}
            <button className="call-ctrl-btn ctrl-end" onClick={endCall} title="End call">
              <i className="fa-solid fa-phone-slash"></i>
            </button>

            {/* Speaker toggle */}
            <button className={`call-ctrl-btn ctrl-speaker ${isSpeakerOff ? "active" : ""}`} onClick={toggleSpeaker} title={isSpeakerOff ? "Unmute speaker" : "Mute speaker"}>
              <i className={`fa-solid ${isSpeakerOff ? "fa-volume-xmark" : "fa-volume-high"}`}></i>
            </button>

            {/* Camera toggle — video calls only */}
            {callType === "video" && (
              <button className={`call-ctrl-btn ctrl-camera ${isCameraOff ? "active" : ""}`} onClick={toggleCamera} title={isCameraOff ? "Turn on camera" : "Turn off camera"}>
                <i className={`fa-solid ${isCameraOff ? "fa-video-slash" : "fa-video"}`}></i>
              </button>
            )}

          </div>
        </div>
      )}

      {/* ══ CHAT PANEL ══ */}
      <div className="chat-panel">

        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button className="chat-back-btn" onClick={handleBack}>
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            {chatUser && (
              <div className="chat-header-user">
                <div className="chat-header-avatar-wrap">
                  <img src={getAvatar(chatUser, 46)} alt="" className="chat-header-avatar" />
                  <div className="chat-header-status-dot" style={{ background: isOnline ? "#48bb78" : "#cbd5e0" }} />
                </div>
                <div>
                  <div className="chat-header-name">{chatUser.firstName} {chatUser.lastName}</div>
                  <div className="chat-header-online">
                    <i className="fa-solid fa-circle" style={{ color: isOnline ? "#48bb78" : "#cbd5e0" }}></i>
                    {isOnline ? "Active now" : "Offline"}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="chat-header-actions">
            <button className="chat-action-btn call-btn" title="Voice call" onClick={() => startCall("audio")}>
              <i className="fa-solid fa-phone"></i>
            </button>
            <button className="chat-action-btn video-btn" title="Video call" onClick={() => startCall("video")}>
              <i className="fa-solid fa-video"></i>
            </button>
            <button className="chat-action-btn" title="More options">
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>
        </div>

        {uploading && <div className="uploading-bar"><i className="fa-solid fa-spinner fa-spin"></i> Uploading...</div>}

        {/* Attachment preview */}
        {attachFile && !pastePreview && (
          <div className="attach-preview-bar">
            {attachType === "image" && attachPreview
              ? <img src={attachPreview} alt="preview" className="attach-preview-img" />
              : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f4f8", padding: "10px 14px", borderRadius: 10, flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(58,97,134,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="fa-solid fa-file" style={{ fontSize: 16, color: "#3A6186" }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#2d3748", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{attachFile.name}</div>
                    <div style={{ fontSize: 11, color: "#a0aec0" }}>{formatSize(attachFile.size)}</div>
                  </div>
                </div>
              )
            }
            <button className="attach-clear-btn" onClick={clearAttachment}><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages-area" ref={chatBoxRef}>
          {messages.length === 0 ? (
            <div className="chat-no-messages">
              <div className="chat-no-messages-icon"><i className="fa-solid fa-comment-dots"></i></div>
              <p>No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isOutgoing   = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                const prevSender   = messages[idx - 1]?.senderId?._id || messages[idx - 1]?.senderId;
                const currSender   = msg.senderId?._id || msg.senderId;
                const showAvatar   = !isOutgoing && prevSender !== currSender;
                const isLastOut    = isOutgoing && msg._id === lastOutgoingMsg?._id;
                const repliedMsg   = msg.replyTo;
                const repliedSender= repliedMsg?.senderId;
                const repliedIsMe  = repliedSender?._id === user?._id || repliedSender === user?._id;

                return (
                  <div key={msg._id} style={{ marginBottom: 2 }} ref={el => { if (el) replyRefs.current[msg._id] = el; }} className="chat-msg-highlight">
                    <div className={`chat-msg-row ${isOutgoing ? "outgoing" : "incoming"}`}>
                      {!isOutgoing && (showAvatar
                        ? <img src={getAvatar(chatUser, 32)} alt="" className="chat-msg-avatar" />
                        : <div className="chat-msg-avatar-space" />
                      )}

                      <div className={`chat-bubble-wrap ${isOutgoing ? "outgoing" : "incoming"}`}>
                        <div className="chat-msg-actions" onClick={e => e.stopPropagation()}>
                          <button className="chat-msg-action-btn" onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}>
                            <i className="fa-solid fa-reply"></i>
                          </button>
                          <button className="chat-msg-action-btn" onClick={e => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setReactionMenuPos({ x: Math.min(Math.max(r.left - 50, 10), window.innerWidth - 310), y: Math.max(r.top - 60, 10) });
                            setReactionMenuMsgId(msg._id);
                          }}>😊</button>
                        </div>

                        <div className={`chat-bubble ${isOutgoing ? "outgoing" : "incoming"}`}>
                          {repliedMsg && (
                            <div className={`reply-preview-bubble ${isOutgoing ? "outgoing" : "incoming"}`} onClick={() => scrollToMessage(repliedMsg._id)}>
                              {repliedMsg.fileType === "image" && repliedMsg.fileUrl && <img src={repliedMsg.fileUrl} alt="" className="reply-preview-img" />}
                              <div className="reply-preview-name">
                                <i className="fa-solid fa-reply" style={{ fontSize: 10 }}></i>
                                {repliedIsMe ? "You" : repliedSender?.firstName || ""}
                              </div>
                              <div className="reply-preview-text">{getReplyPreview(repliedMsg)}</div>
                            </div>
                          )}
                          {renderMsgContent(msg, isOutgoing)}
                        </div>

                        {renderReactions(msg)}
                      </div>
                    </div>

                    {isLastOut && (
                      <div className={`chat-msg-status ${lastOutgoingStatus === "seen" ? "seen" : ""}`}>
                        {lastOutgoingStatus === "seen"
                          ? <><span className="status-seen-icon"><i className="fa-solid fa-check"></i><i className="fa-solid fa-check"></i></span><span>Seen</span></>
                          : <><i className="fa-solid fa-check"></i><span>Delivered</span></>
                        }
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="chat-msg-row incoming">
                  <img src={getAvatar(chatUser, 32)} alt="" className="chat-msg-avatar" />
                  <div className="chat-bubble incoming" style={{ padding: "12px 16px" }}>
                    <div className="chat-typing-dots">
                      <div className="chat-typing-dot"></div>
                      <div className="chat-typing-dot"></div>
                      <div className="chat-typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Reply bar */}
        {replyingTo && (
          <div className="reply-bar">
            <div className="reply-bar-indicator" />
            <div className="reply-bar-content">
              <div className="reply-bar-name">
                <i className="fa-solid fa-reply"></i>
                Replying to {replyingTo.senderId?._id === user?._id || replyingTo.senderId === user?._id ? "yourself" : chatUser?.firstName}
              </div>
              <div className="reply-bar-text">{getReplyPreview(replyingTo)}</div>
            </div>
            {replyingTo.fileType === "image" && replyingTo.fileUrl && <img src={replyingTo.fileUrl} alt="" className="reply-bar-img" />}
            <button className="reply-bar-close" onClick={() => setReplyingTo(null)}><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          <input ref={fileInputRef} type="file" style={{ display: "none" }} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar" onChange={handleFileChange} />
          <button className="chat-attach-btn" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-solid fa-paperclip"></i>
          </button>
          <div className="chat-input-wrap">
            <input
              ref={inputRef}
              type="text"
              placeholder={replyingTo ? `Reply to ${replyingTo.senderId?._id === user?._id ? "yourself" : chatUser?.firstName}...` : hasAttachment ? "Add a caption..." : "Type a message..."}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyUp={handleKeyUp}
              autoComplete="off"
              className="chat-message-input"
            />
            <button className="chat-emoji-btn"><i className="fa-regular fa-face-smile"></i></button>
          </div>
          <button onClick={handleSend} disabled={(!message.trim() && !hasAttachment) || uploading} className="chat-send-btn">
            {uploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          </button>
        </div>

      </div>
    </>
  );
};

export default Chat;