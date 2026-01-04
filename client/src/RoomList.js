import React from 'react';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import MatrixButton from './MatrixButton';

const RoomList = ({ rooms, roomId, setRoomId, handleDeleteRoom }) => {
  return (
    <List sx={{ flexGrow: 1, overflow: 'auto' }}>
      {rooms.map((room) => (
        <ListItem key={room} disablePadding secondaryAction={
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
            <ListItemText primary={room} primaryTypographyProps={{ fontFamily: 'var(--theme-font)', color: 'var(--theme-accent)' }} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default RoomList;