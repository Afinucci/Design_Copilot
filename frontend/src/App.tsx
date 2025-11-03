import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import DiagramEditor from './components/DiagramEditor';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <DiagramEditor />
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
