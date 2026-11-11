import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

// Replaces: setInterval(() => { xhr.open("POST", "php/get-chat.php") }, 500) in chat.js
// Replaces: setInterval(() => { xhr.open("GET",  "php/users.php")    }, 500) in users.js
// Now: instant push via Socket.io — no more polling!

const useSocket = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    const instance = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
    // The socket instance is an external resource; exposing it via state lets
    // consumers subscribe as soon as it becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(instance);

    // Tell server this user is online (replaces: status = "Active now" on every page load)
    instance.emit("user_online", user._id);

    return () => {
      instance.disconnect();
      setSocket((current) => (current === instance ? null : current));
    };
  }, [user]);

  return socket;
};

export default useSocket;
