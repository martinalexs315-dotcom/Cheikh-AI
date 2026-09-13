import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ChatInterface from './components/ChatInterface.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ChatInterface />
    </AuthProvider>
  </StrictMode>,
);
