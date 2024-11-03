// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Handle new connections and incoming messages
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Broadcast incoming messages to all connected clients
  socket.on('message', (message) => {
    io.emit('message', { id: socket.id, text: message });
  });

  // Notify others when a user disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    io.emit('message', { id: socket.id, text: 'User disconnected' });
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
