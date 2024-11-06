const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "/",
  port: "3001",
});
const myVideo = document.createElement("video");
myVideo.muted = false;
const peers = {};

// Ensure ROOM_ID is available
const ROOM_ID = window.location.pathname.split("/")[1]; // Extract room ID from URL

// Check if ROOM_ID is undefined or invalid
if (!ROOM_ID) {
  console.error("ROOM_ID is undefined!");
  alert("Room ID is missing or invalid. Please check the URL and try again.");
  throw new Error("ROOM_ID is missing"); // Throw error to stop further execution
}

// Access the user's media (video and audio)
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    // Add the user's own video stream to the grid
    addVideoStream(myVideo, stream);

    // Handle incoming calls
    myPeer.on("call", (call) => {
      call.answer(stream); // Answer the call with the current stream
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream); // Add the incoming user's stream
      });
    });

    // When a new user connects, initiate a call to them
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });

    // Handle user disconnection
    socket.on("user-disconnected", (userId) => {
      if (peers[userId]) {
        peers[userId].close(); // Close the peer connection when the user disconnects
      }
    });

    // Emit the 'join-room' event when the peer connection is open
    myPeer.on("open", (id) => {
      socket.emit("join-room", ROOM_ID, id);
    });
  })
  .catch((err) => {
    console.error("Error accessing media devices:", err);
  });

// Function to connect to a new user when they join the room
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream); // Call the new user with the stream
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream); // Add the new user's video stream
  });
  call.on("close", () => {
    video.remove(); // Remove the video element when the user disconnects
  });

  peers[userId] = call; // Store the call in the peers object to manage it
}

// Function to add a video stream to the grid
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play(); // Start playing the video once metadata is loaded
  });
  videoGrid.append(video); // Append the video to the grid
}
