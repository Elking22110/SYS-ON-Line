import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { soundEngine } from "./utils/soundEngine.js";

// Initialize global sound system
soundEngine.preload();

// Global click listener for all interactive elements
document.addEventListener('click', (e) => {
  const target = e.target;
  // Check if the clicked element is a button, a link, or has a pointer cursor
  if (
    target.tagName === 'BUTTON' || 
    target.tagName === 'A' || 
    target.closest('button') || 
    target.closest('a') ||
    window.getComputedStyle(target).cursor === 'pointer'
  ) {
    soundEngine.playClick();
  }
}, true);

// Play subtle startup sound
setTimeout(() => {
  soundEngine.play('startup', 0.4);
}, 1000);
 
ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </HashRouter>
);