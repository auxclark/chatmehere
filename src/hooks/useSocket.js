import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

// Replaces: setInterval(() => { xhr.open("POST", "php/get-chat.php") }, 500) in chat.js
// Replaces: setInterval(() => { xhr.open("GET",  "php/users.php")    }, 500) in users.js
// Now: instant push via Socket.io — no more polling!

const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

    // Tell server this user is online (replaces: status = "Active now" on every page load)
    socketRef.current.emit("user_online", user._id);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  return socketRef.current;
};

export default useSocket;
