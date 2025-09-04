// Game client-side code
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = {
    players: [],
    gameStatus: 'waiting',
    level: 1,
    playerId: null,
    roomId: null,
    playerName: ''
};

// Input handling
const keys = {};
let localPlayer = null;
let gameStarted = false;

// Dynamic level system
let currentLevel = {
    platforms: [],
    switches: [],
    doors: [],
    goal: {},
    playerCount: 0
};

// Enhanced level templates with cooperative puzzle mechanics
const levelTemplates = {
    1: {
        name: "Cooperative Switches",
        description: "All players must work together to activate switches",
        platforms: [
            { x: 0, y: 670, width: 1280, height: 50, color: '#8B4513' }, // Ground
            { x: 200, y: 570, width: 150, height: 20, color: '#8B4513' },
            { x: 400, y: 470, width: 150, height: 20, color: '#8B4513' },
            { x: 600, y: 370, width: 150, height: 20, color: '#8B4513' },
            { x: 800, y: 270, width: 150, height: 20, color: '#8B4513' },
            { x: 1000, y: 170, width: 150, height: 20, color: '#8B4513' }
        ],
        switches: [],
        doors: [],
        goal: { x: 1150, y: 90, width: 80, height: 80 },
        puzzleType: 'cooperative_switches'
    },
    2: {
        name: "Synchronized Timing",
        description: "Players must activate switches in perfect synchronization",
        platforms: [
            { x: 0, y: 670, width: 1280, height: 50, color: '#8B4513' },
            { x: 150, y: 570, width: 100, height: 20, color: '#8B4513' },
            { x: 300, y: 470, width: 100, height: 20, color: '#8B4513' },
            { x: 450, y: 370, width: 100, height: 20, color: '#8B4513' },
            { x: 600, y: 270, width: 100, height: 20, color: '#8B4513' },
            { x: 750, y: 170, width: 100, height: 20, color: '#8B4513' },
            { x: 900, y: 70, width: 100, height: 20, color: '#8B4513' }
        ],
        switches: [],
        doors: [],
        goal: { x: 1050, y: 20, width: 80, height: 80 },
        puzzleType: 'synchronized_timing'
    },
    3: {
        name: "Pattern Recognition",
        description: "Players must follow a specific sequence to unlock doors",
        platforms: [
            { x: 0, y: 670, width: 1280, height: 50, color: '#8B4513' },
            { x: 200, y: 570, width: 120, height: 20, color: '#8B4513' },
            { x: 400, y: 470, width: 120, height: 20, color: '#8B4513' },
            { x: 600, y: 370, width: 120, height: 20, color: '#8B4513' },
            { x: 800, y: 270, width: 120, height: 20, color: '#8B4513' },
            { x: 1000, y: 170, width: 120, height: 20, color: '#8B4513' }
        ],
        switches: [],
        doors: [],
        goal: { x: 1150, y: 90, width: 80, height: 80 },
        puzzleType: 'pattern_recognition'
    }
};

function generateLevel(levelNumber, playerCount) {
    // Get base template or create a new one
    const template = levelTemplates[levelNumber] || levelTemplates[1];
    const level = {
        platforms: [...template.platforms],
        switches: [],
        doors: [],
        goal: { ...template.goal },
        name: template.name,
        description: template.description,
        puzzleType: template.puzzleType,
        playerCount: playerCount
    };

    // Generate puzzle elements based on type and player count
    switch (template.puzzleType) {
        case 'cooperative_switches':
            generateCooperativeSwitches(level, playerCount);
            break;
        case 'synchronized_timing':
            generateSynchronizedTiming(level, playerCount);
            break;
        case 'pattern_recognition':
            generatePatternRecognition(level, playerCount);
            break;
        default:
            generateCooperativeSwitches(level, playerCount);
    }

    return level;
}

function generateCooperativeSwitches(level, playerCount) {
    // Create switches that require ALL players to activate
    const switchCount = Math.min(playerCount, 4);
    
    for (let i = 0; i < switchCount; i++) {
        const platform = level.platforms[i + 1] || level.platforms[0];
        
        level.switches.push({
            id: `switch${i + 1}`,
            x: platform.x + platform.width / 2 - 20,
            y: platform.y - 35,
            width: 40,
            height: 35,
            active: false,
            requiredPlayers: playerCount, // ALL players must be on switch
            type: 'cooperative',
            color: '#FF6B6B'
        });
    }

    // Create doors that require all switches to be active
    for (let i = 0; i < switchCount; i++) {
        const platform = level.platforms[i + 2] || level.platforms[level.platforms.length - 1];
        
        level.doors.push({
            id: `door${i + 1}`,
            x: platform.x + platform.width + 5,
            y: platform.y - 100,
            width: 30,
            height: 100,
            open: false,
            requiredSwitches: level.switches.map(s => s.id), // All switches must be active
            type: 'cooperative'
        });
    }
}

