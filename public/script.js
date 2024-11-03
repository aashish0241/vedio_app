const socket = io();

// Select video elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
let localStream;
let peerConnection;

// WebRTC configuration for STUN servers
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Capture local video and audio stream
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    localVideo.srcObject = stream;
    localStream = stream;

    // Setup peer connection and add local tracks
    peerConnection = new RTCPeerConnection(configuration);
    localStream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, localStream));

    // Handle incoming tracks (audio and video)
    peerConnection.ontrack = (event) => {
      if (remoteVideo.srcObject !== event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };

    // Listen for offers, answers, and ICE candidates
    socket.on("offer", async (offer) => {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", (answer) => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Create and send an offer to the remote peer
    peerConnection
      .createOffer()
      .then((offer) => {
        peerConnection.setLocalDescription(offer);
        socket.emit("offer", offer);
      })
      .catch((error) => console.error("Error creating offer:", error));
  })
  .catch((error) => console.error("Error accessing media devices.", error));
