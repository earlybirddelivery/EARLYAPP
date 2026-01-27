import { useEffect, useState } from 'react';

/**
 * Custom hook for PWA functionality
 * Provides install prompt, update notifications, and offline detection
 */
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[PWA] App is online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[PWA] App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      console.log('[PWA] Install prompt available');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('[PWA] App installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      const checkForUpdates = () => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
                console.log('[PWA] Update available');
              }
            });
          });
        });
      };

      checkForUpdates();
      const interval = setInterval(checkForUpdates, 60000);

      return () => clearInterval(interval);
    }
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] Install prompt not available');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const reloadApp = () => {
    window.location.reload();
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const sendNotification = (title, options = {}) => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 192 192%27%3E%3Crect fill=%272c3e50%27 width=%27192%27 height=%27192%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2780%27 fill=%27%23fff%27 text-anchor=%27middle%27 dominant-baseline=%27middle%27 font-weight=%27bold%27%3E🍎%3C/text%3E%3C/svg%3E',
          badge: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 96 96%27%3E%3Crect fill=%272c3e50%27 width=%2796%27 height=%2796%27/%3E%3Ctext x=%2748%27 y=%2748%27 font-size=%2760%27 fill=%27%23fff%27 text-anchor=%27middle%27 dominant-baseline=%27middle%27%3E🍎%3C/text%3E%3C/svg%3E',
          tag: 'earlybird-notification',
          requireInteraction: false,
          ...options,
        });
      });
    }
  };

  return {
    isOnline,
    canInstall,
    isInstalled,
    updateAvailable,
    installApp,
    reloadApp,
    requestNotificationPermission,
    sendNotification,
  };
};

export default usePWA;
