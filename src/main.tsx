import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { dbService } from '@/services/db'
import './index.css'

// Expose dbService to the global window object for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).dbService = dbService;
}

createRoot(document.getElementById("root")!).render(<App />);
