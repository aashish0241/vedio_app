// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle signaling data for WebRTC
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('candidate', (data) => {
    socket.broadcast.emit('candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
