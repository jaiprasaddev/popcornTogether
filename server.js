require("dotenv").config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const os = require('os');

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

/* =========================
   R2 CLIENT SETUP
========================= */
const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

/* =========================
   MULTER (MEMORY STORAGE)
========================= */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB
});

/* =========================
   EXPRESS CONFIG
========================= */
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ limit: '5gb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =========================
   ROOM SYSTEM
========================= */
const rooms = new Map();

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

/* =========================
   SOCKET.IO (UNCHANGED LOGIC)
========================= */
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id, '| IP:', socket.handshake.address);

    socket.on('create-room', (data) => {
        let roomId, username;

        if (typeof data === 'string') {
            username = data;
            roomId = generateRoomId();
        } else if (typeof data === 'object' && data.username) {
            username = data.username;
            roomId = data.roomId || generateRoomId();
        } else {
            socket.emit('room-error', 'Invalid room creation data');
            return;
        }

        rooms.set(roomId, {
            masterId: socket.id,
            masterUsername: username,
            users: [{ id: socket.id, username }],
            videoUrl: '',
            currentTime: 0,
            isPlaying: false,
            videoType: null
        });

        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;

        socket.emit('room-created', {
            roomId,
            username,
            isHost: true,
            isMaster: true,
            masterId: socket.id
        });

        io.to(roomId).emit('user-list-update', {
            users: rooms.get(roomId).users,
            masterId: socket.id
        });
    });

    socket.on('join-room', ({ roomId, username }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('room-not-found');
            return;
        }

        room.users.push({ id: socket.id, username });

        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;

        socket.emit('room-joined', {
            roomId,
            username,
            videoUrl: room.videoUrl,
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
            isMaster: socket.id === room.masterId,
            masterId: room.masterId,
            isHost: socket.id === room.masterId,
            hostUsername: room.masterUsername
        });

        io.to(roomId).emit('user-list-update', {
            users: room.users,
            masterId: room.masterId
        });
    });

    socket.on('video-uploaded', ({ roomId, username, videoUrl }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.videoUrl = videoUrl;
            room.videoType = 'upload';
            socket.to(roomId).emit('video-uploaded', { username, videoUrl });
        }
    });

    socket.on('upload-progress', ({ roomId, username, progress, speed, eta, filename }) => {
        const room = rooms.get(roomId);
        if (room) {
            socket.to(roomId).emit('upload-progress', {
                username, progress, speed, eta, filename
            });
        }
    });

    socket.on('video-control', ({ roomId, action, currentTime }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.isPlaying = action === 'play';
            room.currentTime = currentTime;
            socket.to(roomId).emit('sync-video', { action, currentTime });
        }
    });

    socket.on('chat-message', (messageData) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const message = typeof messageData === 'string'
            ? messageData
            : messageData.message;

        io.to(roomId).emit('chat-message', {
            username: socket.username,
            message,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        if (!room) return;

        const wasMaster = socket.id === room.masterId;
        room.users = room.users.filter(u => u.id !== socket.id);

        if (room.users.length === 0) {
            rooms.delete(roomId);
        } else if (wasMaster) {
            room.masterId = room.users[0].id;
            room.masterUsername = room.users[0].username;
        }

        io.to(roomId).emit('user-list-update', {
            users: room.users,
            masterId: room.masterId
        });
    });
});

/* =========================
   R2 UPLOAD ENDPOINT
========================= */
app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const key = `uploads/${Date.now()}-${req.file.originalname}`;

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        const videoUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;

        console.log(`☁️ Uploaded to R2 → ${videoUrl}`);

        res.json({
            success: true,
            videoUrl,
            filename: req.file.originalname,
            size: req.file.size
        });

    } catch (err) {
        console.error('❌ R2 upload failed:', err);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});

/* =========================
   ERROR + START
========================= */
const PORT = process.env.PORT || 3000;
const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🎬 Watch Together Server Running');
    console.log(`🌐 Local:   http://localhost:${PORT}`);
    console.log(`📱 Network: http://${localIP}:${PORT}`);
    console.log('');
});
