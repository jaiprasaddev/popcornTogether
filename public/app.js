// Initialize Socket.IO with proper configuration for cross-device connections
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
});

// Connection status monitoring
socket.on('connect', () => {
    console.log('✅ Connected to server:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('⚠️ Disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Reconnected after', attemptNumber, 'attempts');
});

// Get all elements
const welcomeScreen = document.getElementById('welcome-screen');
const roomScreen = document.getElementById('room-screen');
const createUsernameInput = document.getElementById('create-username');
const createRoomBtn = document.getElementById('create-room-btn');
const joinUsernameInput = document.getElementById('join-username');
const roomIdInput = document.getElementById('room-id-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const errorMessage = document.getElementById('error-message');
const roomIdDisplay = document.getElementById('room-id-display');
const copyRoomIdBtn = document.getElementById('copy-room-id-btn');
const copyToast = document.getElementById('copy-toast');
const usernameDisplay = document.getElementById('username-display');
const masterStatus = document.getElementById('master-status');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const videoUrlInput = document.getElementById('video-url-input');
const loadVideoBtn = document.getElementById('load-video-btn');
const playerPlaceholder = document.getElementById('player-placeholder');
const playerDiv = document.getElementById('player');
const usersList = document.getElementById('users-list');
const userCount = document.getElementById('user-count');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

// State
let currentRoomId = null;
let currentUsername = null;
let currentVideoId = null;
let isSyncing = false;
let isMaster = false;
let masterId = null;

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => errorMessage.classList.remove('show'), 5000);
}

// Force scroll to top - multiple methods to ensure it works
function forceScrollToTop() {
    // Method 1: Standard window scroll
    window.scrollTo(0, 0);
    
    // Method 2: Document body scroll
    document.body.scrollTop = 0;
    
    // Method 3: Document element scroll
    document.documentElement.scrollTop = 0;
    
    // Method 4: Set scroll behavior
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
    });
}

// Switch screens with animation and scroll to top
function switchScreen(screen) {
    if (screen === 'room') {
        // Force scroll to top BEFORE any transitions
        forceScrollToTop();
        
        // Fade out welcome screen
        welcomeScreen.style.opacity = '0';
        
        setTimeout(() => {
            welcomeScreen.classList.remove('active');
            welcomeScreen.style.display = 'none';
            
            // Show room screen
            roomScreen.classList.add('active');
            roomScreen.style.display = 'block';
            roomScreen.style.opacity = '0';
            
            // Force scroll again
            forceScrollToTop();
            
            // Fade in room screen
            setTimeout(() => {
                roomScreen.style.opacity = '1';
                
                // Force scroll one more time after transition
                setTimeout(() => {
                    forceScrollToTop();
                }, 100);
            }, 50);
        }, 300);
    } else if (screen === 'welcome') {
        welcomeScreen.style.display = 'flex';
        welcomeScreen.classList.add('active');
        roomScreen.classList.remove('active');
        roomScreen.style.display = 'none';
        forceScrollToTop();
    }
}

// Copy Room ID to clipboard
function copyRoomId() {
    const roomId = currentRoomId;
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomId).then(() => {
            showCopyToast();
        }).catch(err => {
            // Fallback if clipboard API fails
            fallbackCopyRoomId(roomId);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyRoomId(roomId);
    }
}

// Fallback copy method
function fallbackCopyRoomId(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyToast();
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Room ID: ' + text);
    }
    
    document.body.removeChild(textArea);
}

// Show copy success toast
function showCopyToast() {
    copyToast.classList.add('show');
    setTimeout(() => {
        copyToast.classList.remove('show');
    }, 3000);
}

// Copy button click handler
copyRoomIdBtn.addEventListener('click', copyRoomId);

// Update master status display
function updateMasterStatus() {
    if (isMaster) {
        masterStatus.textContent = '👑 You are the Master (Only you can control playback)';
        masterStatus.className = 'master-status';
    } else {
        masterStatus.textContent = '👀 You are a Viewer (Master controls playback)';
        masterStatus.className = 'master-status viewer';
    }
}

