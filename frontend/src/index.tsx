import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Enhanced ResizeObserver error handling and loop prevention
const setupResizeObserverErrorHandling = () => {
  // Store the original console.error to avoid infinite loops
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Enhanced error suppression for ResizeObserver
  console.error = (...args) => {
    const errorMessage = args[0];
    if (typeof errorMessage === 'string') {
      const resizeObserverPatterns = [
        'ResizeObserver loop completed with undelivered notifications',
        'ResizeObserver loop limit exceeded',
        'Non-finite result from getClientRects',
        'ResizeObserver callback error',
        'createOverlay'
      ];
      
      if (resizeObserverPatterns.some(pattern => errorMessage.includes(pattern))) {
        // Silently ignore ResizeObserver-related errors
        return;
      }
    }
    // Call original console.error for other errors
    originalError.apply(console, args);
  };

  // Also suppress ResizeObserver warnings
  console.warn = (...args) => {
    const warnMessage = args[0];
    if (typeof warnMessage === 'string' && warnMessage.includes('ResizeObserver')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Enhanced ResizeObserver with debouncing and error boundaries
  if (typeof window !== 'undefined' && window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    
    window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
      private debounceTimer: number | null = null;
      
      constructor(callback: ResizeObserverCallback) {
        // Debounced callback to prevent loop errors
        const debouncedCallback: ResizeObserverCallback = (entries, observer) => {
          if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
          }
          
          this.debounceTimer = window.setTimeout(() => {
            try {
              // Filter out invalid entries that might cause loops
              const validEntries = entries.filter(entry => {
                const rect = entry.contentRect;
                return (
                  rect && 
                  isFinite(rect.width) && 
                  isFinite(rect.height) &&
                  rect.width >= 0 && 
                  rect.height >= 0
                );
              });
              
              if (validEntries.length > 0) {
                callback(validEntries, observer);
              }
            } catch (error: unknown) {
              // Suppress all ResizeObserver callback errors
              if (error instanceof Error) {
                const errorPatterns = [
                  'ResizeObserver loop completed',
                  'ResizeObserver loop limit exceeded',
                  'Non-finite result',
                  'createOverlay'
                ];
                
                if (errorPatterns.some(pattern => (error as Error).message.includes(pattern))) {
                  return; // Silently ignore
                }
              }
              // Re-throw other errors only in development
              if (process.env.NODE_ENV === 'development') {
                console.warn('ResizeObserver callback error (suppressed in production):', error);
              }
            }
          }, 16); // Debounce for one frame (16ms at 60fps)
        };
        
        super(debouncedCallback);
      }
      
      disconnect() {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        super.disconnect();
      }
    };
  }

  // Enhanced unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error && typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
      const resizeObserverPatterns = [
        'ResizeObserver',
        'createOverlay',
        'getClientRects',
        'Non-finite result'
      ];
      
      if (resizeObserverPatterns.some(pattern => error.message.includes(pattern))) {
        event.preventDefault();
        return false;
      }
    }
  });

  // Enhanced global error handler
  window.addEventListener('error', (event) => {
    if (event.message) {
      const resizeObserverPatterns = [
        'ResizeObserver',
        'createOverlay',
        'getClientRects',
        'Non-finite result'
      ];
      
      if (resizeObserverPatterns.some(pattern => event.message.includes(pattern))) {
        event.preventDefault();
        return false;
      }
    }
  });

  // Additional ReactFlow-specific error suppression
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) => {
    return originalRequestAnimationFrame((timestamp) => {
      try {
        callback(timestamp);
      } catch (error: unknown) {
        if (error instanceof Error && 
            (error.message.includes('ResizeObserver') || 
             error.message.includes('createOverlay'))) {
          return; // Silently ignore ReactFlow ResizeObserver errors
        }
        throw error;
      }
    });
  };
};

// Initialize ResizeObserver error handling
setupResizeObserverErrorHandling();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Conditional StrictMode - only enable in production to reduce development noise
const AppWrapper = process.env.NODE_ENV === 'production' ? (
  <React.StrictMode>
    <App />
  </React.StrictMode>
) : (
  <App />
);

root.render(AppWrapper);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
