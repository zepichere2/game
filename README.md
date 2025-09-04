# Pico Park Multiplayer Game

A cooperative multiplayer platformer game similar to Pico Park, built with Node.js, Socket.io, and HTML5 Canvas. Support for 2-10 players working together to solve puzzles and reach the goal.

## Features

- **Real-time Multiplayer**: Up to 10 players can play simultaneously
- **Cooperative Gameplay**: Players must work together to activate switches and open doors
- **Physics-based Movement**: Realistic jumping, gravity, and collision detection
- **Team Puzzles**: Switches that require multiple players to activate
- **Beautiful UI**: Modern, responsive design with player indicators
- **Cross-platform**: Works on any device with a web browser

## Game Mechanics

- **Movement**: Use WASD or Arrow Keys to move, Space to jump
- **Switches**: Some switches require multiple players standing on them
- **Doors**: Linked to switches - open when the required switch is activated
- **Goal**: All players must reach the golden flag area to complete the level
- **Teamwork**: Success requires coordination between all players

## Installation

1. Install Node.js (version 14 or higher)
2. Clone or download this project
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

1. Start the server:
   ```bash
   npm start
   ```
   
2. Open your browser and go to:
   ```
   http://localhost:3000
   ```

3. Share the URL with friends to play together!

## Development

For development with auto-restart:
```bash
npm run dev
```

## Game Controls

- **Movement**: WASD or Arrow Keys
- **Jump**: Space Bar or W/Up Arrow
- **Objective**: Work together to activate all switches and reach the goal

## Technical Details

- **Backend**: Node.js with Express and Socket.io
- **Frontend**: HTML5 Canvas with vanilla JavaScript
- **Real-time Communication**: WebSocket connections via Socket.io
- **Physics**: Custom 2D physics engine with collision detection

## Project Structure

```
├── server.js          # Main server file with game logic
├── package.json       # Dependencies and scripts
├── public/
│   ├── index.html     # Game interface
│   └── game.js        # Client-side game logic
└── README.md          # This file
```

## Contributing

Feel free to contribute by:
- Adding new levels
- Improving game mechanics
- Enhancing the UI/UX
- Fixing bugs
- Adding new features

## License

MIT License - feel free to use and modify as needed!

---

Have fun playing together! 🎮