// Extract YouTube video ID
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Create/Update YouTube iframe
function loadVideo(videoId) {
    console.log('📹 Loading video:', videoId);
    currentVideoId = videoId;
    
    // Hide placeholder
    playerPlaceholder.style.display = 'none';
    
    // Destroy old player
    if (player) {
        console.log('🗑️ Destroying old player');
        player.destroy();
        player = null;
        playerReady = false;
    }
    
    // Clear player div
    playerDiv.innerHTML = '';
    
    // Create iframe
    playerDiv.innerHTML = `
        <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            id="youtube-iframe"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
        ></iframe>
    `;
    
    // Initialize YouTube API
    setTimeout(() => {
        initYouTubeAPI(videoId);
    }, 500);
}

// YouTube API
let player = null;
let playerReady = false;

function initYouTubeAPI(videoId) {
    // Load YouTube API if not loaded
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
        
        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ YouTube API Ready');
            createPlayer(videoId);
        };
    } else {
        createPlayer(videoId);
    }
}

function createPlayer(videoId) {
    console.log('🎬 Creating YouTube player for:', videoId);
    
    player = new YT.Player('youtube-iframe', {
        videoId: videoId,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log('✅ Player ready!');
    playerReady = true;
}

function onPlayerStateChange(event) {
    // Only master can trigger play/pause events
    if (!isMaster) {
        console.log('👀 Not master, ignoring state change');
        return;
    }
    if (isSyncing) {
        console.log('🔄 Syncing, ignoring state change');
        return;
    }
    
    const state = event.data;
    const currentTime = player.getCurrentTime();
    
    // 1 = playing, 2 = paused
    if (state === 1) {
        console.log('▶️ Master playing at:', currentTime);
        socket.emit('play', currentTime);
    } else if (state === 2) {
        console.log('⏸️ Master paused at:', currentTime);
        socket.emit('pause', currentTime);
    }
}

// Monitor seeking (only for master)
let lastTime = 0;
setInterval(() => {
    if (player && playerReady && !isSyncing && isMaster) {
        try {
            const currentTime = player.getCurrentTime();
            if (Math.abs(currentTime - lastTime) > 2) {
                console.log('⏩ Master seeked to:', currentTime);
                socket.emit('seek', currentTime);
            }
            lastTime = currentTime;
        } catch (e) {
            // Player not ready
        }
    }
}, 1000);

// Create room
createRoomBtn.addEventListener('click', () => {
    const username = createUsernameInput.value.trim();
    if (!username) return showError('Please enter your name');
    console.log('🚀 Creating room as:', username);
    socket.emit('create-room', username);
});

// Join room
joinRoomBtn.addEventListener('click', () => {
    const username = joinUsernameInput.value.trim();
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!username) return showError('Please enter your name');
    if (!roomId) return showError('Please enter room ID');
    console.log('🚪 Joining room:', roomId, 'as:', username);
    socket.emit('join-room', { roomId, username });
});

// Leave room
leaveRoomBtn.addEventListener('click', () => {
    if (confirm('Leave room?')) location.reload();
});

// Load video
loadVideoBtn.addEventListener('click', () => {
    const url = videoUrlInput.value.trim();
    if (!url) return alert('Please enter YouTube URL');
    
    const videoId = extractVideoId(url);
    if (!videoId) return alert('Invalid YouTube URL');
    
    console.log('📤 Sending video change:', url);
    socket.emit('video-change', url);
    videoUrlInput.value = '';
});

// Send chat
function sendChat() {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat-message', message);
        chatInput.value = '';
    }
}

sendChatBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
});

// Socket events
socket.on('room-created', (data) => {
    console.log('✅ Room created:', data);
    currentRoomId = data.roomId;
    currentUsername = data.username;
    isMaster = true;
    masterId = socket.id;
    
    roomIdDisplay.textContent = data.roomId;
    usernameDisplay.textContent = data.username;
    updateMasterStatus();
    switchScreen('room');
    
    addChatMessage({
        username: 'System',
        message: `Room created! Share Room ID: ${data.roomId}. You are the Master!`,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true
    });
});

