import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import api from "../services/api";

// Replaces: users.php (root) + javascript/users.js + php/data.php (user list rendering)
const Users = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");       // Replaces: searchBar value
  const [showSearch, setShowSearch] = useState(false);    // Replaces: searchBar.classList.toggle("show")
  const [isSearchActive, setIsSearchActive] = useState(false); // Replaces: searchBar.classList "active"
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Replaces: setInterval(() => xhr.open("GET", "php/users.php"), 500)
  // Now: fetch once on mount + update via Socket.io events
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Replaces: setInterval polling for online status in users.js
  // Socket.io pushes online status instantly
  useEffect(() => {
    if (!socket) return;

    socket.on("online_users", (ids) => {
      setOnlineUsers(ids);
      // Refresh user list to show updated statuses
      fetchUsers();
    });

    return () => socket.off("online_users");
  }, [socket, fetchUsers]);

  // Replaces: searchBar.onkeyup → xhr.open("POST", "php/search.php")
  useEffect(() => {
    if (searchTerm.trim() === "") {
      fetchUsers();
      setIsSearchActive(false);
      return;
    }
    setIsSearchActive(true);

    const delay = setTimeout(async () => {
      try {
        // Replaces: xhr.send("searchTerm=" + searchTerm) to search.php
        const { data } = await api.get(`/api/users/search?q=${searchTerm}`);
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 300); // debounce — better than firing on every keyup like original

    return () => clearTimeout(delay);
  }, [searchTerm, fetchUsers]);

  // Replaces: searchIcon.onclick toggle in users.js
  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm("");
      setIsSearchActive(false);
    }
  };

  // Replaces: href="php/logout.php?logout_id=..." in users.php
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Replaces: ($row['status'] == "Offline now") ? $offline = "offline" : $offline = ""
  const isOnline = (userId) => onlineUsers.includes(userId.toString());

  return (
    <div className="wrapper">
      <section className="users">
        {/* Replaces: users.php header with current user's img, name, status, logout link */}
        <header>
          <div className="content">
            <img src={user?.avatar || "https://via.placeholder.com/50"} alt={user?.firstName} />
            <div className="details">
              <span>{user?.firstName} {user?.lastName}</span>
              <p>{user?.status}</p>
            </div>
          </div>
          {/* Replaces: <a href="php/logout.php?logout_id=..."> */}
          <button className="logout" onClick={handleLogout}>Logout</button>
        </header>

        {/* Replaces: .search div in users.php + toggle logic in users.js */}
        <div className="search">
          <span className="text">Select a user to start chat</span>
          <input
            type="text"
            placeholder="Enter name to search..."
            className={showSearch ? "show" : ""}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Replaces: searchIcon.onclick in users.js */}
          <button
            className={showSearch ? "active" : ""}
            onClick={handleSearchToggle}
          >
            <i className={`fas ${showSearch ? "fa-times" : "fa-search"}`}></i>
          </button>
        </div>

        {/* Replaces: usersList.innerHTML = data (HTML from users.php/data.php) */}
        <div className="users-list">
          {users.length === 0 ? (
            <p style={{ textAlign: "center", color: "#67676a", padding: "20px 0" }}>
              {isSearchActive ? "No user found related to your search term" : "No users are available to chat"}
            </p>
          ) : (
            users.map((u) => (
              // Replaces: <a href="chat.php?user_id=..."> in data.php
              <Link key={u._id} to={`/chat/${u._id}`}>
                <div className="content">
                  {/* Replaces: <img src="php/images/<?php echo $row['img'] ?>"> */}
                  <img src={u.avatar || "https://via.placeholder.com/40"} alt={u.firstName} />
                  <div className="details">
                    {/* Replaces: $row['fname']." ".$row['lname'] */}
                    <span>{u.firstName} {u.lastName}</span>
                    {/* Replaces: data.php last message preview with "You: " prefix */}
                    <p>{u.lastMessageIsYours ? "You: " : ""}{u.lastMessage}</p>
                  </div>
                </div>
                {/* Replaces: <div class="status-dot <?php echo $offline ?>"> in data.php */}
                <div className={`status-dot ${isOnline(u._id) ? "" : "offline"}`}>
                  <i className="fas fa-circle"></i>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Users;
