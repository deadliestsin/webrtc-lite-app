const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for this PoC
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', socket.id);
  });

  // Relay WebRTC Offers
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', data);
  });

  // Relay WebRTC Answers
  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', data);
  });

  // Relay ICE Candidates (Network paths)
  socket.on('ice_candidate', (data) => {
    socket.to(data.roomId).emit('ice_candidate', data);
  });

  // Simple Chat Message Relay
  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling Server running on port ${PORT}`));