function generateSynchronizedTiming(level, playerCount) {
    // Create switches that must be activated within a time window
    const switchCount = playerCount;
    const timeWindow = 2000; // 2 seconds
    
    for (let i = 0; i < switchCount; i++) {
        const platform = level.platforms[i + 1] || level.platforms[0];
        
        level.switches.push({
            id: `switch${i + 1}`,
            x: platform.x + platform.width / 2 - 20,
            y: platform.y - 35,
            width: 40,
            height: 35,
            active: false,
            requiredPlayers: 1,
            type: 'synchronized',
            color: '#4ECDC4',
            timeWindow: timeWindow,
            activationTime: null
        });
    }

    // Create a master door that opens only when all switches are activated within time window
    const finalPlatform = level.platforms[level.platforms.length - 1];
    level.doors.push({
        id: 'master_door',
        x: finalPlatform.x + finalPlatform.width + 5,
        y: finalPlatform.y - 120,
        width: 40,
        height: 120,
        open: false,
        requiredSwitches: level.switches.map(s => s.id),
        type: 'synchronized',
        timeWindow: timeWindow
    });
}

function generatePatternRecognition(level, playerCount) {
    // Create switches that must be activated in a specific sequence
    const switchCount = Math.min(playerCount, 5);
    const sequence = generateRandomSequence(switchCount);
    
    for (let i = 0; i < switchCount; i++) {
        const platform = level.platforms[i + 1] || level.platforms[0];
        
        level.switches.push({
            id: `switch${i + 1}`,
            x: platform.x + platform.width / 2 - 20,
            y: platform.y - 35,
            width: 40,
            height: 35,
            active: false,
            requiredPlayers: 1,
            type: 'pattern',
            color: '#96CEB4',
            sequenceOrder: sequence[i],
            activated: false
        });
    }

    // Create doors that open based on sequence completion
    for (let i = 0; i < switchCount; i++) {
        const platform = level.platforms[i + 2] || level.platforms[level.platforms.length - 1];
        
        level.doors.push({
            id: `door${i + 1}`,
            x: platform.x + platform.width + 5,
            y: platform.y - 100,
            width: 30,
            height: 100,
            open: false,
            requiredSequence: sequence.slice(0, i + 1),
            type: 'pattern'
        });
    }
}

function generateRandomSequence(length) {
    const sequence = Array.from({length}, (_, i) => i + 1);
    // Shuffle the sequence
    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
    return sequence;
}

function updateLevel(levelNumber, playerCount) {
    currentLevel = generateLevel(levelNumber, playerCount);
    currentLevel.playerCount = playerCount;
    
    // Update global references for compatibility
    platforms.length = 0;
    platforms.push(...currentLevel.platforms);
    
    switches.length = 0;
    switches.push(...currentLevel.switches);
    
    doors.length = 0;
    doors.push(...currentLevel.doors);
    
    Object.assign(goal, currentLevel.goal);
    
    console.log(`Level ${levelNumber} generated for ${playerCount} players:`, {
        platforms: platforms.length,
        switches: switches.length,
        doors: doors.length
    });
}

// Initialize with default level
let platforms = [];
let switches = [];
let doors = [];
let goal = {};

// Physics constants
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5;
const FRICTION = 0.8;

// UI Elements
const playerCountEl = document.getElementById('playerCount');
const gameStatusEl = document.getElementById('gameStatus');
const startButtonEl = document.getElementById('startButton');
const playersListEl = document.getElementById('playersList');
const connectionStatusEl = document.getElementById('connectionStatus');
const roomSetupEl = document.getElementById('roomSetup');
const gameInfoEl = document.getElementById('gameInfo');
const gameControlsEl = document.getElementById('gameControls');
const roomInfoEl = document.getElementById('roomInfo');
const roomCodeDisplayEl = document.getElementById('roomCodeDisplay');
const shareLinkEl = document.getElementById('shareLink');

