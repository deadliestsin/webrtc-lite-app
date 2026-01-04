# webrtc-lite-app 🚀

A minimal WebRTC + Socket.io proof-of-concept app for video chat and text messaging.

## Features ✅
- Peer-to-peer video (WebRTC) and chat via Socket.io
- **New:** Modern UI built with Material UI (MUI)
- **New:** Sidebar for creating, joining, and deleting rooms
- **New:** Custom usernames and system notifications (Join/Leave)
- Works even when a user has no camera (chat remains functional)
- Dockerized for easy local setup

## Prerequisites ⚙️
- Node.js >= 16
- npm
- Docker & Docker Compose (optional but recommended)

## Quick Start (Docker) 🐳
1. Build and run everything:

```bash
# from project root
docker-compose up --build
```

2. Open the client in your browser:

- http://localhost:3000 (default for React dev or Docker mapping)

## Quick Start (Local dev) 🔧
- Server
```bash
cd server
npm install
npm start
# server listens on port 5000 (Socket.io)
```

- Client
```bash
cd client
npm install
npm start
# client runs on port 3000 by default
```

Then open two browser windows/tabs to `http://localhost:3000` and join the same room to test chat and video.

## Important Notes 💡
- The client connects to the signaling server at `http://localhost:5000` (see `client/src/App.js`). Ensure the server is running or adjust the URL if you change ports.
- If a user has no camera or camera access is blocked, the app falls back to chat-only mode and displays a notice.
- **Video Limitation:** The app currently supports **1-on-1 video calls**. If a third user joins a room, they can participate in the chat, but the video connection will reset to the most recent pair of users.
- For testing WebRTC locally, use separate browser windows (same machine) or two different devices on the same network.

## Troubleshooting ⚠️
- "No camera/mic found" message: This is expected if the browser blocks or the device lacks a camera. Chat still works.
- Ports in use: change ports in `docker-compose.yml` or the app config if needed.
- **Docker on Windows:** If changes aren't reflecting, ensure `CHOKIDAR_USEPOLLING=true` is set in your environment (already included in `docker-compose.yml`).

## Development Tips ✨
- The React app is in `/client` and the server (Socket.io) is in `/server`.
- The UI now uses `@mui/material`. Check `client/src/App.js` for the main layout logic including the sidebar and video grid.

## Contributing
Feel free to open issues or submit PRs to improve functionality or documentation.

## License
MIT
