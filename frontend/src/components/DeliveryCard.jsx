import React, { useEffect, useState } from 'react';
import useDeliveryOffline from '@/hooks/useDeliveryOffline';
import './DeliveryCard.css';

/**
 * Example Delivery Card Component
 * Shows a single delivery with offline support
 */
const DeliveryCard = ({ deliveryId, onUpdate }) => {
  const {
    getDeliveryWithPermissions,
    updateDeliveryStatus,
    updateLocation,
    completeDelivery,
    addRemark,
    isOnline,
    syncStats,
  } = useDeliveryOffline();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [gpsWatching, setGpsWatching] = useState(false);

  // Load delivery on mount
  useEffect(() => {
    loadDelivery();
  }, []);

  const loadDelivery = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryWithPermissions(deliveryId);
      setDelivery(data);
    } catch (error) {
      console.error('Error loading delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start GPS tracking
  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    setGpsWatching(true);
    
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          await updateLocation(deliveryId, latitude, longitude, accuracy);
          setDelivery(prev => ({
            ...prev,
            current_latitude: latitude,
            current_longitude: longitude,
            current_accuracy: accuracy,
          }));
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Error getting location: ' + error.message);
        setGpsWatching(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  };

  const stopGPSTracking = () => {
    setGpsWatching(false);
  };

  // Handle mark as complete
  const handleComplete = async () => {
    setUpdating(true);
    try {
      const proof = prompt('Enter proof of delivery (photo URL or note):');
      if (proof) {
        await completeDelivery(deliveryId, proof);
        loadDelivery();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      alert('Error completing delivery: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Handle add remark
  const handleAddRemark = async () => {
    if (!newRemark.trim()) {
      alert('Please enter a remark');
      return;
    }

    setUpdating(true);
    try {
      await addRemark(deliveryId, newRemark);
      setNewRemark('');
      setShowRemarkInput(false);
      loadDelivery();
    } catch (error) {
      alert('Error adding remark: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="delivery-card loading">Loading delivery...</div>;
  }

  if (!delivery) {
    return <div className="delivery-card error">Delivery not found</div>;
  }

  return (
    <div className={`delivery-card ${delivery.status} ${!isOnline ? 'offline' : ''}`}>
      {/* Header */}
      <div className="delivery-header">
        <div className="delivery-info">
          <h3>Delivery #{deliveryId}</h3>
          <p className="customer-name">{delivery.customer_name || 'N/A'}</p>
          <p className="address">{delivery.address || 'N/A'}</p>
        </div>
        <div className="delivery-status">
          <span className={`status-badge ${delivery.status}`}>
            {delivery.status?.toUpperCase()}
          </span>
          {!isOnline && <span className="offline-badge">Offline</span>}
        </div>
      </div>

      {/* Location */}
      <div className="delivery-section">
        <h4>Location</h4>
        {delivery.current_latitude ? (
          <div className="location-info">
            <p>
              <strong>Lat:</strong> {delivery.current_latitude.toFixed(6)}
            </p>
            <p>
              <strong>Lon:</strong> {delivery.current_longitude.toFixed(6)}
            </p>
            <p>
              <strong>Accuracy:</strong> ±{delivery.current_accuracy?.toFixed(0)}m
            </p>
            {delivery.location_updated_at && (
              <p className="timestamp">
                Updated: {new Date(delivery.location_updated_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="no-data">Location not yet captured</p>
        )}

        <div className="location-buttons">
          {!gpsWatching ? (
            <button
              className="btn btn-primary"
              onClick={startGPSTracking}
              disabled={updating || !delivery.permissions.canEditLocation}
            >
              📍 Start GPS Tracking
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={stopGPSTracking}
            >
              ⏹ Stop GPS Tracking
            </button>
          )}
        </div>
      </div>

      {/* Remarks */}
      <div className="delivery-section">
        <h4>Remarks</h4>
        {delivery.remarks && delivery.remarks.length > 0 ? (
          <div className="remarks-list">
            {delivery.remarks.map((remark, idx) => (
              <div key={idx} className="remark-item">
                <p>{remark.text || remark}</p>
                {remark.added_by && (
                  <small>By user {remark.added_by}</small>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No remarks yet</p>
        )}

        {!showRemarkInput ? (
          <button
            className="btn btn-secondary"
            onClick={() => setShowRemarkInput(true)}
            disabled={!delivery.permissions.canAddRemark}
          >
            + Add Remark
          </button>
        ) : (
          <div className="remark-input-group">
            <textarea
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="Enter your remark..."
              rows="3"
              disabled={updating}
            />
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleAddRemark}
                disabled={updating}
              >
                {updating ? 'Saving...' : 'Save Remark'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRemarkInput(false)}
                disabled={updating}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Proof of Delivery */}
      <div className="delivery-section">
        <h4>Proof of Delivery</h4>
        {delivery.proof_of_delivery ? (
          <div className="proof-info">
            <p>✓ Proof recorded</p>
            {delivery.proof_of_delivery.startsWith('http') ? (
              <img 
                src={delivery.proof_of_delivery} 
                alt="Proof" 
                className="proof-image"
              />
            ) : (
              <p className="proof-note">{delivery.proof_of_delivery}</p>
            )}
          </div>
        ) : (
          <p className="no-data">No proof yet</p>
        )}
      </div>

      {/* Action Buttons */}
      {delivery.permissions.canEditStatus && delivery.status !== 'completed' && (
        <div className="delivery-actions">
          <button
            className="btn btn-success"
            onClick={handleComplete}
            disabled={updating}
          >
            {updating ? 'Processing...' : '✓ Mark as Complete'}
          </button>
        </div>
      )}

      {/* Sync Status */}
      {!isOnline && syncStats.pending > 0 && (
        <div className="sync-notice">
          <span className="sync-icon">📤</span>
          Changes will sync when online
        </div>
      )}
    </div>
  );
};

export default DeliveryCard;
