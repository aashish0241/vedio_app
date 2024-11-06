const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

app.set("view engine", "ejs");
app.use(express.static("public"));

// Redirect to a room with a random ID
app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

// Render room page for specific room
app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

// Handle socket connection and room joining
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    // Validate roomId and userId
    if (!roomId || !userId) {
      console.error("Error: Room ID or User ID is missing");
      return; // Return early to prevent further execution
    }

    socket.join(roomId); // User joins the room
    console.log(`${userId} joined room: ${roomId}`);

    // Broadcast to other users in the room that a new user has connected
    socket.to(roomId).broadcast.emit("user-connected", userId);

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`${userId} disconnected`);
      socket.to(roomId).broadcast.emit("user-disconnected", userId); // Emit event when user disconnects
    });
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
