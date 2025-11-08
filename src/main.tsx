import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { AfiliadoAuthProvider } from '@/context/AfiliadoAuthContext'
import { installConsoleGuards } from '@/utils/logger'

installConsoleGuards()

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AfiliadoAuthProvider>
        <App />
      </AfiliadoAuthProvider>
    </AuthProvider>
  </React.StrictMode>
);

