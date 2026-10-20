import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

import { initOfflineSync } from './lib/offlineQueue';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Keep data fresh for 1 minute
      gcTime: 10 * 60 * 1000, // Cache in memory for 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize network connection listeners and offline mutation synchronization
initOfflineSync(queryClient);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
