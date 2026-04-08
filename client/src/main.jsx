import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios';
import './index.css'
import App from './App.jsx'
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// Debug: print resolved backend URL at runtime
try {
  // Vite injects env variables at build time
  // eslint-disable-next-line no-console
  console.debug('VITE_BACKEND_URL=', import.meta.env.VITE_BACKEND_URL);
} catch (e) {}

// Ensure axios uses the local backend in dev when env is absent or incorrect
try {
  const resolved = import.meta.env.VITE_BACKEND_URL || 'http://localhost:6100';
  axios.defaults.baseURL = resolved;
  console.debug('axios.baseURL set to', axios.defaults.baseURL);
} catch (e) {}

// Dev helper: auto-set a sample employeeId when running locally and none exists
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  try {
    if (!localStorage.getItem('employeeId')) {
      // Fallback dev id inserted by sample script
      try {
        localStorage.setItem('employeeId', '69d675400a06992a9e9b716a');
        console.debug('Dev: set hardcoded sample employeeId');
      } catch (e) {}
    }
  } catch (e) {}
}
// Dev convenience: if landing on employee login, redirect to prescription report
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  try {
    const path = window.location.pathname || '/';
    if (path.includes('employee-login')) {
      try {
        localStorage.setItem('employeeId', '69d675400a06992a9e9b716a');
      } catch (e) {}
      window.location.replace('/employee/prescription-report');
    }
  } catch (e) {}
}
createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
)