// Room setup elements
const playerNameInput = document.getElementById('playerName');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');

// Utility functions
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        room: urlParams.get('room'),
        name: urlParams.get('name')
    };
}

function updateURL(roomId, playerName) {
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    if (playerName) url.searchParams.set('name', playerName);
    window.history.replaceState({}, '', url);
}

// Room setup event handlers
createRoomBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim() || 'Player';
    const roomCode = generateRoomCode();
    joinRoom(roomCode, playerName);
});

joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    const playerName = playerNameInput.value.trim() || 'Player';
    
    if (!roomCode) {
        alert('Please enter a room code');
        return;
    }
    
    joinRoom(roomCode, playerName);
});

copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareLinkEl.textContent).then(() => {
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyLinkBtn.textContent = 'Copy Link';
        }, 2000);
    });
});

// Allow Enter key to join room
roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomBtn.click();
    }
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (roomCodeInput.value.trim()) {
            joinRoomBtn.click();
        } else {
            createRoomBtn.click();
        }
    }
});

function joinRoom(roomId, playerName) {
    gameState.roomId = roomId;
    gameState.playerName = playerName;
    
    // Hide room setup, show game
    roomSetupEl.style.display = 'none';
    gameInfoEl.style.display = 'flex';
    gameControlsEl.style.display = 'block';
    
    // Update URL
    updateURL(roomId, playerName);
    
    // Update share link
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    shareLinkEl.textContent = shareUrl;
    
    // Show room code prominently
    showRoomCodeCreated(roomId);
    
    // Join the room
    socket.emit('joinRoom', { roomId, playerName });
}

function showRoomCodeCreated(roomCode) {
    // Create room code display if it doesn't exist
    let roomCodeCreated = document.getElementById('roomCodeCreated');
    if (!roomCodeCreated) {
        roomCodeCreated = document.createElement('div');
        roomCodeCreated.id = 'roomCodeCreated';
        roomCodeCreated.className = 'room-code-created';
        roomCodeCreated.innerHTML = `
            <div class="room-code-title">🎉 Room Created Successfully!</div>
            <div class="room-code-value" id="roomCodeValue">${roomCode}</div>
            <div style="margin-top: 10px; color: #666; font-size: 14px;">
                Share this code with friends to join your game!
            </div>
        `;
        
        // Insert after game info
        gameInfoEl.parentNode.insertBefore(roomCodeCreated, gameInfoEl.nextSibling);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (roomCodeCreated) {
                roomCodeCreated.style.display = 'none';
            }
        }, 10000);
    } else {
        document.getElementById('roomCodeValue').textContent = roomCode;
        roomCodeCreated.style.display = 'block';
    }
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    connectionStatusEl.textContent = 'Connected';
    connectionStatusEl.className = 'connection-status connected';
    
    // Check URL parameters for auto-join
    const params = getURLParams();
    if (params.room) {
        const playerName = params.name || 'Player';
        playerNameInput.value = playerName;
        roomCodeInput.value = params.room;
        joinRoom(params.room, playerName);
    }
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    connectionStatusEl.textContent = 'Disconnected';
    connectionStatusEl.className = 'connection-status disconnected';
});

socket.on('gameState', (data) => {
    gameState.players = data.players;
    gameState.gameStatus = data.gameState;
    gameState.level = data.level;
    gameState.playerId = data.playerId;
    gameState.roomId = data.roomId;
    
    // Generate level based on current player count
    updateLevel(gameState.level, data.players.length);
    
    // Find local player
    localPlayer = gameState.players.find(p => p.id === gameState.playerId);
    
    updateUI();
});

socket.on('playerJoined', (data) => {
    gameState.players = data.players;
    gameState.gameStatus = data.gameState;
    
    // Regenerate level when player count changes
    updateLevel(gameState.level, data.players.length);
    
    updateUI();
});

socket.on('playerLeft', (data) => {
    gameState.players = data.players;
    
    // Regenerate level when player count changes
    updateLevel(gameState.level, data.players.length);
    
    updateUI();
});

socket.on('playerUpdate', (data) => {
    const player = gameState.players.find(p => p.id === data.playerId);
    if (player) {
        Object.assign(player, data.playerData);
    }
});

socket.on('gameStarted', (data) => {
    gameState.gameStatus = data.gameState;
    gameState.level = data.level;
    
    // Regenerate level for the final player count when game starts
    updateLevel(gameState.level, data.playerCount || gameState.players.length);
    
    updateUI();
});

