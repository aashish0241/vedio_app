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
        localVideo.srcObject = stream;

        // Send stream to other users
        socket.on('user-connected', (userId) => {
            const peerConnection = new RTCPeerConnection();
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('signal', { to: userId, signal: event.candidate });
                }
            };

            peerConnection.ontrack = event => {
                if (!peers[userId]) {
                    const remoteVideo = document.createElement('video');
                    remoteVideo.srcObject = event.streams[0];
                    remoteVideo.autoplay = true;
                    remoteVideos.appendChild(remoteVideo);
                    peers[userId] = remoteVideo;
                }
            };

            socket.on('signal', data => {
                if (data.to === socket.id) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
                }
            });

            peers[userId] = peerConnection;
        });

        // Remove disconnected user
        socket.on('user-disconnected', (userId) => {
            if (peers[userId]) {
                peers[userId].close();
                delete peers[userId];
            }
        });
    })
    .catch(error => console.error('Error accessing media devices.', error));
