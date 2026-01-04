import { Paper, styled } from '@mui/material';

const MatrixPaper = styled(Paper)({
  backgroundColor: 'var(--theme-bg)',
  border: '1px solid var(--theme-accent)',
  color: 'var(--theme-accent)',
  fontFamily: 'monospace',
  boxShadow: 'var(--theme-glow)',
});

export default MatrixPaper;