socket.on('switchUpdate', (data) => {
    const switchObj = switches.find(s => s.id === data.switchId);
    if (switchObj) {
        switchObj.active = data.active;
        
        // Update linked door
        const door = doors.find(d => d.linkedSwitch === data.switchId);
        if (door) {
            door.open = data.active;
        }
    }
});

socket.on('roomFull', () => {
    alert('Room is full! Maximum 16 players allowed.');
});

socket.on('puzzleSolved', (data) => {
    console.log('Puzzle solved:', data.message);
    // Show success message
    showPuzzleMessage(data.message, 'success');
    
    // Open all doors
    doors.forEach(door => {
        door.open = true;
    });
});

socket.on('puzzleReset', (data) => {
    console.log('Puzzle reset:', data.message);
    // Show reset message
    showPuzzleMessage(data.message, 'error');
    
    // Reset switches
    switches.forEach(switchObj => {
        if (switchObj.type === data.type) {
            switchObj.active = false;
            if (switchObj.type === 'pattern') {
                switchObj.activated = false;
            }
        }
    });
    
    // Close doors
    doors.forEach(door => {
        if (door.type === data.type) {
            door.open = false;
        }
    });
});

function showPuzzleMessage(message, type) {
    // Create or update puzzle message display
    let messageEl = document.getElementById('puzzleMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'puzzleMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? 'rgba(0, 184, 148, 0.9)' : 'rgba(231, 76, 60, 0.9)'};
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: 600;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Input event listeners
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Start button event
startButtonEl.addEventListener('click', () => {
    socket.emit('startGame');
});

// Game loop
function gameLoop() {
    if (localPlayer && gameState.gameStatus === 'playing') {
        updateLocalPlayer();
        checkCollisions();
        checkSwitches();
        checkGoal();
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function updateLocalPlayer() {
    if (!localPlayer) return;
    
    // Horizontal movement
    if (keys['KeyA'] || keys['ArrowLeft']) {
        localPlayer.velocityX = -MOVE_SPEED;
    } else if (keys['KeyD'] || keys['ArrowRight']) {
        localPlayer.velocityX = MOVE_SPEED;
    } else {
        localPlayer.velocityX *= FRICTION;
    }
    
    // Jumping
    if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && localPlayer.onGround) {
        localPlayer.velocityY = JUMP_FORCE;
        localPlayer.onGround = false;
    }
    
    // Apply gravity
    localPlayer.velocityY += GRAVITY;
    
    // Update position
    localPlayer.x += localPlayer.velocityX;
    localPlayer.y += localPlayer.velocityY;
    
    // Boundary checks
    if (localPlayer.x < 0) localPlayer.x = 0;
    if (localPlayer.x + localPlayer.width > canvas.width) {
        localPlayer.x = canvas.width - localPlayer.width;
    }
    
    // Send position to server
    socket.emit('playerMove', {
        x: localPlayer.x,
        y: localPlayer.y,
        velocityX: localPlayer.velocityX,
        velocityY: localPlayer.velocityY,
        onGround: localPlayer.onGround
    });
}

function checkCollisions() {
    if (!localPlayer) return;
    
    localPlayer.onGround = false;
    
    // Platform collisions
    platforms.forEach(platform => {
        if (localPlayer.x < platform.x + platform.width &&
            localPlayer.x + localPlayer.width > platform.x &&
            localPlayer.y < platform.y + platform.height &&
            localPlayer.y + localPlayer.height > platform.y) {
            
            // Landing on top
            if (localPlayer.velocityY > 0 && localPlayer.y < platform.y) {
                localPlayer.y = platform.y - localPlayer.height;
                localPlayer.velocityY = 0;
                localPlayer.onGround = true;
            }
            // Hitting from below
            else if (localPlayer.velocityY < 0 && localPlayer.y > platform.y) {
                localPlayer.y = platform.y + platform.height;
                localPlayer.velocityY = 0;
            }
            // Side collisions
            else if (localPlayer.velocityX > 0) {
                localPlayer.x = platform.x - localPlayer.width;
                localPlayer.velocityX = 0;
            } else if (localPlayer.velocityX < 0) {
                localPlayer.x = platform.x + platform.width;
                localPlayer.velocityX = 0;
            }
        }
    });
    
    // Door collisions
    doors.forEach(door => {
        if (!door.open &&
            localPlayer.x < door.x + door.width &&
            localPlayer.x + localPlayer.width > door.x &&
            localPlayer.y < door.y + door.height &&
            localPlayer.y + localPlayer.height > door.y) {
            
            // Push player back
            if (localPlayer.velocityX > 0) {
                localPlayer.x = door.x - localPlayer.width;
            } else if (localPlayer.velocityX < 0) {
                localPlayer.x = door.x + door.width;
            }
            localPlayer.velocityX = 0;
        }
    });
}

function checkSwitches() {
    if (!localPlayer) return;
    
    switches.forEach(switchObj => {
        const playersOnSwitch = gameState.players.filter(player => 
            player.x < switchObj.x + switchObj.width &&
            player.x + player.width > switchObj.x &&
            player.y < switchObj.y + switchObj.height &&
            player.y + player.height > switchObj.y
        );
        
        const shouldBeActive = playersOnSwitch.length >= switchObj.requiredPlayers;
        
        // Handle different puzzle types
        switch (switchObj.type) {
            case 'cooperative':
                // All players must be on the switch
                if (shouldBeActive && !switchObj.active) {
                    socket.emit('switchActivated', { 
                        id: switchObj.id, 
                        type: 'cooperative',
                        playersOnSwitch: playersOnSwitch.length
                    });
                } else if (!shouldBeActive && switchObj.active) {
                    socket.emit('switchDeactivated', { id: switchObj.id });
                }
                break;
                
            case 'synchronized':
                // Single player activation with timing
                if (shouldBeActive && !switchObj.active) {
                    socket.emit('switchActivated', { 
                        id: switchObj.id, 
                        type: 'synchronized',
                        activationTime: Date.now()
                    });
                } else if (!shouldBeActive && switchObj.active) {
                    socket.emit('switchDeactivated', { id: switchObj.id });
                }
                break;
                
            case 'pattern':
                // Sequence-based activation
                if (shouldBeActive && !switchObj.activated) {
                    socket.emit('switchActivated', { 
                        id: switchObj.id, 
                        type: 'pattern',
                        sequenceOrder: switchObj.sequenceOrder
                    });
                }
                break;
                
            default:
                // Default behavior
                if (shouldBeActive && !switchObj.active) {
                    socket.emit('switchActivated', { id: switchObj.id });
                } else if (!shouldBeActive && switchObj.active) {
                    socket.emit('switchDeactivated', { id: switchObj.id });
                }
        }
    });
}

function checkGoal() {
    if (!localPlayer) return;
    
    const playersAtGoal = gameState.players.filter(player =>
        player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y < goal.y + goal.height &&
        player.y + player.height > goal.y
    );
    
    // Check if all players are at the goal
    if (playersAtGoal.length === gameState.players.length && gameState.players.length >= 2) {
        // Level completed!
        console.log('Level completed!');
        socket.emit('levelCompleted', {
            level: gameState.level,
            playerCount: gameState.players.length,
            completionTime: Date.now()
        });
    }
}

function render() {
    // Clear canvas with pixelated background
    ctx.imageSmoothingEnabled = false;
    
    // Create a pixelated sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add pixelated clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
        const cloudX = (i * 250 + 100) % canvas.width;
        const cloudY = 50 + (i * 30);
        drawPixelatedCloud(cloudX, cloudY);
    }

function drawPixelatedCloud(x, y) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    // Draw cloud as pixelated blocks
    const cloudPixels = [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [1,1,1,1,1],
        [0,1,1,1,0]
    ];
    
    const pixelSize = 6;
    for (let row = 0; row < cloudPixels.length; row++) {
        for (let col = 0; col < cloudPixels[row].length; col++) {
            if (cloudPixels[row][col]) {
                ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}
    
    // Draw platforms with pixelated style
    platforms.forEach(platform => {
        ctx.imageSmoothingEnabled = false;
        
        // Main platform
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Pixelated top texture
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x, platform.y, platform.width, 4);
        
        // Platform outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add pixelated grass texture on top
        ctx.fillStyle = '#228B22';
        for (let x = platform.x; x < platform.x + platform.width; x += 8) {
            if (Math.random() > 0.3) {
                ctx.fillRect(x, platform.y - 2, 2, 2);
            }
        }
    });
    
    // Draw doors with pixelated style
    doors.forEach(door => {
        if (!door.open) {
            ctx.imageSmoothingEnabled = false;
            
            // Main door
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(door.x, door.y, door.width, door.height);
            
            // Door outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(door.x, door.y, door.width, door.height);
            
            // Door panels (pixelated design)
            ctx.fillStyle = '#A52A2A';
            ctx.fillRect(door.x + 2, door.y + 4, door.width - 4, 8);
            ctx.fillRect(door.x + 2, door.y + door.height - 12, door.width - 4, 8);
            
            // Door handle (pixelated)
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(door.x + door.width - 6, door.y + door.height/2 - 2, 4, 4);
            
            // Handle outline
            ctx.strokeStyle = '#000';
            ctx.strokeRect(door.x + door.width - 6, door.y + door.height/2 - 2, 4, 4);
        }
    });
    
    // Draw switches with enhanced visual style based on puzzle type
    switches.forEach(switchObj => {
        ctx.imageSmoothingEnabled = false;
        
        // Determine colors based on switch type and state
        let baseColor, buttonColor, borderColor;
        
        switch (switchObj.type) {
            case 'cooperative':
                baseColor = switchObj.active ? '#00FF00' : '#FF6B6B';
                buttonColor = switchObj.active ? '#32CD32' : '#FF8E8E';
                borderColor = '#FF0000';
                break;
            case 'synchronized':
                baseColor = switchObj.active ? '#00FF00' : '#4ECDC4';
                buttonColor = switchObj.active ? '#32CD32' : '#7EDDDD';
                borderColor = '#00CED1';
                break;
            case 'pattern':
                baseColor = switchObj.active ? '#00FF00' : '#96CEB4';
                buttonColor = switchObj.active ? '#32CD32' : '#B8E6B8';
                borderColor = '#90EE90';
                break;
            default:
                baseColor = switchObj.active ? '#00FF00' : '#FF0000';
                buttonColor = switchObj.active ? '#32CD32' : '#DC143C';
                borderColor = '#000';
        }
        
        // Switch base with gradient effect
        ctx.fillStyle = baseColor;
        ctx.fillRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
        
        // Switch outline
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
        
        // Switch button with 3D effect
        ctx.fillStyle = buttonColor;
        ctx.fillRect(switchObj.x + 3, switchObj.y + 3, switchObj.width - 6, switchObj.height - 6);
        
        // Button highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(switchObj.x + 3, switchObj.y + 3, switchObj.width - 6, 6);
        
        // Button shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(switchObj.x + 3, switchObj.y + switchObj.height - 6, switchObj.width - 6, 3);
        
        // Type indicator icon
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        
        let icon = '';
        switch (switchObj.type) {
            case 'cooperative':
                icon = '👥';
                break;
            case 'synchronized':
                icon = '⏱️';
                break;
            case 'pattern':
                icon = '🔢';
                break;
        }
        
        // Draw icon
        const iconX = switchObj.x + switchObj.width/2;
        const iconY = switchObj.y + switchObj.height/2 + 3;
        ctx.fillText(icon, iconX, iconY);
        
        // Required players indicator
        if (switchObj.type === 'cooperative') {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            
            const numX = switchObj.x + switchObj.width/2;
            const numY = switchObj.y - 8;
            
            // Black outline
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx !== 0 || dy !== 0) {
                        ctx.fillText(switchObj.requiredPlayers.toString(), numX + dx, numY + dy);
                    }
                }
            }
            
            // White number
            ctx.fillStyle = '#FFF';
            ctx.fillText(switchObj.requiredPlayers.toString(), numX, numY);
        }
        
        // Sequence number for pattern switches
        if (switchObj.type === 'pattern' && switchObj.sequenceOrder) {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            
            const seqX = switchObj.x + switchObj.width/2;
            const seqY = switchObj.y - 8;
            
            // Black outline
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx !== 0 || dy !== 0) {
                        ctx.fillText(switchObj.sequenceOrder.toString(), seqX + dx, seqY + dy);
                    }
                }
            }
            
            // White number
            ctx.fillStyle = '#FFF';
            ctx.fillText(switchObj.sequenceOrder.toString(), seqX, seqY);
        }
    });
    
    // Draw goal with pixelated style
    ctx.imageSmoothingEnabled = false;
    
    // Goal base
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    
    // Goal outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);
    
    // Goal flag pattern (pixelated)
    ctx.fillStyle = '#FF0000';
    for (let y = 0; y < goal.height; y += 8) {
        for (let x = 0; x < goal.width; x += 8) {
            if ((x + y) % 16 === 0) {
                ctx.fillRect(goal.x + x, goal.y + y, 8, 8);
            }
        }
    }
    
    // Goal text (pixelated font)
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', goal.x + goal.width/2, goal.y + goal.height/2 + 4);
    
    // Draw players with pixelated square design
    gameState.players.forEach(player => {
        const pixelSize = 2; // Pixel scale for retro look
        
        // Disable anti-aliasing for pixel art
        ctx.imageSmoothingEnabled = false;
        
        // Main body (square/rectangular)
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Body outline (pixelated border)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
        
        // Eyes (square pixels)
        ctx.fillStyle = '#000';
        const eyeSize = 4;
        const eyeY = player.y + 6;
        ctx.fillRect(player.x + 6, eyeY, eyeSize, eyeSize); // Left eye
        ctx.fillRect(player.x + player.width - 10, eyeY, eyeSize, eyeSize); // Right eye
        
        // Eye highlights (smaller white pixels)
        ctx.fillStyle = '#FFF';
        ctx.fillRect(player.x + 7, eyeY + 1, 2, 2); // Left eye highlight
        ctx.fillRect(player.x + player.width - 9, eyeY + 1, 2, 2); // Right eye highlight
        
        // Mouth (horizontal line of pixels)
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x + 8, player.y + 18, 14, 2);
        
        // Body shading (darker pixels on right side)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(player.x + player.width - 4, player.y, 4, player.height);
        
        // Body highlight (lighter pixels on left side)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(player.x, player.y, 4, player.height);
        
        // Player number (pixelated font style)
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        
        // Draw number with pixel border effect
        const numberX = player.x + player.width/2;
        const numberY = player.y - 4;
        
        // Black outline
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                    ctx.fillText(player.number.toString(), numberX + dx, numberY + dy);
                }
            }
        }
        
        // White number
        ctx.fillStyle = '#FFF';
        ctx.fillText(player.number.toString(), numberX, numberY);
        
        // Movement particles (square pixels)
        if (Math.abs(player.velocityX) > 1) {
            for (let i = 0; i < 2; i++) {
                ctx.fillStyle = player.color;
                const particleSize = 2;
                ctx.fillRect(
                    player.x + Math.random() * player.width,
                    player.y + player.height + Math.random() * 3,
                    particleSize,
                    particleSize
                );
            }
        }
        
        // Re-enable anti-aliasing for other elements
        ctx.imageSmoothingEnabled = true;
    });
    
    // Draw level information overlay
    if (gameState.gameStatus === 'playing' && currentLevel.name) {
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, 10, 400, 100);
        
        // Level name
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(currentLevel.name, 20, 35);
        
        // Level description
        ctx.font = '14px Arial';
        ctx.fillText(currentLevel.description, 20, 55);
        
        // Puzzle type indicator
        ctx.font = '12px Arial';
        ctx.fillStyle = '#4ECDC4';
        ctx.fillText(`Puzzle Type: ${currentLevel.puzzleType.replace('_', ' ').toUpperCase()}`, 20, 75);
        
        // Player count
        ctx.fillStyle = '#96CEB4';
        ctx.fillText(`Players: ${currentLevel.playerCount}`, 20, 95);
    }
    
    // Draw UI overlay for waiting state
    if (gameState.gameStatus === 'waiting') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFF';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for players...', canvas.width/2, canvas.height/2 - 20);
        
        ctx.font = '18px Arial';
        ctx.fillText(`${gameState.players.length}/16 players connected`, canvas.width/2, canvas.height/2 + 20);
        ctx.fillText('Need at least 2 players to start', canvas.width/2, canvas.height/2 + 50);
    }
}

