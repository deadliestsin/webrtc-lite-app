const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const createPeer = (socket, roomId, myUsername, targetUsername, onStream) => {
  const peer = new RTCPeerConnection(rtcConfig);
  peer.iceCandidatesQueue = []; // Queue for candidates arriving before remote description

  peer.ontrack = (event) => {
    console.log("Stream received from remote peer");
    onStream(targetUsername, event.streams[0]);
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice_candidate', { 
        roomId, candidate: event.candidate, sender: myUsername, target: targetUsername 
      });
    }
  };

  // If we have a local stream (from the window object we saved earlier), add it.
  if (window.localStream) {
    window.localStream.getTracks().forEach(track => {
      peer.addTrack(track, window.localStream);
    });
  } else {
    // If no local stream, explicitly ask to receive audio/video
    peer.addTransceiver('audio', { direction: 'recvonly' });
    peer.addTransceiver('video', { direction: 'recvonly' });
  }

  return peer;
};

export const callUser = async (socket, roomId, myUsername, targetUsername, onStream, peersRef) => {
  console.log(`Creating Offer for ${targetUsername}...`);
  // Close existing peer connection if it exists to prevent conflicts
  if (peersRef.current.has(targetUsername)) {
    peersRef.current.get(targetUsername).close();
  }

  onStream(targetUsername, null); // Reset stream to show No Signal

  const peer = createPeer(socket, roomId, myUsername, targetUsername, onStream);
  peersRef.current.set(targetUsername, peer);

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit('offer', { roomId, sdp: offer, sender: myUsername, target: targetUsername });
};

export const handleOffer = async (data, socket, roomId, myUsername, onStream, peersRef) => {
  const sender = data.sender;
  console.log(`Received Offer from ${sender}, creating Answer...`);

  // Close existing peer connection if it exists
  if (peersRef.current.has(sender)) {
    peersRef.current.get(sender).close();
  }
  
  onStream(sender, null); // Reset stream to show No Signal

  const peer = createPeer(socket, roomId, myUsername, sender, onStream);
  peersRef.current.set(sender, peer);

  await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
  
  // Process queued candidates
  while (peer.iceCandidatesQueue.length > 0) {
    const candidate = peer.iceCandidatesQueue.shift();
    peer.addIceCandidate(candidate).catch(e => console.error("Error adding queued candidate:", e));
  }

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit('answer', { roomId, sdp: answer, sender: myUsername, target: sender });
};

export const handleAnswer = (data, peersRef) => {
  const sender = data.sender;
  const currentPeer = peersRef.current.get(sender);
  
  if (currentPeer && currentPeer.signalingState === 'have-local-offer') {
    console.log(`Received Answer from ${sender}`);
    currentPeer.setRemoteDescription(new RTCSessionDescription(data.sdp))
      .then(() => {
        while (currentPeer.iceCandidatesQueue.length > 0) {
          const candidate = currentPeer.iceCandidatesQueue.shift();
          currentPeer.addIceCandidate(candidate).catch(e => console.error("Error adding queued candidate:", e));
        }
      })
      .catch(err => console.error("Failed to set remote answer:", err));
  }
};

export const handleIceCandidate = (data, peersRef) => {
  const sender = data.sender;
  const currentPeer = peersRef.current.get(sender);

  if (currentPeer) {
    if (currentPeer.remoteDescription && currentPeer.remoteDescription.type) {
      currentPeer.addIceCandidate(data.candidate)
        .catch(e => console.error("Error adding candidate:", e));
    } else {
      currentPeer.iceCandidatesQueue.push(data.candidate);
    }
  }
};