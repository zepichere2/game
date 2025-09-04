# 🧩 Pico Park Multiplayer

A Pico Park 2-inspired multiplayer cooperative puzzle game that emphasizes teamwork, communication, and logical problem-solving. Players must work together to solve increasingly complex puzzles that require every team member's participation.

## ✨ Features

### 🎮 Core Gameplay
- **2-8 Player Cooperative Gameplay**: Adaptive levels that scale with player count
- **Logic-Based Puzzles**: Three distinct puzzle types requiring different cooperation strategies
- **Real-Time Multiplayer**: Smooth synchronization using WebSockets
- **Progressive Difficulty**: Levels become more complex as you advance

### 🧠 Puzzle Types
1. **Cooperative Switches** 👥: All players must stand on switches simultaneously
2. **Synchronized Timing** ⏱️: Players must activate switches within a time window
3. **Pattern Recognition** 🔢: Players must follow a specific sequence to unlock doors

### 💬 Communication
- **Team Chat**: Text messaging for strategy discussion
- **Emoji Reactions**: Quick visual communication with 12 different emojis
- **Real-Time Feedback**: Instant puzzle success/failure notifications

### 🎨 Modern UI/UX
- **Minimalistic Design**: Clean, modern interface with glassmorphism effects
- **Responsive Layout**: Optimized for desktop and tablet browsers
- **Accessibility**: Keyboard-friendly controls and colorblind-friendly palettes
- **Visual Feedback**: Clear puzzle type indicators and progress tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 14.0.0 or higher
- Modern web browser with WebSocket support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pico-park-multiplayer.git
   cd pico-park-multiplayer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Mode
```bash
npm run dev
```
This starts the server with auto-reload for development.

## 🎯 How to Play

### Getting Started
1. **Enter your name** in the input field
2. **Create a room** or **join an existing room** using a 6-character code
3. **Share the room code** with friends via the generated link
4. **Start the game** when you have at least 2 players

### Controls
- **WASD** or **Arrow Keys**: Move your character
- **Space**: Jump
- **Click chat button**: Open team communication
- **Right-click chat button**: Open emoji reactions

### Puzzle Strategies

#### 👥 Cooperative Switches
- **Objective**: All players must stand on switches simultaneously
- **Strategy**: Coordinate movement and timing
- **Tip**: Use chat to synchronize your approach

#### ⏱️ Synchronized Timing
- **Objective**: Activate switches within a 2-second window
- **Strategy**: Count down together and activate simultaneously
- **Tip**: Practice timing with emoji reactions

#### 🔢 Pattern Recognition
- **Objective**: Activate switches in the correct numerical sequence
- **Strategy**: Assign each player a number and follow the sequence
- **Tip**: Look for the sequence numbers above each switch

## 🏗️ Technical Architecture

### Frontend
- **Vanilla JavaScript**: No framework dependencies for maximum compatibility
- **HTML5 Canvas**: Smooth 2D rendering with pixel-perfect graphics
- **CSS3**: Modern styling with gradients, shadows, and animations
- **Socket.IO Client**: Real-time communication with the server

### Backend
- **Node.js + Express**: Lightweight server framework
- **Socket.IO**: WebSocket-based real-time communication
- **In-Memory State**: Fast game state management (Redis optional for scaling)

### Game Engine
- **Physics System**: Custom gravity, collision detection, and movement
- **Level Generation**: Dynamic puzzle creation based on player count
- **State Synchronization**: Client-side prediction with server authority

## 🎨 Level Design Philosophy

Each level is designed to require **genuine cooperation** - no single player can complete a level alone. The puzzles are built around:

- **Communication Requirements**: Players must discuss strategies
- **Timing Coordination**: Some puzzles require perfect synchronization
- **Logical Thinking**: Pattern recognition and sequence solving
- **Adaptive Complexity**: Difficulty scales with team size

## 🚀 Deployment

### Environment Variables
```bash
PORT=3000  # Server port (default: 3000)
NODE_ENV=production  # Environment mode
```

### Production Deployment
The game is ready for deployment on platforms like:
- **Heroku**: Simple git-based deployment
- **Vercel**: Serverless deployment with edge functions
- **Railway**: Container-based deployment
- **DigitalOcean**: VPS deployment

### Docker Support
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add comments for complex logic
- Test multiplayer functionality thoroughly
- Update documentation for new features

## 📋 Roadmap

### Version 2.1 (Planned)
- [ ] Level Editor for community-created content
- [ ] Persistent leaderboards and scoring system
- [ ] Sound effects and background music
- [ ] Mobile touch controls optimization

### Version 2.2 (Future)
- [ ] Authentication system with user profiles
- [ ] Tournament mode with brackets
- [ ] Replay system for completed levels
- [ ] Advanced puzzle types (color matching, block pushing)

## 🐛 Known Issues

- Pattern recognition puzzles may reset incorrectly on network lag
- Chat messages don't persist when players disconnect/reconnect
- Mobile browsers may have touch control issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original Pico Park games
- Built with modern web technologies
- Community feedback and testing

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/pico-park-multiplayer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/pico-park-multiplayer/discussions)
- **Email**: support@pico-park-multiplayer.com

---

**Made with ❤️ for cooperative gaming enthusiasts**