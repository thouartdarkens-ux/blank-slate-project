
import { createRoot } from 'react-dom/client'
import React from 'react' // Add explicit React import
import App from './App.tsx'
import './index.css'

// Ensure React is available in the global scope for components that might look for it there
window.React = React

createRoot(document.getElementById("root")!).render(
  <App />
);
