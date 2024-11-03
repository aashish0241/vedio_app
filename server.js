const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Automatically join the default room
    const roomID = "default-room";
    socket.join(roomID);
    console.log(`User ${socket.id} joined the default room`);

    // Notify other users in the room of the new connection
    socket.broadcast.to(roomID).emit('user-connected', socket.id);

    // Handle signaling data for WebRTC
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal,
        });
    });

    // Notify others when a user disconnects
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        socket.broadcast.to(roomID).emit('user-disconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
