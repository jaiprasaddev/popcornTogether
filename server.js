const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

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
    // No fileFilter - accepts ALL files
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
const rooms = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Create room
    socket.on('create-room', ({ roomId, username }) => {
        rooms[roomId] = {
            host: socket.id,
            hostUsername: username,
            users: [{ id: socket.id, username, isHost: true }],
            videoUrl: null,
            videoState: { isPlaying: false, currentTime: 0 }
        };
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;
        socket.isHost = true;
        
        console.log(`🎬 Room created: ${roomId} by ${username} (HOST)`);
        socket.emit('room-created', { roomId, isHost: true });
    });

    // Join room
    socket.on('join-room', ({ roomId, username }) => {
        if (rooms[roomId]) {
            rooms[roomId].users.push({ id: socket.id, username, isHost: false });
            socket.join(roomId);
            socket.roomId = roomId;
            socket.username = username;
            socket.isHost = false;
            
            console.log(`👤 ${username} joined room: ${roomId}`);
            
            // Notify all users in room
            io.to(roomId).emit('user-joined', { 
                username, 
                users: rooms[roomId].users,
                hostId: rooms[roomId].host
            });
            
            // Send current video state to new user
            socket.emit('room-joined', { isHost: false, hostUsername: rooms[roomId].hostUsername });
            if (rooms[roomId].videoUrl) {
                socket.emit('load-video', { videoUrl: rooms[roomId].videoUrl });
                socket.emit('sync-video', rooms[roomId].videoState);
            }
        } else {
            socket.emit('room-not-found');
        }
    });

    // Video control (play/pause/seek) - ONLY HOST CAN CONTROL
    socket.on('video-control', ({ roomId, action, currentTime }) => {
        if (rooms[roomId]) {
            // Check if user is host
            if (socket.id === rooms[roomId].host) {
                rooms[roomId].videoState = { 
                    isPlaying: action === 'play', 
                    currentTime 
                };
                
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

    // Video uploaded
    socket.on('video-uploaded', ({ roomId, username, videoUrl }) => {
        if (rooms[roomId]) {
            rooms[roomId].videoUrl = videoUrl;
            socket.to(roomId).emit('video-uploaded', { username, videoUrl });
        }
    });

    // Upload progress - broadcast to other users in room
    socket.on('upload-progress', ({ roomId, username, progress, speed, eta, filename }) => {
        if (rooms[roomId]) {
            // Broadcast to all users in room except sender
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

    // Chat message
    socket.on('chat-message', ({ roomId, username, message }) => {
        socket.to(roomId).emit('new-message', { username, message });
        console.log(`💬 [${roomId}] ${username}: ${message}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            // Remove user from room
            rooms[roomId].users = rooms[roomId].users.filter(u => u.id !== socket.id);
            
            // Check if host left
            if (socket.id === rooms[roomId].host) {
                if (rooms[roomId].users.length > 0) {
                    // Transfer host to next user
                    const newHost = rooms[roomId].users[0];
                    rooms[roomId].host = newHost.id;
                    rooms[roomId].hostUsername = newHost.username;
                    newHost.isHost = true;
                    
                    io.to(roomId).emit('host-changed', { 
                        newHostUsername: newHost.username,
                        newHostId: newHost.id,
                        users: rooms[roomId].users
                    });
                    console.log(`👑 Host transferred to ${newHost.username} in room ${roomId}`);
                } else {
                    // No users left, delete room
                    console.log(`🗑️ Room ${roomId} deleted - no users remaining`);
                    delete rooms[roomId];
                }
            } else {
                // Regular user left
                io.to(roomId).emit('user-left', { 
                    username: socket.username, 
                    users: rooms[roomId].users 
                });
            }
        }
    });
});

// File upload endpoint with comprehensive error handling
app.post('/upload', (req, res) => {
    upload.single('video')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific error
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
            // Other errors
            console.error('❌ Upload error:', err);
            return res.status(400).json({ 
                success: false,
                error: err.message || 'Unknown upload error' 
            });
        }
        
        // Check if file exists
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
            console.log(`   📁 Name: ${req.file.originalname}`);
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
    
    // Don't send error response if headers already sent
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
server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🎬 Watch Together Server');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📁 Max file size: 5GB`);
    console.log(`📂 Upload directory: ./uploads`);
    console.log(`👑 Host control: Enabled`);
    console.log(`📊 Upload progress: Enabled`);
    console.log(`✅ Accepts: ALL file types`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
});