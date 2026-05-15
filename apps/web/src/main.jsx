import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import faviconUrl from './assets/favicon.png'
import './index.css'
import App from './App.jsx'
import { AuthBootstrap } from './router/AuthBootstrap.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'

let faviconLink = document.querySelector("link[rel='icon']")
if (!faviconLink) {
  faviconLink = document.createElement('link')
  faviconLink.rel = 'icon'
  document.head.appendChild(faviconLink)
}
faviconLink.type = 'image/png'
faviconLink.href = faviconUrl

const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <ThemeProvider>
        <AuthBootstrap>
          <App />
          <Toaster position="top-center" />
        </AuthBootstrap>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
