import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import type { SkyscopeAPI } from '../preload'

// Declare global window with skyscope API
declare global {
  interface Window {
    skyscope: SkyscopeAPI
  }
}

// Get the API from the preload script
const api = window.skyscope

// Create root element
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

// Create React root and render App
const root = ReactDOM.createRoot(rootElement)
root.render(
  <React.StrictMode>
    <App api={api} />
  </React.StrictMode>
)