socket.on('room-joined', (data) => {
    console.log('✅ Room joined:', data);
    currentRoomId = data.roomId;
    currentUsername = data.username;
    isMaster = data.isMaster;
    masterId = data.masterId;
    
    roomIdDisplay.textContent = data.roomId;
    usernameDisplay.textContent = data.username;
    updateMasterStatus();
    switchScreen('room');
    
    // Load existing video
    if (data.videoUrl) {
        const videoId = extractVideoId(data.videoUrl);
        if (videoId) {
            console.log('📹 Loading existing video');
            loadVideo(videoId);
            setTimeout(() => {
                if (player && playerReady) {
                    isSyncing = true;
                    console.log('🔄 Syncing to:', data.currentTime, 'playing:', data.isPlaying);
                    player.seekTo(data.currentTime, true);
                    if (data.isPlaying) player.playVideo();
                    else player.pauseVideo();
                    setTimeout(() => isSyncing = false, 1000);
                }
            }, 2000);
        }
    }
});

socket.on('room-error', (message) => {
    console.error('❌ Room error:', message);
    showError(message);
});

socket.on('master-changed', (data) => {
    console.log('👑 Master changed:', data);
    masterId = data.masterId;
    isMaster = (socket.id === data.masterId);
    updateMasterStatus();
    
    addChatMessage({
        username: 'System',
        message: `${data.masterUsername} is now the Master!`,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true
    });
});

socket.on('video-changed', (data) => {
    console.log('📹 Video changed:', data);
    const videoId = extractVideoId(data.videoUrl);
    if (videoId) {
        loadVideo(videoId);
        addChatMessage({
            username: 'System',
            message: `${data.username} loaded a new video`,
            timestamp: new Date().toLocaleTimeString(),
            isSystem: true
        });
    }
});

socket.on('play', (currentTime) => {
    console.log('▶️ Received play command:', currentTime);
    if (player && playerReady) {
        isSyncing = true;
        player.seekTo(currentTime, true);
        player.playVideo();
        setTimeout(() => {
            isSyncing = false;
            console.log('✅ Play sync complete');
        }, 1000);
    }
});

socket.on('pause', (currentTime) => {
    console.log('⏸️ Received pause command:', currentTime);
    if (player && playerReady) {
        isSyncing = true;
        player.seekTo(currentTime, true);
        player.pauseVideo();
        setTimeout(() => {
            isSyncing = false;
            console.log('✅ Pause sync complete');
        }, 1000);
    }
});

socket.on('seek', (currentTime) => {
    console.log('⏩ Received seek command:', currentTime);
    if (player && playerReady) {
        isSyncing = true;
        player.seekTo(currentTime, true);
        setTimeout(() => {
            isSyncing = false;
            console.log('✅ Seek sync complete');
        }, 1000);
    }
});

socket.on('user-list-update', (data) => {
    console.log('👥 User list updated:', data);
    usersList.innerHTML = '';
    userCount.textContent = data.users.length;
    masterId = data.masterId;
    
    data.users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        // Check if this user is the master
        if (user.id === data.masterId) {
            userItem.classList.add('master');
        }
        
        userItem.innerHTML = `
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-name">${user.username}</div>
            ${user.id === data.masterId ? '<span class="master-badge">👑 MASTER</span>' : ''}
        `;
        usersList.appendChild(userItem);
    });
});

socket.on('chat-message', (data) => {
    addChatMessage(data);
});

function addChatMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (data.username === 'System' || data.isSystem) {
        messageDiv.classList.add('system');
        messageDiv.innerHTML = `<div class="message-text">${data.message}</div>`;
    } else {
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${data.username}</span>
                <span class="message-timestamp">${data.timestamp}</span>
            </div>
            <div class="message-text">${data.message}</div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enter key shortcuts
createUsernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoomBtn.click();
});

joinUsernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') roomIdInput.focus();
});

roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoomBtn.click();
});

roomIdInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Add CSS transition
welcomeScreen.style.transition = 'opacity 0.3s ease';
roomScreen.style.transition = 'opacity 0.3s ease';

// Force scroll to top on page load
window.addEventListener('load', () => {
    forceScrollToTop();
});

// Force scroll to top when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && roomScreen.classList.contains('active')) {
        forceScrollToTop();
    }
});