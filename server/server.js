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

const users = {}; // Store users: socket.id -> username

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Helper to send counts of all active public rooms
  const sendRoomCounts = () => {
    const counts = {};
    io.sockets.adapter.rooms.forEach((roomData, roomId) => {
      // Filter out private rooms (where roomId is a socket ID)
      if (!users[roomId]) {
        counts[roomId] = roomData.size;
      }
    });
    socket.emit('initial_room_counts', counts);
  };
  sendRoomCounts();
  socket.on('get_counts', sendRoomCounts);

  socket.on('join_room', ({ roomId, username }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room && room.size >= 2) {
      socket.emit('room_full');
      return;
    }

    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);
    socket.join(roomId);
    users[socket.id] = username;
    socket.to(roomId).emit('user_joined', username);

    // Broadcast new count
    const count = io.sockets.adapter.rooms.get(roomId).size;
    io.emit('room_count_update', { roomId, count });
  });

  socket.on('leave_room', (roomId) => {
    if (socket.rooms.has(roomId)) {
      socket.leave(roomId);
      const username = users[socket.id] || 'Anonymous';
      socket.to(roomId).emit('user_left', username);

      // Broadcast new count
      const room = io.sockets.adapter.rooms.get(roomId);
      const count = room ? room.size : 0;
      io.emit('room_count_update', { roomId, count });
    }
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

  socket.on('disconnecting', () => {
    const username = users[socket.id] || 'Anonymous';
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('user_left', username);

        // Broadcast new count (current size - 1 since they are leaving)
        const roomData = io.sockets.adapter.rooms.get(room);
        const count = roomData ? roomData.size - 1 : 0;
        io.emit('room_count_update', { roomId: room, count });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling Server running on port ${PORT}`));