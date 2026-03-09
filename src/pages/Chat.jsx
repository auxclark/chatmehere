import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import api from "../services/api";

// Replaces: chat.php (root) + javascript/chat.js
// Key change: XHR polling every 500ms → Socket.io real-time push
const Chat = () => {
  const { userId } = useParams(); // Replaces: $_GET['user_id'] in chat.php
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chatUser, setChatUser] = useState(null);   // Replaces: SQL SELECT on chat.php header
  const [messages, setMessages] = useState([]);     // Replaces: chatBox.innerHTML
  const [message, setMessage] = useState("");       // Replaces: inputField value
  const [isTyping, setIsTyping] = useState(false);  // Bonus: typing indicator
  const [isChatboxHovered, setIsChatboxHovered] = useState(false); // Replaces: chatBox.onmouseenter/leave
  const [socket, setSocket] = useState(null);

  const chatBoxRef = useRef(null);                  // Replaces: chatBox querySelector
  const typingTimeoutRef = useRef(null);

  // Create room ID (same convention for both users — sorted so it's consistent)
  // Replaces: incoming_id hidden input in chat.php form
  const roomId = [user?._id, userId].sort().join("_");

  // Fetch the other user's details for the header
  // Replaces: SELECT * FROM users WHERE unique_id = $user_id in chat.php
  useEffect(() => {
    const fetchChatUser = async () => {
      try {
        const { data } = await api.get(`/api/users/${userId}`);
        setChatUser(data);
      } catch {
        // Replaces: header("location: users.php") if user not found
        navigate("/users");
      }
    };
    fetchChatUser();
  }, [userId, navigate]);

  // Fetch message history
  // Replaces: initial load of get-chat.php
  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/chat/${userId}`);
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket.io setup
  // Replaces: setInterval(() => xhr.open("POST", "php/get-chat.php"), 500) in chat.js
  useEffect(() => {
    if (!user) return;

    const newSocket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
    setSocket(newSocket);

    newSocket.emit("user_online", user._id);
    newSocket.emit("join_room", roomId); // Replaces: incoming_id hidden field

    // Replaces: setInterval polling — now instant push
    newSocket.on("receive_message", (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    // Bonus typing indicator
    newSocket.on("user_typing", () => setIsTyping(true));
    newSocket.on("user_stop_typing", () => setIsTyping(false));

    return () => newSocket.disconnect();
  }, [user, roomId]);

  // scrollToBottom — same logic as original chat.js
  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current && !isChatboxHovered) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [isChatboxHovered]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  // Replaces: sendBtn.onclick → xhr.open("POST", "php/insert-chat.php") in chat.js
  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      // POST to backend (saves to MongoDB)
      const { data: savedMsg } = await api.post("/api/chat/send", {
        receiverId: userId,
        message: message.trim(),
      });

      // Emit via Socket.io so receiver gets it instantly
      // Replaces: setInterval polling on receiver's side
      if (socket) {
        socket.emit("send_message", { roomId, message: savedMsg });
      }

      // Optimistically add to our own chat
      setMessages((prev) => [...prev, savedMsg]);
      setMessage(""); // Replaces: inputField.value = "" in chat.js
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  // Replaces: inputField.onkeyup → sendBtn.classList.add/remove("active")
  const handleKeyUp = (e) => {
    if (e.key === "Enter" && message.trim()) {
      handleSend();
      return;
    }

    // Typing indicator (bonus feature)
    if (socket) {
      socket.emit("typing", { roomId, userId: user._id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { roomId, userId: user._id });
      }, 1000);
    }
  };

  return (
    <div className="wrapper">
      <section className="chat-area">
        {/* Replaces: chat.php header — SELECT * FROM users WHERE unique_id = $user_id */}
        <header>
          <Link to="/users" className="back-icon">
            <i className="fas fa-arrow-left"></i>
          </Link>
          {chatUser && (
            <>
              <img
                src={chatUser.avatar || "https://via.placeholder.com/45"}
                alt={chatUser.firstName}
              />
              <div className="details">
                <span>{chatUser.firstName} {chatUser.lastName}</span>
                <p>{chatUser.status}</p>
              </div>
            </>
          )}
        </header>

        {/* Replaces: <div class="chat-box"> + chatBox.innerHTML rendering in chat.js */}
        <div
          className="chat-box"
          ref={chatBoxRef}
          // Replaces: chatBox.onmouseenter/onmouseleave in chat.js
          onMouseEnter={() => setIsChatboxHovered(true)}
          onMouseLeave={() => setIsChatboxHovered(false)}
        >
          {messages.length === 0 ? (
            // Replaces: $output .= '<div class="text">No messages...</div>'
            <div className="text">
              No messages yet. Once you send a message it will appear here.
            </div>
          ) : (
            messages.map((msg) => {
              const isOutgoing = msg.senderId?._id === user?._id ||
                                 msg.senderId === user?._id;
              return (
                <div key={msg._id} className={`chat ${isOutgoing ? "outgoing" : "incoming"}`}>
                  {/* Replaces: incoming has avatar <img src="php/images/..."> */}
                  {!isOutgoing && (
                    <img
                      src={chatUser?.avatar || "https://via.placeholder.com/35"}
                      alt=""
                    />
                  )}
                  <div className="details">
                    {/* Replaces: <p>$row['msg']</p> */}
                    <p>{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}

          {/* Bonus: typing indicator */}
          {isTyping && (
            <div className="chat incoming">
              <img src={chatUser?.avatar || "https://via.placeholder.com/35"} alt="" />
              <div className="details">
                <p className="typing-indicator">
                  <span></span><span></span><span></span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Replaces: <form class="typing-area"> in chat.php */}
        <div className="typing-area">
          {/* Replaces: <input class="incoming_id" hidden> — now in URL params */}
          <input
            type="text"
            className="input-field"
            placeholder="Type a message here..."
            autoComplete="off"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={handleKeyUp}
            autoFocus
          />
          {/* Replaces: sendBtn.onclick in chat.js */}
          <button
            className={message.trim() ? "active" : ""}
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <i className="fab fa-telegram-plane"></i>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Chat;
