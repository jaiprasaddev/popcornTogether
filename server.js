const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// ================== BASIC SETUP ==================
app.use(express.json({ limit: "5gb" }));
app.use(express.urlencoded({ limit: "5gb", extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// ================== FILE UPLOAD ==================
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ================== ROOM STORE ==================
const rooms = {}; // { roomId: {...} }

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ================== SOCKET ==================
io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  // ---------- CREATE ROOM (UPLOAD / YOUTUBE) ----------
  socket.on("create-room", ({ username, roomType }) => {
    const roomId = generateRoomId();

    rooms[roomId] = {
      roomId,
      roomType, // "upload" | "youtube"
      hostId: socket.id,
      hostUsername: username,
      users: [{ id: socket.id, username, isHost: true }],
      videoUrl: null,
      videoId: null,
      videoState: { isPlaying: false, currentTime: 0 },
    };

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    console.log(`🎬 Room ${roomId} created (${roomType}) by ${username}`);
    socket.emit("room-created", { roomId });
  });

  // ---------- JOIN ROOM ----------
  socket.on("join-room", ({ roomId, username }) => {
    const room = rooms[roomId];

    if (!room) {
      console.log("❌ Room not found:", roomId);
      socket.emit("room-not-found");
      return;
    }

    room.users.push({ id: socket.id, username, isHost: false });
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    socket.emit("room-joined", {
      roomId,
      roomType: room.roomType,
      videoUrl: room.videoUrl,
      videoId: room.videoId,
      videoState: room.videoState,
      hostId: room.hostId,
      users: room.users,
    });

    socket.to(roomId).emit("user-joined", {
      username,
      users: room.users,
    });

    console.log(`👤 ${username} joined ${roomId}`);
  });

  // ---------- VIDEO CONTROL (HOST ONLY) ----------
  socket.on("video-control", ({ action, currentTime }) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.hostId) return;

    room.videoState = {
      isPlaying: action === "play",
      currentTime,
    };

    socket.to(socket.roomId).emit("sync-video", { action, currentTime });
  });

  // ---------- UPLOAD VIDEO ----------
  socket.on("video-uploaded", ({ videoUrl }) => {
    const room = rooms[socket.roomId];
    if (!room) return;

    room.videoUrl = videoUrl;
    socket.to(socket.roomId).emit("video-uploaded", { videoUrl });
  });

  // ---------- YOUTUBE VIDEO ----------
  socket.on("youtube-video", ({ videoId }) => {
    const room = rooms[socket.roomId];
    if (!room) return;

    room.videoId = videoId;
    socket.to(socket.roomId).emit("youtube-video", { videoId });
  });

  // ---------- CHAT ----------
  socket.on("chat-message", ({ message }) => {
    socket.to(socket.roomId).emit("chat-message", {
      username: socket.username,
      message,
    });
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    const room = rooms[socket.roomId];
    if (!room) return;

    room.users = room.users.filter((u) => u.id !== socket.id);

    if (socket.id === room.hostId) {
      if (room.users.length === 0) {
        delete rooms[socket.roomId];
        console.log("🗑️ Room deleted:", socket.roomId);
      } else {
        const newHost = room.users[0];
        room.hostId = newHost.id;
        newHost.isHost = true;
        io.to(socket.roomId).emit("host-changed", {
          hostId: newHost.id,
          hostUsername: newHost.username,
        });
      }
    } else {
      io.to(socket.roomId).emit("user-left", {
        username: socket.username,
        users: room.users,
      });
    }
  });
});

// ================== UPLOAD ENDPOINT ==================
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ videoUrl: `/uploads/${req.file.filename}` });
});

// ================== START ==================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
