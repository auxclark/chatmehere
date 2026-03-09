# ChatMeHere 💬

A real-time chat app migrated from PHP/MySQL to React + Node.js + MongoDB.

## Stack

| Layer | Technology | Replaces |
|---|---|---|
| Frontend | React + Vite + Tailwind | PHP HTML pages |
| Backend | Node.js + Express | PHP files |
| Real-time | Socket.io | setInterval XHR polling |
| Database | MongoDB Atlas | MySQL / XAMPP |
| Images | Cloudinary | php/images/ folder |
| Auth | JWT | PHP $_SESSION |
| Frontend host | Vercel (free) | localhost |
| Backend host | Render (free) | XAMPP |

---

## Project Structure

```
chatmehere/
├── backend/
│   ├── config/
│   │   ├── db.js              ← replaces config.php
│   │   └── cloudinary.js      ← replaces php/images/ folder
│   ├── middleware/
│   │   └── auth.js            ← replaces isset($_SESSION) checks
│   ├── models/
│   │   ├── User.js            ← replaces users table
│   │   └── Message.js         ← replaces messages table
│   ├── routes/
│   │   ├── auth.js            ← replaces login.php, signup.php, logout.php
│   │   ├── chat.js            ← replaces get-chat.php, insert-chat.php
│   │   └── users.js           ← replaces users.php, search.php, data.php
│   ├── server.js              ← main entry + Socket.io
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx ← replaces $_SESSION management
    │   ├── hooks/
    │   │   └── useSocket.js    ← replaces setInterval polling
    │   ├── components/
    │   │   └── ProtectedRoute.jsx ← replaces PHP session redirect
    │   ├── pages/
    │   │   ├── Signup.jsx      ← replaces index.php + signup.js
    │   │   ├── Login.jsx       ← replaces login.php + login.js
    │   │   ├── Users.jsx       ← replaces users.php + users.js + data.php
    │   │   └── Chat.jsx        ← replaces chat.php + chat.js
    │   ├── services/
    │   │   └── api.js          ← replaces all XHR calls
    │   ├── App.jsx             ← routing (replaces PHP page navigation)
    │   ├── main.jsx
    │   └── index.css           ← your original style.css ported
    ├── vercel.json
    └── package.json
```

---

## Local Setup

### 1. MongoDB Atlas (Free)
1. Go to https://mongodb.com/atlas → Create free account
2. Create a free cluster (M0 - 512MB free)
3. Create a database user (username + password)
4. Allow network access: IP `0.0.0.0/0` (allow all)
5. Get your connection string:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/chatmehere`

### 2. Cloudinary (Free - replaces php/images/)
1. Go to https://cloudinary.com → Create free account
2. Get your `Cloud Name`, `API Key`, `API Secret` from dashboard

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your .env values

npm install
npm run dev   # runs on http://localhost:5000
```

### 4. Frontend Setup
```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000

npm install
npm run dev   # runs on http://localhost:5173
```

---

## Deployment

### Backend → Render (Free)
1. Push `backend/` folder to a GitHub repo
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Set Build Command: `npm install`
5. Set Start Command: `npm start`
6. Add Environment Variables (from your .env):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLIENT_URL` → your Vercel URL (set after frontend deploy)
7. Deploy → you get: `https://chatmehere-api.onrender.com`

### Frontend → Vercel (Free)
1. Push `frontend/` folder to a GitHub repo
2. Go to https://vercel.com → Import Project
3. Connect your GitHub repo
4. Add Environment Variable:
   - `VITE_API_URL` = `https://chatmehere-api.onrender.com`
5. Deploy → you get: `https://chatmehere.vercel.app`

### Final step
Go back to Render → update `CLIENT_URL` = `https://chatmehere.vercel.app`

---

## Key Improvements Over PHP Version

| Old (PHP) | New (React/Node) |
|---|---|
| `md5()` passwords | `bcrypt` — industry standard |
| `$_SESSION` auth | JWT tokens — works across domains |
| XHR polling every 500ms | Socket.io real-time push |
| Images stored in server folder | Cloudinary CDN |
| SQL injection risk | Mongoose ORM (safe by default) |
| Only runs on XAMPP | Runs anywhere — Render, Railway, etc. |
