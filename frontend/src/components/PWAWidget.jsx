import React from 'react';
import usePWA from '@/hooks/usePWA';
import './PWAWidget.css';

/**
 * PWA Widget Component
 * Displays install prompt, offline status, and update notifications
 */
const PWAWidget = () => {
  const {
    isOnline,
    canInstall,
    isInstalled,
    updateAvailable,
    installApp,
    reloadApp,
  } = usePWA();

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="pwa-offline-banner">
          <span className="pwa-offline-icon">📡</span>
          <span className="pwa-offline-text">You are offline - using cached data</span>
        </div>
      )}

      {/* Install Prompt */}
      {canInstall && !isInstalled && (
        <div className="pwa-install-banner">
          <span className="pwa-install-icon">⬇️</span>
          <div className="pwa-install-content">
            <span className="pwa-install-text">Install EarlyBird for quick access</span>
          </div>
          <button className="pwa-install-btn" onClick={installApp}>
            Install
          </button>
          <button className="pwa-dismiss-btn" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <div className="pwa-update-banner">
          <span className="pwa-update-icon">🔄</span>
          <span className="pwa-update-text">New version available</span>
          <button className="pwa-update-btn" onClick={reloadApp}>
            Refresh
          </button>
        </div>
      )}

      {/* Installed Indicator */}
      {isInstalled && (
        <div className="pwa-installed-badge" title="App is installed">
          ✓ App
        </div>
      )}
    </>
  );
};

export default PWAWidget;
