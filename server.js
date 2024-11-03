const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" folder
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room
    socket.on('join-room', (roomID) => {
        socket.join(roomID);
        socket.broadcast.to(roomID).emit('user-connected', socket.id);

        socket.on('disconnect', () => {
            socket.broadcast.to(roomID).emit('user-disconnected', socket.id);
        });

        // Signaling messages for WebRTC
        socket.on('signal', (data) => {
            io.to(data.to).emit('signal', {
                from: socket.id,
                signal: data.signal,
            });
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
