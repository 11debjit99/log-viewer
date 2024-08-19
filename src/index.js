import React from 'react';
import { createRoot } from 'react-dom/client'; // Update import path to react-dom/client
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
