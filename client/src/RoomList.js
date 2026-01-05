import React from 'react';
import { List, ListItem, ListItemButton, ListItemText, Typography, Box } from '@mui/material';
import MatrixButton from './MatrixButton';

const RoomList = ({ rooms, roomId, setRoomId, handleDeleteRoom, roomCounts }) => {
  return (
    <List sx={{ flexGrow: 1, overflow: 'auto' }}>
      {rooms.map((room) => (
        <ListItem key={room} disablePadding secondaryAction={
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <Typography variant="body1" sx={{ color: 'var(--theme-accent)', fontFamily: 'var(--theme-font)', mr: 2, fontWeight: 'bold' }}>
              {roomCounts[room] || 0}/2
            </Typography>
          <MatrixButton 
            size="small" 
            onClick={() => handleDeleteRoom(room)} 
            sx={{ 
              minWidth: '30px', 
              height: '30px',
              padding: 0,
              border: 'none', 
              fontSize: '1.2rem', 
              color: 'var(--theme-accent)', 
              '&:hover': { 
                backgroundColor: 'var(--theme-accent)', 
                color: 'var(--theme-bg)' 
              } 
            }}
          >
            X
          </MatrixButton>
          </Box>
        }>
          <ListItemButton 
            selected={roomId === room} 
            onClick={() => setRoomId(room)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'var(--theme-bg-hover)',
                borderLeft: '4px solid var(--theme-accent)',
                '&:hover': { bgcolor: 'var(--theme-bg-hover)' }
              },
              '&:hover': { bgcolor: 'var(--theme-bg-hover)' }
            }}
          >
            <ListItemText 
              primary={room} 
              primaryTypographyProps={{ fontFamily: 'var(--theme-font)', color: 'var(--theme-accent)' }} 
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default RoomList;