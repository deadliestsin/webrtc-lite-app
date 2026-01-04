import React from 'react';
import { Box, Typography, TextField } from '@mui/material';

const SidebarHeader = ({ tempUsername, setTempUsername, setUsername }) => {
  return (
    <Box sx={{ p: 2, borderBottom: '1px solid var(--theme-secondary)' }}>
      <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'var(--theme-accent)' }}>Rooms</Typography>
      <TextField
        label="My Name"
        variant="standard"
        value={tempUsername}
        onChange={(e) => setTempUsername(e.target.value)}
        onBlur={() => setUsername(tempUsername)}
        fullWidth
        sx={{
          '& .MuiInput-root': { color: 'var(--theme-accent)', fontFamily: 'monospace' },
          '& .MuiInput-underline:before': { borderBottomColor: 'var(--theme-secondary)' },
          '& .MuiInput-underline:after': { borderBottomColor: 'var(--theme-accent)' },
          '& .MuiInputLabel-root': { color: 'var(--theme-accent)', fontFamily: 'monospace' },
        }}
      />
    </Box>
  );
};

export default SidebarHeader;