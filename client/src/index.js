// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // <--- THIS LINE IS CRUCIAL FOR TAILWIND STYLES
import App from './App';

// Create a React root to render our application into the DOM
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component wrapped in React.StrictMode for development checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);