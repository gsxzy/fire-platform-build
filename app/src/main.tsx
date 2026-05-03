import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import './styles/tokens.css'
import './styles/animations.css'
import './styles/components.css'
import './styles/hmi.css'
import './styles/tech.css'
import './styles/utilities.css'
import App from './App.tsx'
import { AuthProvider } from '@/hooks/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
