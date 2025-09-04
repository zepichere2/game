const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const gameRooms = new Map();
const maxPlayersPerRoom = 16;
const minPlayersPerRoom = 2;

class GameRoom {
    constructor(roomId) {
        this.id = roomId;
        this.players = new Map();
        this.gameState = 'waiting'; // waiting, playing, completed
        this.level = 1;
        this.switches = new Map();
        this.doors = new Map();
    }

    addPlayer(socket, playerName) {
        if (this.players.size >= maxPlayersPerRoom) {
            return false;
        }

        const playerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];
        const playerId = socket.id;
        const playerNumber = this.players.size + 1;
        
        const player = {
            id: playerId,
            number: playerNumber,
            name: playerName || `Player ${playerNumber}`,
            x: 100 + (playerNumber * 40),
            y: 600,
            width: 30,
            height: 30,
            velocityX: 0,
            velocityY: 0,
            color: playerColors[playerNumber - 1],
            onGround: false,
            isAlive: true
        };

        this.players.set(playerId, player);
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.players.size === 0) {
            return true; // Room should be deleted
        }
        return false;
    }

    updatePlayer(playerId, playerData) {
        if (this.players.has(playerId)) {
            const player = this.players.get(playerId);
            Object.assign(player, playerData);
        }
    }

    canStartGame() {
        return this.players.size >= minPlayersPerRoom && this.gameState === 'waiting';
    }

    getPlayersArray() {
        return Array.from(this.players.values());
    }
}

// Helper functions for puzzle mechanics
function checkSynchronizedSwitches(room, io) {
    const synchronizedSwitches = Array.from(room.switches.values())
        .filter(switchData => switchData.type === 'synchronized' && switchData.active);
    
    if (synchronizedSwitches.length > 0) {
        const timeWindow = 2000; // 2 seconds
        const now = Date.now();
        const allWithinWindow = synchronizedSwitches.every(switchData => 
            now - switchData.activationTime <= timeWindow
        );
        
        if (allWithinWindow) {
            // All switches activated within time window - open doors
            io.to(room.id).emit('puzzleSolved', {
                type: 'synchronized',
                message: 'Perfect synchronization! Doors opened!'
            });
        } else {
            // Reset switches if timing window exceeded
            setTimeout(() => {
                synchronizedSwitches.forEach(switchData => {
                    room.switches.set(switchData.id, { ...switchData, active: false });
                });
                
                io.to(room.id).emit('puzzleReset', {
                    type: 'synchronized',
                    message: 'Timing window exceeded. Try again!'
                });
            }, timeWindow);
        }
    }
}

