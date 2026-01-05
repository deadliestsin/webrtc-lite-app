import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import {
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Box,
} from '@mui/material';
import MatrixPaper from './MatrixPaper';
import Sidebar from './Sidebar';
import VideoFeed from './VideoFeed';
import { callUser, handleOffer, handleAnswer, handleIceCandidate } from './webrtcUtils';

// Use environment variable for production, fallback to localhost for dev
const SERVER_URL = process.env.REACT_APP_SERVER_URL || `http://${window.location.hostname}:5000`;
const socket = io(SERVER_URL);

const App = () => {
  const [roomId, setRoomId] = useState(null);
  const [rooms, setRooms] = useState(['General', 'Tech']);
  const [username, setUsername] = useState('User-' + Math.floor(Math.random() * 1000));
  const [tempUsername, setTempUsername] = useState(username); // For input field buffering
  const [newRoomName, setNewRoomName] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null); // To show errors (camera or room full)
  const [roomCounts, setRoomCounts] = useState({}); // { 'General': 2, 'Tech': 1 }
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [headerText, setHeaderText] = useState('777');
  
  const [localStream, setLocalStream] = useState(null);
  const [remotes, setRemotes] = useState([]); // Array of { username, stream }
  const peersRef = useRef(new Map()); // Map<username, RTCPeerConnection>
  const [mediaReady, setMediaReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // --- 0. GLOBAL SOCKET LISTENERS (Counts) ---
  useEffect(() => {
    socket.emit('get_counts'); // Request initial counts on load

    socket.on('initial_room_counts', (counts) => {
      setRoomCounts(counts);
    });
    socket.on('room_count_update', ({ roomId, count }) => {
      setRoomCounts(prev => ({ ...prev, [roomId]: count }));
    });
    return () => {
      socket.off('initial_room_counts');
      socket.off('room_count_update');
    };
  }, []);

  // --- 1. SETUP SOCKETS & CHAT (Runs immediately, no camera needed) ---
  useEffect(() => {
    if (!mediaReady || !roomId) return;
    console.log("Setting up socket listeners...");
    
    // Join the room immediately
    socket.emit('join_room', { roomId, username });
    setMessages([]); // Clear chat when joining a new room
    setRemotes([]); // Clear remotes
    peersRef.current.forEach((peer) => peer.close()); // Close existing connections to prevent leaks
    peersRef.current.clear(); // Clear peers

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
  }, [roomId, username, mediaReady]);


  // --- 2. SETUP MEDIA (Runs once on mount) ---
  useEffect(() => {
    // We no longer auto-connect media. Just mark as ready to join chat.
    setMediaReady(true);
  }, []);

  const toggleStream = async () => {
    if (isStreaming) {
      // Stop Streaming
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setLocalStream(null);
      window.localStream = null;
      setIsStreaming(false);

      // Renegotiate with connected peers to remove the stream
      peersRef.current.forEach((_, remoteUsername) => {
         callUser(socket, roomId, username, remoteUsername, handleRemoteStream, peersRef);
      });
    } else {
      // Start Streaming
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        window.localStream = stream;
        setIsStreaming(true);
        setErrorMessage(null);

        // Renegotiate with connected peers to send them the new stream
        peersRef.current.forEach((_, remoteUsername) => {
           callUser(socket, roomId, username, remoteUsername, handleRemoteStream, peersRef);
        });
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setErrorMessage("ERR_CAM_NOT_FOUND");
      }
    }
  };

  // Helper to add remote stream
  const handleRemoteStream = (remoteUsername, stream) => {
    setRemotes(prev => {
      const existing = prev.find(r => r.username === remoteUsername);
      if (existing) {
        return prev.map(r => r.username === remoteUsername ? { ...r, stream } : r);
      }
      return [...prev, { username: remoteUsername, stream }];
    });
  };

  // --- 3. SETUP WEBRTC SIGNALING (Runs when Room ID changes) ---
  useEffect(() => {
    if (!mediaReady || !roomId) return;
    setErrorMessage(null); // Clear previous errors on join attempt

    socket.on('user_joined', async (newUsername) => {
      console.log("User joined room:", newUsername);
      setMessages((prev) => [...prev, { text: `${newUsername} joined the room`, sender: 'System' }]);
      
      // Limit to 1 remote (1 local + 1 remote = 2 total)
      if (peersRef.current.size >= 1) {
        console.log("Room full for video, not connecting.");
        return;
      }

      // Initiate call to the new user
      callUser(socket, roomId, username, newUsername, handleRemoteStream, peersRef); 
    });

    socket.on('user_left', (leftUsername) => {
      setMessages((prev) => [...prev, { text: `${leftUsername} left the room`, sender: 'System' }]);
      setRemotes(prev => prev.filter(r => r.username !== leftUsername));
      if (peersRef.current.has(leftUsername)) {
        peersRef.current.get(leftUsername).close();
        peersRef.current.delete(leftUsername);
      }
    });

    socket.on('offer', async (data) => {
      if (data.target !== username) return; // Ignore if not for me
      if (!peersRef.current.has(data.sender) && peersRef.current.size >= 1) return; // Enforce limit only for new peers
      handleOffer(data, socket, roomId, username, handleRemoteStream, peersRef);
    });

    socket.on('answer', (data) => {
      if (data.target !== username) return;
      handleAnswer(data, peersRef);
    });

    socket.on('ice_candidate', (data) => {
      if (data.target !== username) return;
      handleIceCandidate(data, peersRef);
    });

    socket.on('room_full', () => {
      setErrorMessage("ERR_ROOM_FULL: ACCESS DENIED");
      setRoomId(null);
    });

    return () => {
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
      socket.off('room_full');
    };
  }, [roomId, username, mediaReady]);

  // --- 4. HEADER ANIMATION ---
  useEffect(() => {
    let currentLen = 7;
    let tick = 0;

    const interval = setInterval(() => {
      if (currentLen <= 3) {
        setHeaderText('777');
        clearInterval(interval);
        return;
      }

      let randomNum = '';
      for (let i = 0; i < currentLen; i++) {
        randomNum += Math.floor(Math.random() * 10);
      }
      setHeaderText(randomNum);

      tick++;
      if (tick > 4) {
        currentLen--;
        tick = 0;
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // --- WebRTC Functions ---

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
      <AppBar position="static" sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
        <Toolbar>
          <Box component="svg" viewBox="0 0 24 24" sx={{ width: 32, height: 32, mr: 2, fill: 'var(--theme-accent)' }}>
            <path d="M16.5 12c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5zm-9 0c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5zm4.5-10c1.1 0 2 .9 2 2v5h-4v-5c0-1.1.9-2 2-2zm5 0c1.1 0 2 .9 2 2v5h-4v-5c0-1.1.9-2 2-2zm-5 8h5c2.21 0 4 1.79 4 4v6c0 1.1-.9 2-2 2h-14c-1.1 0-2-.9-2-2v-6c0-2.21 1.79-4 4-4h5z" />
          </Box>
          <Typography variant="h4" component="div" sx={{ flexGrow: 1, fontFamily: 'var(--theme-font)', letterSpacing: '2px', color: 'var(--theme-accent)' }}>
            {headerText}
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
          roomCounts={roomCounts}
        />

        {/* Main Content */}
        <Grid item xs={9} sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
          {errorMessage && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'var(--theme-error)', boxShadow: '0 0 15px var(--theme-error)' }}>
              <Typography variant="subtitle1" align="center" sx={{ 
                fontFamily: 'var(--theme-font)', 
                fontWeight: 'bold', 
                color: '#000'
              }}>
                {errorMessage}
              </Typography>
            </Box>
          )}

          {!roomId ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h2" sx={{ fontFamily: 'var(--theme-font)', color: 'var(--theme-accent)', mb: 2, textShadow: 'var(--theme-glow)' }}>
                SYSTEM IDLE
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: 'var(--theme-font)', color: 'var(--theme-secondary)' }}>
                &lt; Select a frequency to connect /&gt;
              </Typography>
            </Box>
          ) : (
            <>
          <Typography variant="h5" gutterBottom>
            Room: {roomId} <Typography component="span" variant="body2" sx={{ color: 'var(--theme-secondary)', fontFamily: 'var(--theme-font)' }}>[{roomCounts[roomId] || 1}/2]</Typography>
          </Typography>

          {/* 2 Monitors Layout */}
          <Grid container spacing={1} justifyContent="center">
            {/* Monitor 1: Local User */}
            <Grid item>
              <VideoFeed 
                stream={localStream} 
                isMuted={true} 
                onToggleStream={toggleStream}
                isStreaming={isStreaming}
              />
            </Grid>
            {/* Monitor 2: Remote User or Filler */}
            {remotes.length > 0 ? (
              <Grid item>
                <VideoFeed stream={remotes[0].stream} />
              </Grid>
            ) : (
              <Grid item>
                <VideoFeed />
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 4 }}>
            <MatrixPaper variant="outlined" sx={{ height: 300, display: 'flex', flexDirection: 'column', p: 2 }}>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 1 }}>
                {messages.map((msg, i) => {
                  const isSystem = msg.sender === 'System';
                  return (
                    <Typography key={i} variant="body1" gutterBottom sx={{ 
                      fontFamily: 'var(--theme-font)',
                      color: isSystem ? 'var(--theme-system)' : 'inherit',
                      fontStyle: isSystem ? 'italic' : 'normal'
                    }}>
                      <strong>{msg.sender}&gt;</strong> {msg.text}
                    </Typography>
                  );
                })}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--theme-accent)', pt: 1 }}>
                <Typography variant="body1" sx={{ fontFamily: 'var(--theme-font)', mr: 1, color: 'var(--theme-accent)', fontWeight: 'bold' }}>
                  {username}&gt;
                </Typography>
                <Box sx={{ position: 'relative', flexGrow: 1 }}>
                  {!isInputFocused && currentMessage === '' && (
                    <Typography 
                      component="span" 
                      className="animated-dots"
                      sx={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: 'var(--theme-secondary)', 
                        fontFamily: 'var(--theme-font)',
                        pointerEvents: 'none',
                        lineHeight: 1
                      }} 
                    />
                  )}
                  <Box
                    component="input"
                    autoFocus
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') sendMessage() }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    sx={{
                      width: '100%',
                      bgcolor: 'transparent',
                      border: 'none',
                      color: 'var(--theme-accent)',
                      fontFamily: 'var(--theme-font)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </Box>
              </Box>
            </MatrixPaper>
          </Box>
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default App;