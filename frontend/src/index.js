import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

console.log('🟢 index.js loaded');

// Suppress non-critical console warnings in development
// TEMPORARILY DISABLED FOR DEBUGGING
/*
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  // Filter out non-critical warnings
  const warningsToSuppress = [
    'WebSocket connection',
    'ERR_CONNECTION_REFUSED',
    'manifest.json',
    'beforeinstallpromptevent',
    'onAfterSetupMiddleware',
    'onBeforeSetupMiddleware',
    'fs.F_OK is deprecated',
    'fs.constants.F_OK',
  ];
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (!warningsToSuppress.some(warning => message.includes(warning))) {
      originalWarn.apply(console, args);
    }
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (!warningsToSuppress.some(warning => message.includes(warning))) {
      originalError.apply(console, args);
    }
  };
}
*/

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("[PWA] Service Worker registered successfully:", registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every 60 seconds
      })
      .catch((error) => {
        console.log("[PWA] Service Worker registration failed:", error);
      });
  });

  // Listen for controller change (new service worker activated)
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("[PWA] New Service Worker activated");
  });
}

// Enable PWA install prompt
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("[PWA] Install prompt available");
  // You can now show a custom install button
});

window.addEventListener("appinstalled", () => {
  console.log("[PWA] App installed successfully");
  deferredPrompt = null;
});
