import React, { useState, useEffect } from 'react';
import useOfflineData from '@/hooks/useOfflineData';
import './OfflineStatus.css';

/**
 * Offline Status Component
 * Shows offline status, sync status, and pending operations
 */
const OfflineStatus = () => {
  const { isOnline, isSyncing, syncStats, syncData } = useOfflineData();
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncData();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <div className="offline-banner-content">
            <span className="offline-icon">📡</span>
            <div className="offline-text">
              <strong>You are offline</strong>
              <p>Changes will be synced when online</p>
            </div>
            {syncStats.pending > 0 && (
              <span className="pending-badge">{syncStats.pending} pending</span>
            )}
          </div>
        </div>
      )}

      {/* Sync Status */}
      {(syncStats.pending > 0 || syncStats.failed > 0) && (
        <div className={`sync-status ${!isOnline ? 'offline' : 'online'}`}>
          <div className="sync-status-content">
            <span className="sync-icon">
              {isSyncing ? '🔄' : syncStats.failed > 0 ? '⚠️' : '📤'}
            </span>
            <div className="sync-text">
              <p>
                {isSyncing ? 'Syncing...' : `${syncStats.pending} pending, ${syncStats.failed} failed`}
              </p>
            </div>
            {!isSyncing && isOnline && (
              <button 
                className="sync-button"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
            <button 
              className="details-button"
              onClick={() => setShowDetails(!showDetails)}
              aria-label="Toggle details"
            >
              {showDetails ? '▼' : '▶'}
            </button>
          </div>

          {/* Sync Details */}
          {showDetails && (
            <div className="sync-details">
              <div className="detail-row">
                <span>Pending:</span>
                <strong>{syncStats.pending}</strong>
              </div>
              <div className="detail-row">
                <span>Completed:</span>
                <strong>{syncStats.completed}</strong>
              </div>
              <div className="detail-row">
                <span>Failed:</span>
                <strong>{syncStats.failed}</strong>
              </div>
              <div className="detail-row">
                <span>Total:</span>
                <strong>{syncStats.total}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Online Indicator */}
      {isOnline && syncStats.total === 0 && (
        <div className="online-indicator">
          <span className="online-dot"></span>
          Online - All synced
        </div>
      )}
    </>
  );
};

export default OfflineStatus;
