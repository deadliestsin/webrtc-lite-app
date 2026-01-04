import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import MatrixButton from './MatrixButton';
import MatrixPaper from './MatrixPaper';
import Sidebar from './Sidebar';

const socket = io('http://localhost:5000');

const App = () => {
  const [roomId, setRoomId] = useState('General');
  const [rooms, setRooms] = useState(['General', 'Tech']);
  const [username, setUsername] = useState('User-' + Math.floor(Math.random() * 1000));
  const [tempUsername, setTempUsername] = useState(username); // For input field buffering
  const [newRoomName, setNewRoomName] = useState('');
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
    socket.emit('join_room', { roomId, username });
    setMessages([]); // Clear chat when joining a new room

    // Chat Listeners
    socket.on('receive_message', (data) => {
      console.log("Message received:", data);
      setMessages((prev) => [...prev, data]);
    });

    // Cleanup listeners on unmount
    return () => {
      socket.emit('leave_room', roomId);
      socket.off('receive_message');
    };
  }, [roomId, username]);


  // --- 2. SETUP MEDIA (Runs once on mount) ---
  useEffect(() => {
    // Initialize Camera
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (userVideo.current) userVideo.current.srcObject = stream;
        window.localStream = stream; 
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
        setStreamError("No camera/mic found. Chat will work, video will not.");
      });
  }, []);

  // --- 3. SETUP WEBRTC SIGNALING (Runs when Room ID changes) ---
  useEffect(() => {
    socket.on('user_joined', async (username) => {
      console.log("User joined room:", username);
      setMessages((prev) => [...prev, { text: `${username} joined the room`, sender: 'System' }]);
      // Only initiate call if we have a stream? 
      // For this PoC, we try to create an offer anyway, 
      // but without tracks if no stream exists.
      callUser(); 
    });

    socket.on('user_left', (username) => {
      setMessages((prev) => [...prev, { text: `${username} left the room`, sender: 'System' }]);
    });

    socket.on('offer', async (data) => {
      handleOffer(data);
    });

    socket.on('answer', (data) => {
      const currentPeer = peerRef.current;
      if (currentPeer && currentPeer.signalingState === 'have-local-offer') {
        currentPeer.setRemoteDescription(new RTCSessionDescription(data.sdp))
          .catch(err => console.error("Failed to set remote answer:", err));
      }
    });

    socket.on('ice_candidate', (data) => {
      if (peerRef.current) {
        peerRef.current.addIceCandidate(data.candidate);
      }
    });

    return () => {
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
    };
  }, [roomId]);

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
        const msgData = { roomId, text: currentMessage, sender: username };
        console.log("Sending message:", msgData);
        socket.emit('send_message', msgData);
        setMessages((prev) => [...prev, msgData]);
        setCurrentMessage('');
    }
  };

  const handleAddRoom = () => {
    if (newRoomName && !rooms.includes(newRoomName)) {
      setRooms([...rooms, newRoomName]);
      setNewRoomName('');
    }
  };

  const handleDeleteRoom = (roomToDelete) => {
    const updatedRooms = rooms.filter(r => r !== roomToDelete);
    setRooms(updatedRooms);
    // If we deleted the current room, switch to the first available one
    if (roomId === roomToDelete && updatedRooms.length > 0) {
      setRoomId(updatedRooms[0]);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: 'var(--theme-secondary)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WebRTC Live Update!
          </Typography>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar
          rooms={rooms}
          roomId={roomId}
          setRoomId={setRoomId}
          tempUsername={tempUsername}
          setTempUsername={setTempUsername}
          setUsername={setUsername}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          handleAddRoom={handleAddRoom}
          handleDeleteRoom={handleDeleteRoom}
        />

        {/* Main Content */}
        <Grid item xs={9} sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
          <Typography variant="h5" gutterBottom>
            Room: {roomId}
          </Typography>

          {streamError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {streamError}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Local Video */}
            <Grid item xs={6}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'var(--theme-bg)', border: '1px solid var(--theme-secondary)', color: 'var(--theme-accent)' }}>
                <Typography variant="h6" gutterBottom>Local</Typography>
                <Box
                  component="video"
                  playsInline
                  muted
                  ref={userVideo}
                  autoPlay
                  sx={{ width: '100%', height: 'auto', bgcolor: 'black', borderRadius: 1, border: '1px solid var(--theme-secondary)' }}
                />
              </Paper>
            </Grid>
            {/* Remote Video */}
            <Grid item xs={6}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'var(--theme-bg)', border: '1px solid var(--theme-secondary)', color: 'var(--theme-accent)' }}>
                <Typography variant="h6" gutterBottom>Remote</Typography>
                <Box
                  component="video"
                  playsInline
                  ref={partnerVideo}
                  autoPlay
                  sx={{ width: '100%', height: 'auto', bgcolor: 'black', borderRadius: 1, border: '1px solid var(--theme-secondary)' }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <MatrixPaper variant="outlined" sx={{ height: 200, overflowY: 'auto', p: 2, mb: 2 }}>
              {messages.map((msg, i) => (
                <Typography key={i} variant="body1" gutterBottom sx={{ fontFamily: 'monospace' }}>
                  <strong>{msg.sender}&gt;</strong> {msg.text}
                </Typography>
              ))}
            </MatrixPaper>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => { if(e.key === 'Enter') sendMessage() }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'var(--theme-accent)',
                    fontFamily: 'monospace',
                    '& fieldset': { borderColor: 'var(--theme-secondary)' },
                    '&:hover fieldset': { borderColor: 'var(--theme-accent)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--theme-accent)', boxShadow: 'var(--theme-glow)' },
                  }
                }}
              />
              <MatrixButton onClick={sendMessage} size="large">
                Send
              </MatrixButton>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default App;