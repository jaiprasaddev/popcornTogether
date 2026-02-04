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

// Store room data - Using Map for better performance
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
    console.log(`   📊 Current active rooms: ${rooms.size}`);
    if (rooms.size > 0) {
        console.log(`   🚪 Room IDs: ${Array.from(rooms.keys()).join(', ')}`);
    }

    // Create room (works for both YouTube and Upload modes)
    socket.on('create-room', (data) => {
        // Handle both formats: string username (YouTube) or object {roomId, username} (Upload)
        let roomId, username;
        
        if (typeof data === 'string') {
            // YouTube format: just username string
            username = data;
            roomId = generateRoomId();
        } else if (typeof data === 'object' && data.username) {
            // Upload format: object with roomId and username
            username = data.username;
            roomId = data.roomId || generateRoomId();
        } else {
            console.error('❌ Invalid create-room data format:', data);
            socket.emit('room-error', 'Invalid room creation data');
            return;
        }
        
        // Check if room already exists (shouldn't happen, but be safe)
        if (rooms.has(roomId)) {
            console.log(`⚠️ Room ${roomId} already exists, generating new ID`);
            roomId = generateRoomId();
        }
        
        rooms.set(roomId, {
            masterId: socket.id,
            masterUsername: username,
            users: [{ id: socket.id, username: username }],
            videoUrl: '',
            currentTime: 0,
            isPlaying: false,
            videoType: null // 'youtube' or 'upload'
        });
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;
        
        console.log(`🚀 Room ${roomId} created by ${username} (Master)`);
        
        // Emit room-created event with all necessary data for both modes
        socket.emit('room-created', { 
            roomId, 
            username,
            isHost: true,
            isMaster: true,
            masterId: socket.id
        });
        
        // Update user list immediately
        io.to(roomId).emit('user-list-update', {
            users: rooms.get(roomId).users,
            masterId: socket.id
        });
    });

    // Join room (works for both YouTube and Upload modes)
    socket.on('join-room', (data) => {
        const { roomId, username } = data;
        const room = rooms.get(roomId);
        
        if (!room) {
            console.log(`❌ Room ${roomId} not found for ${username}`);
            socket.emit('room-error', 'Room not found');
            socket.emit('room-not-found'); // For upload mode compatibility
            return;
        }
        
        // Check if user is already in the room (reconnection case)
        const existingUser = room.users.find(u => u.id === socket.id);
        if (!existingUser) {
            // Add new user to room
            room.users.push({ id: socket.id, username: username });
            console.log(`🚪 ${username} joined room ${roomId} (NEW USER)`);
        } else {
            console.log(`🔄 ${username} reconnected to room ${roomId}`);
        }
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;
        
        const isMaster = (socket.id === room.masterId);
        
        // Send room-joined event (for both YouTube and Upload modes)
        socket.emit('room-joined', {
            roomId,
            username,
            videoUrl: room.videoUrl,
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
            isMaster: isMaster,
            masterId: room.masterId,
            isHost: isMaster,
            hostUsername: room.masterUsername
        });
        
        console.log(`✅ ${username} in room ${roomId} (${isMaster ? 'Master/Host' : 'Viewer'})`);
        console.log(`   📊 Total users in room: ${room.users.length}`);
        console.log(`   👥 Users: ${room.users.map(u => u.username).join(', ')}`);
        
        // Notify all users in room about user list update
        io.to(roomId).emit('user-list-update', {
            users: room.users,
            masterId: room.masterId
        });
        
        // Notify all users about new user (for upload mode)
        io.to(roomId).emit('user-joined', { 
            username, 
            users: room.users,
            hostId: room.masterId
        });
        
        // Send system message
        io.to(roomId).emit('chat-message', {
            username: 'System',
            message: `${username} joined the room`,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // If there's a video loaded, sync it to new user
        if (room.videoUrl) {
            socket.emit('load-video', { videoUrl: room.videoUrl });
            socket.emit('sync-video', {
                action: room.isPlaying ? 'play' : 'pause',
                currentTime: room.currentTime
            });
            
            if (room.videoType === 'youtube') {
                socket.emit('video-changed', {
                    videoUrl: room.videoUrl,
                    username: room.masterUsername
                });
            }
        }
    });

    // Video change (YouTube mode)
    socket.on('video-change', (videoUrl) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        
        if (room) {
            room.videoUrl = videoUrl;
            room.currentTime = 0;
            room.isPlaying = false;
            room.videoType = 'youtube';
            
            io.to(roomId).emit('video-changed', {
                videoUrl: videoUrl,
                username: socket.username
            });
            
            console.log(`📹 YouTube video changed in room ${roomId} by ${socket.username}`);
        }
    });

    // Video uploaded (Upload mode)
    socket.on('video-uploaded', ({ roomId, username, videoUrl }) => {
        const room = rooms.get(roomId);
        
        if (room) {
            room.videoUrl = videoUrl;
            room.videoType = 'upload';
            
            socket.to(roomId).emit('video-uploaded', { username, videoUrl });
            
            console.log(`📤 Video uploaded in room ${roomId} by ${username}`);
        }
    });

    // Upload progress (Upload mode)
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
            
            if (progress % 10 === 0) {
                console.log(`📊 [${roomId}] ${username} upload: ${progress}% (${speed})`);
            }
        }
    });

    // Play (YouTube mode - master only)
    socket.on('play', (currentTime) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        
        if (room && socket.id === room.masterId) {
            room.isPlaying = true;
            room.currentTime = currentTime;
            
            console.log(`▶️ Master played video at ${currentTime} in room ${roomId}`);
            socket.to(roomId).emit('play', currentTime);
        } else if (room && socket.id !== room.masterId) {
            console.log(`⚠️ Non-master ${socket.username} tried to play in room ${roomId}`);
        }
    });

    // Pause (YouTube mode - master only)
    socket.on('pause', (currentTime) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        
        if (room && socket.id === room.masterId) {
            room.isPlaying = false;
            room.currentTime = currentTime;
            
            console.log(`⏸️ Master paused video at ${currentTime} in room ${roomId}`);
            socket.to(roomId).emit('pause', currentTime);
        } else if (room && socket.id !== room.masterId) {
            console.log(`⚠️ Non-master ${socket.username} tried to pause in room ${roomId}`);
        }
    });

    // Seek (YouTube mode - master only)
    socket.on('seek', (currentTime) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        
        if (room && socket.id === room.masterId) {
            room.currentTime = currentTime;
            
            console.log(`⏩ Master seeked to ${currentTime} in room ${roomId}`);
            socket.to(roomId).emit('seek', currentTime);
        } else if (room && socket.id !== room.masterId) {
            console.log(`⚠️ Non-master ${socket.username} tried to seek in room ${roomId}`);
        }
    });

    // Video control (Upload mode - host only)
    socket.on('video-control', ({ roomId, action, currentTime }) => {
        const room = rooms.get(roomId);
        
        if (room) {
            // Check if user is host/master
            if (socket.id === room.masterId) {
                room.isPlaying = (action === 'play');
                room.currentTime = currentTime;
                
                // Broadcast to all users except sender
                socket.to(roomId).emit('sync-video', { action, currentTime });
                
                console.log(`🎮 ${socket.username} (HOST) ${action}ed video at ${currentTime}s in room ${roomId}`);
            } else {
                // Not the host - reject control
                socket.emit('control-denied', { message: 'Only the host can control the video' });
                console.log(`⛔ ${socket.username} tried to control video but is not host`);
            }
        }
    });

    // Chat message (works for both modes)
    socket.on('chat-message', (messageData) => {
        const roomId = socket.roomId;
        
        if (roomId) {
            // Handle both formats (string or object)
            const message = typeof messageData === 'string' ? messageData : messageData.message;
            
            io.to(roomId).emit('chat-message', {
                username: socket.username,
                message: message,
                timestamp: new Date().toLocaleTimeString()
            });
            
            // Also emit in upload mode format
            if (typeof messageData === 'object' && messageData.roomId) {
                socket.to(roomId).emit('new-message', { 
                    username: socket.username, 
                    message: message 
                });
            }
            
            console.log(`💬 [${roomId}] ${socket.username}: ${message}`);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);
        
        if (room) {
            const wasMaster = (socket.id === room.masterId);
            
            // Remove user from room
            room.users = room.users.filter(user => user.id !== socket.id);
            
            console.log(`👋 ${socket.username} disconnected from room ${roomId}`);
            
            if (room.users.length === 0) {
                // No users left, delete room
                rooms.delete(roomId);
                console.log(`🗑️ Room ${roomId} deleted (empty)`);
            } else {
                // If master left, assign new master
                if (wasMaster) {
                    const newMaster = room.users[0];
                    room.masterId = newMaster.id;
                    room.masterUsername = newMaster.username;
                    
                    // Notify for YouTube mode
                    io.to(roomId).emit('master-changed', {
                        masterId: newMaster.id,
                        masterUsername: newMaster.username
                    });
                    
                    // Notify for Upload mode
                    io.to(roomId).emit('host-changed', { 
                        newHostUsername: newMaster.username,
                        newHostId: newMaster.id,
                        users: room.users
                    });
                    
                    console.log(`👑 New master in room ${roomId}: ${newMaster.username}`);
                }
                
                // Update user list
                io.to(roomId).emit('user-list-update', {
                    users: room.users,
                    masterId: room.masterId
                });
                
                // Notify about user leaving (Upload mode)
                io.to(roomId).emit('user-left', { 
                    username: socket.username, 
                    users: room.users 
                });
                
                // Send system message
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
            console.log(`   📝 Name: ${req.file.originalname}`);
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
    console.log('║       🎬 Watch Together Unified Server          ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log('🌐 Server running at:');
    console.log(`   📍 Local:    http://localhost:${PORT}`);
    console.log(`   📱 Network:  http://${localIP}:${PORT}`);
    console.log('');
    console.log('📺 Supported Modes:');
    console.log('   ✅ YouTube Together (youtube.html)');
    console.log('   ✅ Upload & Watch (room.html)');
    console.log('');
    console.log('⚙️  Configuration:');
    console.log('   📂 Upload directory: ./uploads');
    console.log('   📦 Max file size: 5GB');
    console.log('   👑 Host/Master control: Enabled');
    console.log('   📊 Upload progress: Enabled');
    console.log('   🔄 Room sync: Enabled');
    console.log('   ✅ Accepts: ALL file types');
    console.log('');
    console.log('💡 Make sure all devices are on the same WiFi network!');
    console.log('');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
});