import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/base.css'
import './styles/stage.css'
import './styles/studio.css'
import './styles/rooms.css'

document.documentElement.dataset.platform = window.api.platform

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