function checkPatternSequence(room, io) {
    const patternSwitches = Array.from(room.switches.values())
        .filter(switchData => switchData.type === 'pattern' && switchData.active);
    
    if (patternSwitches.length > 0) {
        // Check if switches are activated in correct sequence
        const activatedSequence = patternSwitches
            .map(switchData => switchData.sequenceOrder)
            .sort((a, b) => a - b);
        
        const expectedSequence = Array.from({length: patternSwitches.length}, (_, i) => i + 1);
        
        if (JSON.stringify(activatedSequence) === JSON.stringify(expectedSequence)) {
            // Correct sequence - open doors
            io.to(room.id).emit('puzzleSolved', {
                type: 'pattern',
                message: 'Correct sequence! Doors opened!'
            });
        } else {
            // Wrong sequence - reset after delay
            setTimeout(() => {
                patternSwitches.forEach(switchData => {
                    room.switches.set(switchData.id, { ...switchData, active: false });
                });
                
                io.to(room.id).emit('puzzleReset', {
                    type: 'pattern',
                    message: 'Wrong sequence. Try again!'
                });
            }, 1000);
        }
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('joinRoom', (data) => {
        let roomId, playerName;
        
        if (typeof data === 'string') {
            // Legacy support
            roomId = data || 'room1';
            playerName = 'Player';
        } else {
            roomId = data.roomId || 'room1';
            playerName = data.playerName || 'Player';
        }

        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, new GameRoom(roomId));
        }

        const room = gameRooms.get(roomId);
        
        if (room.addPlayer(socket, playerName)) {
            socket.join(roomId);
            socket.roomId = roomId;
            
            // Send current game state to the new player
            socket.emit('gameState', {
                players: room.getPlayersArray(),
                gameState: room.gameState,
                level: room.level,
                playerId: socket.id,
                roomId: roomId
            });

            // Notify all players in the room
            io.to(roomId).emit('playerJoined', {
                players: room.getPlayersArray(),
                gameState: room.gameState
            });

            console.log(`Player ${socket.id} (${playerName}) joined room ${roomId}. Players: ${room.players.size}`);
        } else {
            socket.emit('roomFull');
        }
    });

    socket.on('startGame', () => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            if (room.canStartGame()) {
                room.gameState = 'playing';
                io.to(roomId).emit('gameStarted', {
                    gameState: room.gameState,
                    level: room.level,
                    playerCount: room.players.size
                });
                console.log(`Game started in room ${roomId} with ${room.players.size} players`);
            }
        }
    });

    socket.on('playerMove', (playerData) => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            room.updatePlayer(socket.id, playerData);
            
            // Broadcast player position to all other players in the room
            socket.to(roomId).emit('playerUpdate', {
                playerId: socket.id,
                playerData: playerData
            });
        }
    });

    socket.on('switchActivated', (switchData) => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            
            // Handle different puzzle types
            switch (switchData.type) {
                case 'cooperative':
                    // Store cooperative switch state
                    room.switches.set(switchData.id, { 
                        active: true, 
                        activatedBy: socket.id,
                        playersOnSwitch: switchData.playersOnSwitch,
                        type: 'cooperative'
                    });
                    break;
                    
                case 'synchronized':
                    // Store synchronized switch with timing
                    room.switches.set(switchData.id, { 
                        active: true, 
                        activatedBy: socket.id,
                        activationTime: switchData.activationTime,
                        type: 'synchronized'
                    });
                    
                    // Check if all synchronized switches are active within time window
                    checkSynchronizedSwitches(room, io);
                    break;
                    
                case 'pattern':
                    // Store pattern switch with sequence
                    room.switches.set(switchData.id, { 
                        active: true, 
                        activatedBy: socket.id,
                        sequenceOrder: switchData.sequenceOrder,
                        type: 'pattern'
                    });
                    
                    // Check pattern sequence
                    checkPatternSequence(room, io);
                    break;
                    
                default:
                    // Default behavior
                    room.switches.set(switchData.id, { active: true, activatedBy: socket.id });
            }
            
            // Broadcast switch activation to all players
            io.to(roomId).emit('switchUpdate', {
                switchId: switchData.id,
                active: true,
                activatedBy: socket.id,
                type: switchData.type,
                ...switchData
            });
        }
    });

    socket.on('switchDeactivated', (switchData) => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            room.switches.set(switchData.id, { active: false });
            
            // Broadcast switch deactivation to all players
            io.to(roomId).emit('switchUpdate', {
                switchId: switchData.id,
                active: false
            });
        }
    });

    socket.on('chatMessage', (data) => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            // Broadcast message to all players in the room
            io.to(roomId).emit('chatMessage', {
                message: data.message,
                playerName: data.playerName,
                playerId: socket.id
            });
        }
    });

    socket.on('emojiReaction', (data) => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            // Broadcast emoji reaction to all players in the room
            io.to(roomId).emit('emojiReaction', {
                emoji: data.emoji,
                playerName: data.playerName,
                playerId: socket.id
            });
        }
    });

    socket.on('levelCompleted', (data) => {
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            
            // Update room level
            room.level += 1;
            room.gameState = 'completed';
            
            // Broadcast level completion
            io.to(roomId).emit('levelCompleted', {
                level: data.level,
                nextLevel: room.level,
                playerCount: data.playerCount,
                completionTime: data.completionTime
            });
            
            console.log(`Level ${data.level} completed in room ${roomId} by ${data.playerCount} players`);
            
            // Auto-advance to next level after 3 seconds
            setTimeout(() => {
                room.gameState = 'playing';
                io.to(roomId).emit('nextLevel', {
                    level: room.level,
                    playerCount: room.players.size
                });
            }, 3000);
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        const roomId = socket.roomId;
        if (roomId && gameRooms.has(roomId)) {
            const room = gameRooms.get(roomId);
            const shouldDeleteRoom = room.removePlayer(socket.id);
            
            if (shouldDeleteRoom) {
                gameRooms.delete(roomId);
                console.log(`Room ${roomId} deleted`);
            } else {
                // Notify remaining players
                io.to(roomId).emit('playerLeft', {
                    playerId: socket.id,
                    players: room.getPlayersArray()
                });
                console.log(`Player ${socket.id} left room ${roomId}. Players: ${room.players.size}`);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play the game`);
});
