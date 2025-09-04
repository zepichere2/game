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

// Level templates for different player counts
const levelTemplates = {
    1: {
        // Level 1 for different player counts
        platforms: [
            { x: 0, y: 670, width: 1280, height: 50, color: '#8B4513' }, // Ground
            { x: 300, y: 570, width: 200, height: 20, color: '#8B4513' },
            { x: 700, y: 470, width: 200, height: 20, color: '#8B4513' }
        ],
        switches: [],
        doors: [],
        goal: { x: 1150, y: 590, width: 80, height: 80 }
    }
};

function generateLevel(levelNumber, playerCount) {
    const level = {
        platforms: [
            { x: 0, y: 670, width: 1280, height: 50, color: '#8B4513' } // Always have ground
        ],
        switches: [],
        doors: [],
        goal: { x: 1150, y: 90, width: 80, height: 80 }
    };

    // Generate platforms based on player count and level
    const platformCount = Math.min(3 + Math.floor(playerCount / 2), 8);
    for (let i = 0; i < platformCount; i++) {
        const x = 150 + (i * 150) + Math.random() * 100;
        const y = 570 - (i * 80) - Math.random() * 50;
        const width = 120 + Math.random() * 80;
        
        level.platforms.push({
            x: Math.min(x, 1100),
            y: Math.max(y, 150),
            width: Math.min(width, 1280 - x),
            height: 20,
            color: '#8B4513'
        });
    }

    // Generate switches based on player count
    const switchCount = Math.min(Math.floor(playerCount / 2) + 1, 6);
    for (let i = 0; i < switchCount; i++) {
        const requiredPlayers = Math.min(i + 1, Math.floor(playerCount / 2) + 1);
        const platform = level.platforms[i + 1] || level.platforms[0];
        
        level.switches.push({
            id: `switch${i + 1}`,
            x: platform.x + 20,
            y: platform.y - 30,
            width: 40,
            height: 30,
            active: false,
            requiredPlayers: requiredPlayers
        });
    }

    // Generate doors linked to switches
    for (let i = 0; i < level.switches.length; i++) {
        const platform = level.platforms[i + 2] || level.platforms[level.platforms.length - 1];
        const doorHeight = 80 + (i * 20);
        
        level.doors.push({
            id: `door${i + 1}`,
            x: platform.x + platform.width + 10,
            y: platform.y - doorHeight,
            width: 25,
            height: doorHeight,
            open: false,
            linkedSwitch: `switch${i + 1}`
        });
    }

    // Adjust goal position based on level complexity
    const finalPlatform = level.platforms[level.platforms.length - 1];
    level.goal = {
        x: Math.max(finalPlatform.x + finalPlatform.width + 50, 1100),
        y: finalPlatform.y - 80,
        width: 80,
        height: 80
    };

    return level;
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
    alert('Room is full! Maximum 10 players allowed.');
});

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
        
        if (shouldBeActive && !switchObj.active) {
            socket.emit('switchActivated', { id: switchObj.id });
        } else if (!shouldBeActive && switchObj.active) {
            socket.emit('switchDeactivated', { id: switchObj.id });
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
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add some texture
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x, platform.y, platform.width, 5);
    });
    
    // Draw doors
    doors.forEach(door => {
        if (!door.open) {
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(door.x, door.y, door.width, door.height);
            
            // Door handle
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(door.x + door.width - 8, door.y + door.height/2 - 3, 6, 6);
        }
    });
    
    // Draw switches
    switches.forEach(switchObj => {
        ctx.fillStyle = switchObj.active ? '#00FF00' : '#FF0000';
        ctx.fillRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
        
        // Switch indicator
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(switchObj.requiredPlayers.toString(), 
                    switchObj.x + switchObj.width/2, 
                    switchObj.y - 5);
    });
    
    // Draw goal
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏁', goal.x + goal.width/2, goal.y + goal.height/2 + 7);
    
    // Draw players with improved design
    gameState.players.forEach(player => {
        const centerX = player.x + player.width/2;
        const centerY = player.y + player.height/2;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(player.x + 2, player.y + 2, player.width, player.height);
        
        // Main body (rounded rectangle)
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.roundRect(player.x, player.y, player.width, player.height, 8);
        ctx.fill();
        
        // Body highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(player.x + 2, player.y + 2, player.width - 4, player.height/2, 6);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(centerX - 6, centerY - 4, 4, 0, Math.PI * 2);
        ctx.arc(centerX + 6, centerY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - 6, centerY - 4, 2, 0, Math.PI * 2);
        ctx.arc(centerX + 6, centerY - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY + 2, 4, 0, Math.PI);
        ctx.stroke();
        
        // Player number badge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(player.x + player.width - 8, player.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.number.toString(), 
                    player.x + player.width - 8, 
                    player.y + 12);
        
        // Movement particles when moving
        if (Math.abs(player.velocityX) > 1) {
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`;
                ctx.beginPath();
                ctx.arc(
                    player.x + Math.random() * player.width,
                    player.y + player.height + Math.random() * 5,
                    Math.random() * 2 + 1,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    });
    
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

// Start the game loop
gameLoop();
