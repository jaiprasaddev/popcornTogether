const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Configure file upload - Accept ALL file types
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB limit
});

// Increase payload limits for large files
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ limit: '5gb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Explicitly serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store room data
const rooms = new Map();

// Generate room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get local IP address
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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id, '| IP:', socket.handshake.address);

    // Create room
    socket.on('create-room', (username) => {
        const roomId = generateRoomId();
        rooms.set(roomId, {
            masterId: socket.id,
            masterUsername: username,
            users: [{ id: socket.id, username: username, isMaster: true }],
            videoUrl: '',
            videoType: null, // 'youtube' or 'upload'
            currentTime: 0,
            isPlaying: false
        });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;
        socket.emit('room-created', { roomId, username, isMaster: true });
        console.log(`🚀 Room ${roomId} created by ${username} (Master)`);
    });

    // Join room
    socket.on('join-room', (data) => {
        const { roomId, username } = data;
        const room = rooms.get(roomId);
        if (!room) {
            console.log(`❌ Room ${roomId} not found for ${username}`);
            socket.emit('room-error', 'Room not found');
            socket.emit('room-not-found');
            return;
        }
        
        const isMaster = (socket.id === room.masterId);
        room.users.push({ id: socket.id, username: username, isMaster: isMaster });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;
        
        socket.emit('room-joined', {
            roomId,
            username,
            videoUrl: room.videoUrl,
            videoType: room.videoType,
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
            isMaster: isMaster,
            masterId: room.masterId,
            masterUsername: room.masterUsername
        });
        
        console.log(`🚪 ${username} joined room ${roomId} (${isMaster ? 'Master' : 'Viewer'})`);
        
        // Notify all users in room
        io.to(roomId).emit('user-list-update', {
            users: room.users,
            masterId: room.masterId
        });
        
        io.to(roomId).emit('user-joined', { 
            username, 
            users: room.users,
            hostId: room.masterId
        });
        
        io.to(roomId).emit('chat-message', {
            username: 'System',
            message: `${username} joined the room`,
            timestamp: new Date().toLocaleTimeString()
        });

        // Send current video state to new user if video exists
        if (room.videoUrl) {
            socket.emit('load-video', { 
                videoUrl: room.videoUrl, 
                videoType: room.videoType 
            });
            socket.emit('sync-video', { 
                action: room.isPlaying ? 'play' : 'pause', 
                currentTime: room.currentTime 
            });
        }
    });

    // YouTube video change
    socket.on('video-change', (videoUrl) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.videoUrl = videoUrl;
            room.videoType = 'youtube';
            room.currentTime = 0;
            room.isPlaying = false;
            io.to(roomId).emit('video-changed', {
                videoUrl: videoUrl,
                videoType: 'youtube',
                username: socket.username
            });
            io.to(roomId).emit('load-video', { 
                videoUrl: videoUrl, 
                videoType: 'youtube' 
            });
            console.log(`🎥 YouTube video changed in room ${roomId} by ${socket.username}`);
        } else if (room && socket.id !== room.masterId) {
            socket.emit('control-denied', { message: 'Only the master can change the video' });
            console.log(`⚠️ Non-master ${socket.username} tried to change video in room ${roomId}`);
        }
    });

    // File uploaded
    socket.on('video-uploaded', ({ roomId, username, videoUrl }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.videoUrl = videoUrl;
            room.videoType = 'upload';
            room.currentTime = 0;
            room.isPlaying = false;
            socket.to(roomId).emit('video-uploaded', { username, videoUrl });
            io.to(roomId).emit('load-video', { 
                videoUrl: videoUrl, 
                videoType: 'upload' 
            });
            console.log(`📤 File uploaded in room ${roomId} by ${username}`);
        } else if (room && socket.id !== room.masterId) {
            socket.emit('control-denied', { message: 'Only the master can upload files' });
        }
    });

    // Upload progress - broadcast to other users in room
    socket.on('upload-progress', ({ roomId, username, progress, speed, eta, filename }) => {
        const room = rooms.get(roomId);
        if (room) {
            socket.to(roomId).emit('upload-progress', { 
                username, 
                progress, 
                speed, 
                eta, 
                filename 
            });
            
            if (progress % 10 === 0) { // Log every 10%
                console.log(`📊 [${roomId}] ${username} upload: ${progress}% (${speed})`);
            }
        }
    });

    // Play (Master only)
    socket.on('play', (currentTime) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.isPlaying = true;
            room.currentTime = currentTime;
            console.log(`▶️ Master played video at ${currentTime} in room ${roomId}`);
            socket.to(roomId).emit('play', currentTime);
            socket.to(roomId).emit('sync-video', { action: 'play', currentTime });
        } else if (room && socket.id !== room.masterId) {
            socket.emit('control-denied', { message: 'Only the master can control playback' });
            console.log(`⚠️ Non-master ${socket.username} tried to play in room ${roomId}`);
        }
    });

    // Pause (Master only)
    socket.on('pause', (currentTime) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.isPlaying = false;
            room.currentTime = currentTime;
            console.log(`⏸️ Master paused video at ${currentTime} in room ${roomId}`);
            socket.to(roomId).emit('pause', currentTime);
            socket.to(roomId).emit('sync-video', { action: 'pause', currentTime });
        } else if (room && socket.id !== room.masterId) {
            socket.emit('control-denied', { message: 'Only the master can control playback' });
            console.log(`⚠️ Non-master ${socket.username} tried to pause in room ${roomId}`);
        }
    });

    // Seek (Master only)
    socket.on('seek', (currentTime) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.currentTime = currentTime;
            console.log(`⏩ Master seeked to ${currentTime} in room ${roomId}`);
            socket.to(roomId).emit('seek', currentTime);
            socket.to(roomId).emit('sync-video', { action: 'seek', currentTime });
        } else if (room && socket.id !== room.masterId) {
            socket.emit('control-denied', { message: 'Only the master can control playback' });
            console.log(`⚠️ Non-master ${socket.username} tried to seek in room ${roomId}`);
        }
    });

    // Video control (unified control for both types)
    socket.on('video-control', ({ roomId, action, currentTime }) => {
        const room = rooms.get(roomId);
        if (room && socket.id === room.masterId) {
            room.isPlaying = (action === 'play');
            room.currentTime = currentTime;
            
            socket.to(roomId).emit('sync-video', { action, currentTime });
            console.log(`🎮 ${socket.username} (Master) ${action}ed video at ${currentTime}s in room ${roomId}`);
        } else if (room && socket.id !== room.masterId) {
            socket.emit('control-denied', { message: 'Only the master can control the video' });
            console.log(`⛔ ${socket.username} tried to control video but is not master`);
        }
    });

    // Chat message
    socket.on('chat-message', (message) => {
        const roomId = socket.roomId;
        if (roomId) {
            const chatData = {
                username: socket.username,
                message: message,
                timestamp: new Date().toLocaleTimeString()
            };
            io.to(roomId).emit('chat-message', chatData);
            io.to(roomId).emit('new-message', chatData);
            console.log(`💬 [${roomId}] ${socket.username}: ${message}`);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        if (room) {
            const wasMaster = (socket.id === room.masterId);
            
            room.users = room.users.filter(user => user.id !== socket.id);
            
            console.log(`👋 ${socket.username} disconnected from room ${roomId}`);
            
            if (room.users.length === 0) {
                rooms.delete(roomId);
                console.log(`🗑️ Room ${roomId} deleted (empty)`);
            } else {
                // If master left, assign new master
                if (wasMaster) {
                    const newMaster = room.users[0];
                    room.masterId = newMaster.id;
                    room.masterUsername = newMaster.username;
                    newMaster.isMaster = true;
                    
                    io.to(roomId).emit('master-changed', {
                        masterId: newMaster.id,
                        masterUsername: newMaster.username
                    });
                    
                    io.to(roomId).emit('host-changed', { 
                        newHostUsername: newMaster.username,
                        newHostId: newMaster.id,
                        users: room.users
                    });
                    
                    console.log(`👑 New master in room ${roomId}: ${newMaster.username}`);
                }
                
                io.to(roomId).emit('user-list-update', {
                    users: room.users,
                    masterId: room.masterId
                });
                
                io.to(roomId).emit('user-left', { 
                    username: socket.username, 
                    users: room.users 
                });
                
                io.to(roomId).emit('chat-message', {
                    username: 'System',
                    message: `${socket.username} left the room`,
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        }
        console.log('❌ User disconnected:', socket.id);
    });
});

// File upload endpoint with comprehensive error handling
app.post('/upload', (req, res) => {
    upload.single('video')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('❌ Multer error:', err.message);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false,
                    error: 'File too large. Maximum size is 5GB.' 
                });
            }
            return res.status(400).json({ 
                success: false,
                error: `Upload error: ${err.message}` 
            });
        } else if (err) {
            console.error('❌ Upload error:', err);
            return res.status(400).json({ 
                success: false,
                error: err.message || 'Unknown upload error' 
            });
        }
        
        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }
        
        try {
            const videoUrl = `/uploads/${req.file.filename}`;
            const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
            
            console.log(`✅ File uploaded successfully:`);
            console.log(`   📄 Name: ${req.file.originalname}`);
            console.log(`   💾 Size: ${fileSizeMB} MB`);
            console.log(`   🔗 URL: ${videoUrl}`);
            
            res.status(200).json({ 
                success: true,
                videoUrl: videoUrl,
                filename: req.file.originalname,
                size: req.file.size
            });
        } catch (error) {
            console.error('❌ Error processing upload:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to process uploaded file' 
            });
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.message);
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).json({ 
        success: false,
        error: err.message || 'Something went wrong!' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found' 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   🎬 Watch Together Server (YouTube + Upload)    ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log('📍 Access from this device:');
    console.log(`   http://localhost:${PORT}`);
    console.log('');
    console.log('📱 Access from other devices on same network:');
    console.log(`   http://${localIP}:${PORT}`);
    console.log('');
    console.log('✨ Features:');
    console.log('   ✅ YouTube URL syncing');
    console.log('   ✅ Local file upload & sync (up to 5GB)');
    console.log('   ✅ Master control (only host can control playback)');
    console.log('   ✅ Real-time chat');
    console.log('   ✅ Upload progress tracking');
    console.log('   ✅ All file types accepted');
    console.log('');
    console.log('💡 Make sure all devices are on the same WiFi network!');
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('');
});