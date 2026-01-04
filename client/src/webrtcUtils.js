const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const createPeer = (socket, roomId, myUsername, targetUsername, onStream) => {
  const peer = new RTCPeerConnection(rtcConfig);

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
  const peer = createPeer(socket, roomId, myUsername, targetUsername, onStream);
  peersRef.current.set(targetUsername, peer);

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  socket.emit('offer', { roomId, sdp: offer, sender: myUsername, target: targetUsername });
};

export const handleOffer = async (data, socket, roomId, myUsername, onStream, peersRef) => {
  const sender = data.sender;
  console.log(`Received Offer from ${sender}, creating Answer...`);
  
  const peer = createPeer(socket, roomId, myUsername, sender, onStream);
  peersRef.current.set(sender, peer);

  await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
  // Note: In a robust app, we would handle queued candidates here if they arrived before offer

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
      .catch(err => console.error("Failed to set remote answer:", err));
  }
};

export const handleIceCandidate = (data, peersRef) => {
  const sender = data.sender;
  const currentPeer = peersRef.current.get(sender);

  if (currentPeer) {
    if (currentPeer.remoteDescription) {
      currentPeer.addIceCandidate(data.candidate)
        .catch(e => console.error("Error adding candidate:", e));
    }
    // Note: Queueing logic omitted for brevity in mesh refactor, 
    // but ideally should exist if candidates arrive before remote desc.
  }
};