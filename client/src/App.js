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
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';

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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WebRTC Live Update!
          </Typography>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Grid item xs={3} sx={{ borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6">Rooms</Typography>
            <TextField
              label="My Name"
              variant="standard"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              onBlur={() => setUsername(tempUsername)}
              fullWidth
            />
          </Box>
          <List sx={{ flexGrow: 1, overflow: 'auto' }}>
            {rooms.map((room) => (
              <ListItem key={room} disablePadding secondaryAction={
                <Button size="small" color="error" onClick={() => handleDeleteRoom(room)} sx={{ minWidth: '30px' }}>
                  X
                </Button>
              }>
                <ListItemButton selected={roomId === room} onClick={() => setRoomId(room)}>
                  <ListItemText primary={room} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="New Room"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handleAddRoom}>+</Button>
          </Box>
        </Grid>

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
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom>Local</Typography>
                <Box
                  component="video"
                  playsInline
                  muted
                  ref={userVideo}
                  autoPlay
                  sx={{ width: '100%', height: 'auto', bgcolor: '#eee', borderRadius: 1 }}
                />
              </Paper>
            </Grid>
            {/* Remote Video */}
            <Grid item xs={6}>
              <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom>Remote</Typography>
                <Box
                  component="video"
                  playsInline
                  ref={partnerVideo}
                  autoPlay
                  sx={{ width: '100%', height: 'auto', bgcolor: '#eee', borderRadius: 1, border: '1px solid red' }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Paper variant="outlined" sx={{ height: 200, overflowY: 'auto', p: 2, mb: 2, bgcolor: '#fafafa' }}>
              {messages.map((msg, i) => (
                <Typography key={i} variant="body1" gutterBottom>
                  <strong>{msg.sender}:</strong> {msg.text}
                </Typography>
              ))}
            </Paper>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => { if(e.key === 'Enter') sendMessage() }}
              />
              <Button variant="contained" color="primary" onClick={sendMessage} size="large">
                Send
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default App;