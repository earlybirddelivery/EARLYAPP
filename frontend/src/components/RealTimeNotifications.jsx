/**
 * PHASE 4A.2: Real-Time Notifications Component
 * Author: System
 * Date: January 27, 2026
 * Purpose: Display real-time notifications from WebSocket events
 * 
 * Features:
 * - Toast notifications
 * - Notification center with history
 * - Unread badge
 * - Sound/vibration alerts
 * - Notification persistence
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import styles from './RealTimeNotifications.module.css';

/**
 * Toast Notification - Individual notification item
 */
const Toast = ({ 
  notification, 
  onClose, 
  autoCloseDuration = 5000 
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, autoCloseDuration);

    return () => clearTimeout(timer);
  }, [autoCloseDuration, onClose]);

  const levelColors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#0d6efd',
    low: '#198754',
  };

  const getIcon = (eventType) => {
    const iconMap = {
      earning_recorded: '💵',
      delivery_completed: '✅',
      payment_completed: '💳',
      order_confirmed: '📦',
      location_updated: '📍',
      bonus_earned: '🎉',
      payout_completed: '🏦',
    };
    return iconMap[eventType] || '📢';
  };

  return (
    <div
      className={`${styles.toast} ${isExiting ? styles.toastExit : ''}`}
      style={{ borderLeftColor: levelColors[notification.level] }}
    >
      <div className={styles.toastContent}>
        <span className={styles.toastIcon}>{getIcon(notification.type)}</span>
        <div className={styles.toastText}>
          <div className={styles.toastTitle}>{notification.title}</div>
          <div className={styles.toastMessage}>{notification.message}</div>
        </div>
      </div>
      <button
        className={styles.toastClose}
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 300);
        }}
      >
        ×
      </button>
    </div>
  );
};

/**
 * Notification Center - History and management
 */
const NotificationCenter = ({ 
  notifications, 
  onClearAll, 
  onDismiss 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = (index) => {
    // Update notification read status
    const updatedNotifications = [...notifications];
    updatedNotifications[index].read = true;
    // In a real app, persist this
  };

  return (
    <div className={styles.notificationCenter}>
      {/* Bell Icon */}
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>Notifications ({notifications.length})</h3>
            {notifications.length > 0 && (
              <button
                className={styles.clearButton}
                onClick={onClearAll}
              >
                Clear All
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                No notifications yet
              </div>
            ) : (
              notifications
                .slice()
                .reverse()
                .map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${
                      !notification.read ? styles.unread : ''
                    }`}
                    onClick={() => markAsRead(index)}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.itemTitle}>
                        {notification.title}
                      </div>
                      <div className={styles.itemMessage}>
                        {notification.message}
                      </div>
                      <div className={styles.itemTime}>
                        {formatTimeAgo(notification.timestamp)}
                      </div>
                    </div>
                    <button
                      className={styles.itemClose}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(notification.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main Real-Time Notifications Component
 */
const RealTimeNotifications = ({ ws, userId }) => {
  const [toastNotifications, setToastNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const audioRef = useRef(null);

  // Initialize WebSocket listeners
  useEffect(() => {
    if (!ws) return;

    // Listen for all events
    const handleEvent = (event) => {
      const notification = createNotification(event);
      
      // Show toast
      addToast(notification);
      
      // Add to history
      addToHistory(notification);
      
      // Play sound for important events
      if (shouldPlaySound(event.type)) {
        playSound();
      }

      // Show browser notification
      if (shouldShowBrowserNotification(event.type)) {
        showBrowserNotification(notification);
      }
    };

    // Subscribe to events
    ws.on('*', handleEvent);

    return () => {
      ws.off('*', handleEvent);
    };
  }, [ws]);

  const addToast = useCallback((notification) => {
    const id = `toast-${Date.now()}`;
    setToastNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addToHistory = useCallback((notification) => {
    const historyItem = {
      ...notification,
      id: `hist-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };
    setAllNotifications(prev => [historyItem, ...prev].slice(0, 50));
    
    // Persist to localStorage
    localStorage.setItem(
      'notifications',
      JSON.stringify(setAllNotifications)
    );
  }, []);

  const clearHistory = useCallback(() => {
    setAllNotifications([]);
    localStorage.removeItem('notifications');
  }, []);

  const dismissNotification = useCallback((id) => {
    setAllNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const playSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Audio play might be blocked
        });
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* Toast Container */}
      <div className={styles.toastContainer}>
        {toastNotifications.map(notification => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={() => removeToast(notification.id)}
            autoCloseDuration={
              notification.level === 'critical' ? 10000 : 5000
            }
          />
        ))}
      </div>

      {/* Notification Center */}
      <NotificationCenter
        notifications={allNotifications}
        onClearAll={clearHistory}
        onDismiss={dismissNotification}
      />

      {/* Notification Sound */}
      <audio ref={audioRef}>
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function createNotification(event) {
  const notificationMap = {
    earning_recorded: {
      title: '💵 Earning Recorded',
      message: (data) => `You earned ₹${data.amount}`,
    },
    bonus_earned: {
      title: '🎉 Bonus Earned',
      message: (data) => `Bonus: ₹${data.amount}`,
    },
    payout_approved: {
      title: '✅ Payout Approved',
      message: (data) => `₹${data.amount} approved for withdrawal`,
    },
    payout_completed: {
      title: '🏦 Payout Completed',
      message: (data) => `₹${data.amount} transferred to your account`,
    },
    delivery_accepted: {
      title: '📦 Delivery Accepted',
      message: () => 'Your order has been accepted',
    },
    delivery_in_transit: {
      title: '🚗 In Transit',
      message: () => 'Your order is on the way',
    },
    delivery_arrived: {
      title: '📍 Delivery Arrived',
      message: () => 'Delivery boy arrived at your location',
    },
    delivery_completed: {
      title: '✅ Delivered',
      message: () => 'Your order has been delivered',
    },
    order_confirmed: {
      title: '📦 Order Confirmed',
      message: (data) => `Order #${data.order_id} confirmed`,
    },
    payment_completed: {
      title: '💳 Payment Received',
      message: (data) => `₹${data.amount} received successfully`,
    },
    payment_failed: {
      title: '❌ Payment Failed',
      message: (data) => `Payment failed: ${data.reason}`,
    },
    location_updated: {
      title: '📍 Location Updated',
      message: () => 'Delivery location updated',
    },
  };

  const template = notificationMap[event.type] || {
    title: event.type.replace(/_/g, ' '),
    message: () => 'New notification',
  };

  return {
    type: event.type,
    level: event.level,
    title: template.title,
    message: typeof template.message === 'function'
      ? template.message(event.data)
      : template.message,
    data: event.data,
  };
}

function shouldPlaySound(eventType) {
  const soundEventTypes = new Set([
    'earning_recorded',
    'bonus_earned',
    'payout_completed',
    'payment_completed',
    'delivery_completed',
  ]);
  return soundEventTypes.has(eventType);
}

function shouldShowBrowserNotification(eventType) {
  const browserNotificationTypes = new Set([
    'delivery_arrived',
    'delivery_completed',
    'payout_completed',
    'payment_completed',
  ]);
  return browserNotificationTypes.has(eventType);
}

function showBrowserNotification(notification) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/notification-icon.png',
    });
  }
}

function formatTimeAgo(timestamp) {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default RealTimeNotifications;
export { Toast, NotificationCenter };
