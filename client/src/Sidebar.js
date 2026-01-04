import React from 'react';
import { Grid } from '@mui/material';
import SidebarHeader from './SidebarHeader';
import RoomList from './RoomList';
import AddRoomForm from './AddRoomForm';

const Sidebar = ({
  rooms,
  roomId,
  setRoomId,
  tempUsername,
  setTempUsername,
  setUsername,
  newRoomName,
  setNewRoomName,
  handleAddRoom,
  handleDeleteRoom
}) => {
  return (
    <Grid item xs={3} sx={{ borderRight: '1px solid var(--theme-accent)', bgcolor: 'var(--theme-bg)', display: 'flex', flexDirection: 'column' }}>
      <SidebarHeader 
        tempUsername={tempUsername} 
        setTempUsername={setTempUsername} 
        setUsername={setUsername} 
      />
      <RoomList 
        rooms={rooms} 
        roomId={roomId} 
        setRoomId={setRoomId} 
        handleDeleteRoom={handleDeleteRoom} 
      />
      <AddRoomForm 
        newRoomName={newRoomName} 
        setNewRoomName={setNewRoomName} 
        handleAddRoom={handleAddRoom} 
      />
    </Grid>
  );
};

export default Sidebar;