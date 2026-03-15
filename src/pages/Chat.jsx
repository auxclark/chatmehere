import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import api from "../services/api";

const Chat = ({ inlineUserId, inlineChatUser, onBack }) => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = inlineUserId || params.userId;

  const [chatUser, setChatUser] = useState(inlineChatUser || null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);

  const chatBoxRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null); // track socket to avoid duplicates

  const roomId = [user?._id, userId].sort().join("_");

  // Fetch chat user info
  useEffect(() => {
    if (inlineChatUser) { setChatUser(inlineChatUser); return; }
    const fetchChatUser = async () => {
      try {
        const { data } = await api.get(`/api/users/${userId}`);
        setChatUser(data);
      } catch { if (!inlineUserId) navigate("/users"); }
    };
    fetchChatUser();
  }, [userId, inlineChatUser, inlineUserId, navigate]);

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/chat/${userId}`);
      setMessages(data);
    } catch (err) { console.error("Failed to fetch messages", err); }
  }, [userId]);

  // Reset + fetch when switching users
  useEffect(() => {
    setMessages([]);
    setMessage("");
    fetchMessages();
  }, [userId, fetchMessages]);

  // Socket.io setup — only one socket per userId
  useEffect(() => {
    if (!user) return;

    // Disconnect previous socket before creating new one
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const s = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
    socketRef.current = s;
    setSocket(s);

    s.emit("user_online", user._id);
    s.emit("join_room", roomId);

    // Mark messages as seen when chat is opened
    s.emit("mark_seen", { roomId, userId: user._id });

    // Receive message from OTHER user only
    // We do NOT add our own sent message here — we add it in handleSend
    s.on("receive_message", (newMsg) => {
      const senderId = newMsg.senderId?._id || newMsg.senderId;
      // Only add if the message is FROM the other user, not from ourselves
      if (senderId !== user._id) {
        setMessages(prev => {
          // Prevent duplicate by checking _id
          const exists = prev.some(m => m._id === newMsg._id);
          if (exists) return prev;
          return [...prev, newMsg];
        });
        // Mark as seen immediately since we're in the chat
        s.emit("mark_seen", { roomId, userId: user._id });
      }
    });

    // Update message status to "seen"
    s.on("messages_seen", ({ by }) => {
      if (by !== user._id) {
        setMessages(prev =>
          prev.map(m => ({ ...m, status: "seen" }))
        );
      }
    });

    // Update message status to "delivered"
    s.on("message_delivered", ({ messageId }) => {
      setMessages(prev =>
        prev.map(m => m._id === messageId ? { ...m, status: "delivered" } : m)
      );
    });

    s.on("user_typing", () => setIsTyping(true));
    s.on("user_stop_typing", () => setIsTyping(false));

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user, roomId]);

  // Mark messages seen when chat window is focused
  useEffect(() => {
    const handleFocus = () => {
      if (socketRef.current) {
        socketRef.current.emit("mark_seen", { roomId, userId: user._id });
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [roomId, user]);

  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current)
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, [userId]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const msgText = message.trim();
    setMessage(""); // clear input immediately for better UX

    try {
      const { data: savedMsg } = await api.post("/api/chat/send", {
        receiverId: userId,
        message: msgText,
      });

      // Add our own message ONLY from the API response (single source of truth)
      // Do NOT also add from socket — that would cause duplicates
      setMessages(prev => {
        const exists = prev.some(m => m._id === savedMsg._id);
        if (exists) return prev;
        return [...prev, { ...savedMsg, status: "delivered" }];
      });

      // Emit to socket so the OTHER user sees it — we don't listen to this ourselves
      if (socketRef.current) {
        socketRef.current.emit("send_message", { roomId, message: savedMsg });
      }

      scrollToBottom();
    } catch (err) {
      console.error("Failed to send message", err);
      setMessage(msgText); // restore message if send failed
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === "Enter" && message.trim()) { handleSend(); return; }
    if (socketRef.current) {
      socketRef.current.emit("typing", { roomId, userId: user._id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("stop_typing", { roomId, userId: user._id });
      }, 1000);
    }
  };

  const handleBack = () => { if (onBack) onBack(); else navigate("/users"); };
  const isOnline = chatUser?.status === "Active now";
  const getAvatar = (u, size = 40) =>
    u?.avatar || `https://ui-avatars.com/api/?name=${u?.firstName}+${u?.lastName}&background=3A6186&color=fff&size=${size}`;

  // Get the status of the last outgoing message
  const lastOutgoingMsg = [...messages].reverse().find(m => {
    const sid = m.senderId?._id || m.senderId;
    return sid === user?._id;
  });
  const lastOutgoingStatus = lastOutgoingMsg?.status || "delivered";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .chat-panel {
          display: flex; flex-direction: column;
          height: 100vh; width: 100%;
          background: #f8fafc; overflow: hidden;
          font-family: 'Poppins', sans-serif;
        }

        /* ── HEADER ── */
        .chat-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 28px;
          background: #fff; border-bottom: 1px solid #e8edf2;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); flex-shrink: 0;
        }
        .chat-header-left { display: flex; align-items: center; gap: 14px; }
        .chat-back-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: none; background: #f0f4f8; color: #4a5568;
          font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s; flex-shrink: 0;
        }
        .chat-back-btn:hover { background: #e2e8f0; }
        .chat-header-user { display: flex; align-items: center; gap: 14px; }
        .chat-header-avatar-wrap { position: relative; }
        .chat-header-avatar {
          width: 46px; height: 46px; border-radius: 50%;
          object-fit: cover; border: 2px solid #e8edf2;
        }
        .chat-header-status-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff;
        }
        .chat-header-name { font-size: 16px; font-weight: 600; color: #2d3748; }
        .chat-header-online {
          font-size: 12px; color: #718096;
          display: flex; align-items: center; gap: 5px; margin-top: 2px;
        }
        .chat-header-online i { font-size: 8px; }
        .chat-header-actions { display: flex; gap: 8px; }
        .chat-action-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: none; background: #f0f4f8; color: #718096;
          font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .chat-action-btn:hover { background: #e8edf2; color: #89253E; }

        /* ── MESSAGES ── */
        .chat-messages-area {
          flex: 1; overflow-y: auto;
          padding: 24px 28px 16px;
          display: flex; flex-direction: column; gap: 0;
        }
        .chat-messages-area::-webkit-scrollbar { width: 4px; }
        .chat-messages-area::-webkit-scrollbar-track { background: transparent; }
        .chat-messages-area::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .chat-no-messages {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 60px 20px;
          animation: chatFadeUp 0.5s ease forwards;
        }
        .chat-no-messages-icon {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(137,37,62,0.08), rgba(58,97,134,0.08));
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .chat-no-messages-icon i {
          font-size: 32px;
          background: linear-gradient(135deg, #89253E, #3A6186);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .chat-no-messages p { font-size: 15px; color: #a0aec0; font-weight: 500; }

        /* Message rows */
        .chat-msg-group { margin-bottom: 8px; }
        .chat-msg-row {
          display: flex; align-items: flex-end; gap: 8px;
          margin-bottom: 2px;
        }
        .chat-msg-row.outgoing { justify-content: flex-end; }
        .chat-msg-row.incoming { justify-content: flex-start; }
        .chat-msg-avatar-space { width: 32px; flex-shrink: 0; }
        .chat-msg-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }

        .chat-bubble {
          max-width: 55%; padding: 11px 16px; border-radius: 18px;
          word-break: break-word;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          line-height: 1.55; font-size: 14px;
        }
        .chat-bubble.outgoing {
          background: linear-gradient(135deg, #89253E, #3A6186);
          color: #fff; border-bottom-right-radius: 4px;
        }
        .chat-bubble.incoming {
          background: #fff; color: #2d3748;
          border-bottom-left-radius: 4px; border: 1px solid #e8edf2;
        }

        /* ── MESSAGE STATUS (Delivered / Seen) ── */
        .chat-msg-status {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 4px; margin-top: 3px; margin-right: 4px;
          font-size: 11px; color: #a0aec0;
        }
        .chat-msg-status.seen { color: #3A6186; }
        .chat-msg-status i { font-size: 11px; }
        /* Double check for seen */
        .status-seen-icon { position: relative; display: inline-flex; }
        .status-seen-icon .fa-check:last-child { margin-left: -5px; }

        /* Typing indicator */
        .chat-typing-dots { display: flex; gap: 4px; align-items: center; padding: 2px 0; }
        .chat-typing-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #a0aec0;
          animation: chatBounce 1.2s ease-in-out infinite;
        }
        .chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        /* ── INPUT ── */
        .chat-input-area {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 28px;
          background: #fff; border-top: 1px solid #e8edf2; flex-shrink: 0;
        }
        .chat-attach-btn {
          width: 42px; height: 42px; border-radius: 50%;
          border: none; background: #f0f4f8; color: #a0aec0;
          font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.2s, color 0.2s;
        }
        .chat-attach-btn:hover { background: #e2e8f0; color: #89253E; }
        .chat-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
        .chat-message-input {
          width: 100%; height: 48px; padding: 0 50px 0 20px;
          border-radius: 24px; border: 2px solid #e2e8f0;
          font-size: 14px; outline: none;
          background: #f8fafc; color: #2d3748;
          font-family: 'Poppins', sans-serif;
          transition: border-color 0.2s, background 0.2s;
        }
        .chat-message-input:focus { border-color: #89253E; background: #fff; }
        .chat-emoji-btn {
          position: absolute; right: 14px;
          background: none; border: none;
          color: #a0aec0; font-size: 18px; cursor: pointer; transition: color 0.2s;
        }
        .chat-emoji-btn:hover { color: #89253E; }
        .chat-send-btn {
          width: 48px; height: 48px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, #89253E, #3A6186);
          color: #fff; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 3px 12px rgba(137,37,62,0.35);
        }
        .chat-send-btn:hover:not(:disabled) { transform: scale(1.07); }
        .chat-send-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes chatFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .chat-header { padding: 12px 16px; }
          .chat-messages-area { padding: 16px 14px 10px; }
          .chat-bubble { max-width: 78%; font-size: 13px; }
          .chat-input-area { padding: 12px 14px; gap: 8px; }
          .chat-action-btn:not(:last-child) { display: none; }
        }
      `}</style>

      <div className="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button className="chat-back-btn" onClick={handleBack} title="Back">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            {chatUser && (
              <div className="chat-header-user">
                <div className="chat-header-avatar-wrap">
                  <img src={getAvatar(chatUser, 46)} alt={chatUser.firstName} className="chat-header-avatar" />
                  <div className="chat-header-status-dot" style={{ background: isOnline ? '#48bb78' : '#cbd5e0' }} />
                </div>
                <div>
                  <div className="chat-header-name">{chatUser.firstName} {chatUser.lastName}</div>
                  <div className="chat-header-online">
                    <i className="fa-solid fa-circle" style={{ color: isOnline ? '#48bb78' : '#cbd5e0' }}></i>
                    {isOnline ? 'Active now' : 'Offline'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="chat-header-actions">
            <button className="chat-action-btn" title="Voice call"><i className="fa-solid fa-phone"></i></button>
            <button className="chat-action-btn" title="Video call"><i className="fa-solid fa-video"></i></button>
            <button className="chat-action-btn" title="More options"><i className="fa-solid fa-ellipsis-vertical"></i></button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages-area" ref={chatBoxRef}>
          {messages.length === 0 ? (
            <div className="chat-no-messages">
              <div className="chat-no-messages-icon">
                <i className="fa-solid fa-comment-dots"></i>
              </div>
              <p>No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isOutgoing = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                const prevMsg = messages[idx - 1];
                const prevSender = prevMsg?.senderId?._id || prevMsg?.senderId;
                const currSender = msg.senderId?._id || msg.senderId;
                const showAvatar = !isOutgoing && prevSender !== currSender;

                // Show status only on the LAST outgoing message
                const isLastOutgoing = isOutgoing && msg._id === lastOutgoingMsg?._id;

                return (
                  <div key={msg._id}>
                    <div className={`chat-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                      {!isOutgoing && (
                        showAvatar
                          ? <img src={getAvatar(chatUser, 32)} alt="" className="chat-msg-avatar" />
                          : <div className="chat-msg-avatar-space" />
                      )}
                      <div className={`chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                        {msg.message}
                      </div>
                    </div>

                    {/* Delivered / Seen indicator — only under last outgoing msg */}
                    {isLastOutgoing && (
                      <div className={`chat-msg-status ${lastOutgoingStatus === 'seen' ? 'seen' : ''}`}>
                        {lastOutgoingStatus === 'seen' ? (
                          <>
                            {/* Double blue check = Seen */}
                            <span className="status-seen-icon">
                              <i className="fa-solid fa-check"></i>
                              <i className="fa-solid fa-check"></i>
                            </span>
                            <span>Seen</span>
                          </>
                        ) : (
                          <>
                            {/* Single grey check = Delivered */}
                            <i className="fa-solid fa-check"></i>
                            <span>Delivered</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="chat-msg-row incoming">
                  <img src={getAvatar(chatUser, 32)} alt="" className="chat-msg-avatar" />
                  <div className="chat-bubble incoming" style={{ padding: '12px 16px' }}>
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

        {/* Input */}
        <div className="chat-input-area">
          <button className="chat-attach-btn" title="Attach"><i className="fa-solid fa-paperclip"></i></button>
          <div className="chat-input-wrap">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyUp={handleKeyUp}
              autoComplete="off"
              className="chat-message-input"
            />
            <button className="chat-emoji-btn" title="Emoji">
              <i className="fa-regular fa-face-smile"></i>
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="chat-send-btn"
            title="Send"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </>
  );
};

export default Chat;