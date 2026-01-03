import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const App = () => {
  const [roomId, setRoomId] = useState('room1');
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [streamError, setStreamError] = useState(null); // To show if camera failed

  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();

  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  // --- 1. SETUP SOCKETS & CHAT (Runs immediately, no camera needed) ---
  useEffect(() => {
    console.log("Setting up socket listeners...");
    
    // Join the room immediately
    socket.emit('join_room', roomId);

    // Chat Listeners
    socket.on('receive_message', (data) => {
      console.log("Message received:", data);
      setMessages((prev) => [...prev, data]);
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off('receive_message');
    };
  }, [roomId]);


  // --- 2. SETUP MEDIA & WEBRTC (Runs separately) ---
  useEffect(() => {
    // WebRTC Signaling Listeners need to be set up regardless of our camera status
    // so we can at least RECEIVE video if the other person has a camera.
    
    socket.on('user_joined', async (userId) => {
      console.log("User joined room:", userId);
      // Only initiate call if we have a stream? 
      // For this PoC, we try to create an offer anyway, 
      // but without tracks if no stream exists.
      callUser(); 
    });

    socket.on('offer', async (data) => {
      handleOffer(data);
    });

    socket.on('answer', (data) => {
      if (peerRef.current) {
        peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socket.on('ice_candidate', (data) => {
      if (peerRef.current) {
        peerRef.current.addIceCandidate(data.candidate);
      }
    });

    // Initialize Camera
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // If successful, show local video
        if (userVideo.current) userVideo.current.srcObject = stream;
        
        // Save stream to ref or state if you want to add tracks later
        // For this simple PoC, we will assume if stream exists, we use it.
        window.localStream = stream; 
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
        setStreamError("No camera/mic found. Chat will work, video will not.");
      });

    return () => {
      socket.off('user_joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
    };
  }, []);

  // --- WebRTC Functions ---

  const createPeer = () => {
    const peer = new RTCPeerConnection(rtcConfig);

    peer.ontrack = (event) => {
      console.log("Stream received from remote peer");
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { roomId, candidate: event.candidate });
      }
    };

    // If we have a local stream (from the window object we saved earlier), add it.
    if (window.localStream) {
      window.localStream.getTracks().forEach(track => {
        peer.addTrack(track, window.localStream);
      });
    }

    return peer;
  };

  const callUser = async () => {
    console.log("Creating Offer...");
    const peer = createPeer();
    peerRef.current = peer;

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit('offer', { roomId, sdp: offer });
  };

  const handleOffer = async (data) => {
    console.log("Received Offer, creating Answer...");
    const peer = createPeer();
    peerRef.current = peer;

    await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit('answer', { roomId, sdp: answer });
  };

  const sendMessage = () => {
    if (currentMessage !== "") {
        const msgData = { roomId, text: currentMessage, sender: 'User ' + socket.id.substr(0, 4) };
        console.log("Sending message:", msgData);
        socket.emit('send_message', msgData);
        setMessages((prev) => [...prev, msgData]);
        setCurrentMessage('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>WebRTC Live Update!</h1>
      
      {streamError && <div style={{ color: 'red', marginBottom: '10px' }}>{streamError}</div>}

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Local Video */}
        <div>
            <h3>Local</h3>
            <video playsInline muted ref={userVideo} autoPlay style={{ width: '300px', height: '225px', border: '1px solid black', backgroundColor: '#eee' }} />
        </div>
        {/* Remote Video */}
        <div>
            <h3>Remote</h3>
            <video playsInline ref={partnerVideo} autoPlay style={{ width: '300px', height: '225px', border: '1px solid red', backgroundColor: '#eee' }} />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Chat Room: {roomId}</h3>
        <div style={{ border: '1px solid gray', height: '150px', overflowY: 'scroll', marginBottom: '10px', padding: '5px' }}>
          {messages.map((msg, i) => (
            <p key={i} style={{ margin: '5px 0' }}>
                <strong>{msg.sender}:</strong> {msg.text}
            </p>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
            <input 
                value={currentMessage} 
                onChange={(e) => setCurrentMessage(e.target.value)} 
                onKeyPress={(e) => { if(e.key === 'Enter') sendMessage() }}
                placeholder="Type a message..."
                style={{ flex: 1 }}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default App;