import React from 'react';
import { Box, TextField } from '@mui/material';
import MatrixButton from './MatrixButton';

const AddRoomForm = ({ newRoomName, setNewRoomName, handleAddRoom }) => {
  return (
    <Box sx={{ p: 2, borderTop: '1px solid var(--theme-accent)', display: 'flex', gap: 1 }}>
      <TextField
        size="small"
        placeholder="New Room"
        value={newRoomName}
        onChange={(e) => setNewRoomName(e.target.value)}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            color: 'var(--theme-accent)',
            fontFamily: 'var(--theme-font)',
            '& fieldset': { borderColor: 'var(--theme-secondary)' },
            '&:hover fieldset': { borderColor: 'var(--theme-accent)', boxShadow: 'var(--theme-glow)' },
            '&.Mui-focused fieldset': { borderColor: 'var(--theme-accent)', boxShadow: 'var(--theme-glow)' },
          },
          '& .MuiInputBase-input': { color: 'var(--theme-accent)' }
        }}
      />
      <MatrixButton onClick={handleAddRoom}>+</MatrixButton>
    </Box>
  );
};

export default AddRoomForm;