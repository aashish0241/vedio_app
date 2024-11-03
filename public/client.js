const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
const peers = {};

// Join a room
const roomID = prompt("Enter room ID");
socket.emit('join-room', roomID);

// Access the user's video and audio
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        // Show the local video stream
        localVideo.srcObject = stream;

        // Notify others that a new user has joined the room
        socket.on('user-connected', (userId) => {
            console.log(`User connected: ${userId}`);
            connectToNewUser(userId, stream);
        });

        // Handle incoming signals from other users
        socket.on('signal', async (data) => {
            if (!peers[data.from]) {
                // Initialize a peer connection if it doesn't already exist
                connectToNewUser(data.from, stream);
            }

            // Apply the received signaling data (either offer or answer)
            const peerConnection = peers[data.from].peerConnection;
            if (data.signal.type === 'offer') {
                await peerConnection.setRemoteDescription(data.signal);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('signal', { to: data.from, signal: answer });
            } else if (data.signal.type === 'answer') {
                await peerConnection.setRemoteDescription(data.signal);
            } else if (data.signal.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
            }
        });

        // Notify when a user disconnects
        socket.on('user-disconnected', (userId) => {
            console.log(`User disconnected: ${userId}`);
            if (peers[userId]) {
                peers[userId].peerConnection.close();
                peers[userId].videoElement.remove();
                delete peers[userId];
            }
        });
    })
    .catch(error => console.error('Error accessing media devices:', error));

// Function to connect to a new user and set up peer connection
function connectToNewUser(userId, stream) {
    const peerConnection = new RTCPeerConnection();

    // Add local stream tracks to the peer connection
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    // Listen for remote stream tracks from the other user
    const remoteVideo = document.createElement('video');
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
            socket.emit('signal', { to: userId, signal: event.candidate });
        }
    };

    // Create an offer to connect with the new user
    peerConnection.createOffer()
        .then((offer) => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('signal', { to: userId, signal: peerConnection.localDescription });
        });

    // Store peer connection and video element
    peers[userId] = { peerConnection, videoElement: remoteVideo };
}
