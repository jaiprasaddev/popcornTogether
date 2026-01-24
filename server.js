const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ======================
// UPLOADS DIRECTORY
// ======================
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ======================
// MULTER CONFIG
// ======================
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|avi|mkv|mov|wmv|flv|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

// ======================
// MIDDLEWARES
// ======================
app.use(express.json({ limit: "5gb" }));
app.use(express.urlencoded({ extended: true, limit: "5gb" }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

// Root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================
// ROOMS STORAGE
// ======================
const rooms = {};

// ======================
// SOCKET.IO
// ======================
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // CREATE ROOM
  socket.on("create-room", ({ roomId, username }) => {
    rooms[roomId] = {
      host: socket.id,
      hostUsername: username,
      users: [{ id: socket.id, username, isHost: true }],
      videoUrl: null,
      videoState: { isPlaying: false, currentTime: 0 },
    };

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    socket.isHost = true;

    socket.emit("room-created", { roomId, isHost: true });
    console.log(`👑 Room ${roomId} created by ${username}`);
  });

  // JOIN ROOM
  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      socket.emit("room-not-found");
      return;
    }

    rooms[roomId].users.push({ id: socket.id, username, isHost: false });
    socket.join(roomId);

    socket.roomId = roomId;
    socket.username = username;
    socket.isHost = false;

    io.to(roomId).emit("user-joined", {
      username,
      users: rooms[roomId].users,
      hostId: rooms[roomId].host,
    });

    socket.emit("room-joined", {
      isHost: false,
      hostUsername: rooms[roomId].hostUsername,
    });

    if (rooms[roomId].videoUrl) {
      socket.emit("load-video", { videoUrl: rooms[roomId].videoUrl });
      socket.emit("sync-video", rooms[roomId].videoState);
    }
  });

  // VIDEO CONTROL (HOST ONLY)
  socket.on("video-control", ({ roomId, action, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (socket.id !== room.host) {
      socket.emit("control-denied", { message: "Only host can control video" });
      return;
    }

    room.videoState = {
      isPlaying: action === "play",
      currentTime,
    };

    socket.to(roomId).emit("sync-video", { action, currentTime });
  });

  // VIDEO UPLOADED
  socket.on("video-uploaded", ({ roomId, videoUrl }) => {
    if (rooms[roomId]) {
      rooms[roomId].videoUrl = videoUrl;
      socket.to(roomId).emit("video-uploaded", { videoUrl });
    }
  });

  // CHAT
  socket.on("chat-message", ({ roomId, username, message }) => {
    socket.to(roomId).emit("new-message", { username, message });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].users = rooms[roomId].users.filter(
      (u) => u.id !== socket.id
    );

    if (socket.id === rooms[roomId].host) {
      if (rooms[roomId].users.length > 0) {
        const newHost = rooms[roomId].users[0];
        rooms[roomId].host = newHost.id;
        rooms[roomId].hostUsername = newHost.username;
        newHost.isHost = true;

        io.to(roomId).emit("host-changed", {
          newHostUsername: newHost.username,
          newHostId: newHost.id,
          users: rooms[roomId].users,
        });
      } else {
        delete rooms[roomId];
      }
    } else {
      socket.to(roomId).emit("user-left", {
        username: socket.username,
        users: rooms[roomId].users,
      });
    }
  });
});

// ======================
// FILE UPLOAD ROUTE
// ======================
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    videoUrl: `/uploads/${req.file.filename}`,
  });
});

// ======================
// ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message || "Server error" });
});

// ======================
// START SERVER (RENDER)
// ======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
