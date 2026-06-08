import React from 'react';
import ReactDOM from 'react-dom/client';
import { OpenAPI } from '@dealer-marketplace/client';
import App from './App.tsx';
import './index.css';

OpenAPI.BASE = import.meta.env.VITE_API_URL ?? '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
