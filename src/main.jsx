import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { useAuthStore } from './store/authStore.js'
import './index.css'

// Inicializa a sessão Supabase antes de renderizar (evita flash de /login em usuários autenticados)
useAuthStore.getState().initialize();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)