function updateUI() {
    // Update player count
    playerCountEl.textContent = `Players: ${gameState.players.length}/16`;
    
    // Update game status
    gameStatusEl.textContent = gameState.gameStatus === 'waiting' ? 'Waiting for players' : 
                              gameState.gameStatus === 'playing' ? 'Playing' : 'Completed';
    gameStatusEl.className = `game-status status-${gameState.gameStatus}`;
    
    // Update room info
    if (gameState.roomId) {
        roomInfoEl.textContent = `Room: ${gameState.roomId}`;
        roomCodeDisplayEl.textContent = `Room Code: ${gameState.roomId}`;
    }
    
    // Update start button
    const canStart = gameState.players.length >= 2 && gameState.gameStatus === 'waiting';
    startButtonEl.disabled = !canStart;
    startButtonEl.textContent = canStart ? 'Start Game' : 
                               gameState.players.length < 2 ? 'Need 2+ players' : 'Game in progress';
    
    // Update players list
    const playersHtml = gameState.players.map(player => 
        `<div class="player-item">
            <div class="player-color" style="background-color: ${player.color}"></div>
            ${player.name || `Player ${player.number}`}${player.id === gameState.playerId ? ' (You)' : ''}
        </div>`
    ).join('');
    
    playersListEl.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px;">Players:</div>' + playersHtml;
}

