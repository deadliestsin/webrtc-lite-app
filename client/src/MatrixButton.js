import { Button, styled } from '@mui/material';

const MatrixButton = styled(Button)({
  color: 'var(--theme-accent)',
  borderColor: 'var(--theme-accent)',
  border: '1px solid var(--theme-accent)',
  backgroundColor: 'transparent',
  fontFamily: 'monospace',
  '&:hover': {
    backgroundColor: 'var(--theme-bg-hover)',
    boxShadow: 'var(--theme-glow)',
  },
});

export default MatrixButton;