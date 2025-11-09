import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { AfiliadoAuthProvider } from '@/context/AfiliadoAuthContext'
import { installConsoleGuards } from '@/utils/logger'
import { InventoryProvider } from '@/context/InventoryContext'

installConsoleGuards()

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AfiliadoAuthProvider>
        <InventoryProvider>
        <App />
        </InventoryProvider>
      </AfiliadoAuthProvider>
    </AuthProvider>
  </React.StrictMode>
);