// Chat system
const chatToggle = document.getElementById('chatToggle');
const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const closeChat = document.getElementById('closeChat');
const emojiPanel = document.getElementById('emojiPanel');

let chatVisible = false;

// Chat event listeners
chatToggle.addEventListener('click', () => {
    chatVisible = !chatVisible;
    chatContainer.style.display = chatVisible ? 'flex' : 'none';
    emojiPanel.style.display = 'none';
    if (chatVisible) {
        chatInput.focus();
    }
});

closeChat.addEventListener('click', () => {
    chatVisible = false;
    chatContainer.style.display = 'none';
    emojiPanel.style.display = 'none';
});

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Emoji panel toggle
chatToggle.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'block' : 'none';
});

// Emoji button handlers
document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        sendEmoji(emoji);
        emojiPanel.style.display = 'none';
    });
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (message && gameState.roomId) {
        socket.emit('chatMessage', {
            message: message,
            playerName: gameState.playerName || 'Player',
            roomId: gameState.roomId
        });
        chatInput.value = '';
    }
}

function sendEmoji(emoji) {
    if (gameState.roomId) {
        socket.emit('emojiReaction', {
            emoji: emoji,
            playerName: gameState.playerName || 'Player',
            roomId: gameState.roomId
        });
    }
}

function addChatMessage(message, playerName, isOwn = false) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isOwn ? 'own' : ''}`;
    messageEl.innerHTML = `<strong>${playerName}:</strong> ${message}`;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addEmojiReaction(emoji, playerName) {
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `<strong>${playerName}</strong> reacted: ${emoji}`;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Socket event handlers for chat
socket.on('chatMessage', (data) => {
    const isOwn = data.playerId === gameState.playerId;
    addChatMessage(data.message, data.playerName, isOwn);
});

socket.on('emojiReaction', (data) => {
    addEmojiReaction(data.emoji, data.playerName);
});

socket.on('levelCompleted', (data) => {
    console.log(`Level ${data.level} completed!`);
    showPuzzleMessage(`🎉 Level ${data.level} Completed! 🎉`, 'success');
    
    // Update game state
    gameState.level = data.nextLevel;
    gameState.gameStatus = 'completed';
    
    // Show level completion overlay
    showLevelCompletionOverlay(data);
});

socket.on('nextLevel', (data) => {
    console.log(`Starting level ${data.level}`);
    gameState.level = data.level;
    gameState.gameStatus = 'playing';
    
    // Generate new level
    updateLevel(data.level, data.playerCount);
    
    // Reset player positions
    gameState.players.forEach((player, index) => {
        player.x = 100 + (index * 40);
        player.y = 600;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = false;
    });
    
    // Hide completion overlay
    hideLevelCompletionOverlay();
});

function showLevelCompletionOverlay(data) {
    // Create completion overlay
    let overlay = document.getElementById('levelCompletionOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'levelCompletionOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            color: white;
            text-align: center;
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 20px; backdrop-filter: blur(10px);">
            <h1 style="font-size: 48px; margin: 0 0 20px 0; color: #00b894;">🎉 LEVEL COMPLETED! 🎉</h1>
            <p style="font-size: 24px; margin: 0 0 10px 0;">Level ${data.level}</p>
            <p style="font-size: 18px; margin: 0 0 20px 0; color: #ddd;">Players: ${data.playerCount}</p>
            <p style="font-size: 16px; margin: 0; color: #bbb;">Starting next level in 3 seconds...</p>
        </div>
    `;
    overlay.style.display = 'flex';
}

function hideLevelCompletionOverlay() {
    const overlay = document.getElementById('levelCompletionOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Start the game loop
gameLoop();
