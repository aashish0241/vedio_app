const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideos = document.getElementById("remoteVideos");
const peers = {};

// Automatically join the default room on page load
const roomID = "default-room";
socket.emit("join-room", roomID);

// Access the user's video and audio automatically
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    // Display the local video stream
    localVideo.srcObject = stream;

    // Connect to new users joining the room
    socket.on("user-connected", (userId) => {
      console.log(`New user connected: ${userId}`);
      connectToNewUser(userId, stream);
    });

    // Receive signaling data from other users
    socket.on("signal", async (data) => {
      if (!peers[data.from]) {
        // Create a peer connection if it doesn't exist
        connectToNewUser(data.from, stream);
      }

      const peerConnection = peers[data.from].peerConnection;
      if (data.signal.type === "offer") {
        await peerConnection.setRemoteDescription(data.signal);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("signal", { to: data.from, signal: answer });
      } else if (data.signal.type === "answer") {
        await peerConnection.setRemoteDescription(data.signal);
      } else if (data.signal.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
      }
    });

    // Handle when a user disconnects
    socket.on("user-disconnected", (userId) => {
      if (peers[userId]) {
        peers[userId].peerConnection.close();
        peers[userId].videoElement.remove();
        delete peers[userId];
      }
    });
  })
  .catch((error) => console.error("Error accessing media devices:", error));

// Function to connect to a new user and set up peer connection
function connectToNewUser(userId, stream) {
  const peerConnection = new RTCPeerConnection();

  // Add local stream tracks to the peer connection
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  // Listen for remote stream tracks from the other user
  const remoteVideo = document.createElement("video");
  remoteVideo.autoplay = true;
  remoteVideos.appendChild(remoteVideo);

  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", { to: userId, signal: event.candidate });
    }
  };

  // Create an offer to connect with the new user
  peerConnection
    .createOffer()
    .then((offer) => {
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      socket.emit("signal", {
        to: userId,
        signal: peerConnection.localDescription,
      });
    });

  // Store peer connection and video element
  peers[userId] = { peerConnection, videoElement: remoteVideo };
}
