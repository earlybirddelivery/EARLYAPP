import React, { useState } from 'react';
import useLocationTracking from '@/hooks/useLocationTracking';
import './LocationPermissionModal.css';

/**
 * Location Permission Modal
 * Shown during login for delivery boys and marketing staff
 */
const LocationPermissionModal = ({ role, onPermissionGranted, onSkip }) => {
  const { requestPermissionAndStart, loading, error, hasPermission } = useLocationTracking();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestLocation = async () => {
    setIsRequesting(true);
    try {
      await requestPermissionAndStart();
      // Wait a moment then notify
      setTimeout(() => {
        onPermissionGranted(true);
      }, 500);
    } catch (err) {
      console.error('Error requesting location:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    onPermissionGranted(false);
  };

  const roleConfig = {
    delivery_boy: {
      title: '📍 Enable Location Access',
      description: 'We need your location to track deliveries and provide real-time updates to customers.',
      icon: '🛵',
      benefits: [
        '✓ Real-time tracking for customers',
        '✓ Smart route optimization',
        '✓ Better delivery analytics',
      ],
    },
    marketing_boy: {
      title: '📍 Enable Location for Marketing',
      description: 'Share your location to track field visits and optimize marketing routes.',
      icon: '📊',
      benefits: [
        '✓ Location history for visits',
        '✓ Route optimization',
        '✓ Performance tracking',
      ],
    },
  };

  const config = roleConfig[role] || roleConfig.delivery_boy;

  return (
    <div className="location-permission-modal">
      <div className="modal-overlay"></div>

      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <span className="modal-icon">{config.icon}</span>
          <h2>{config.title}</h2>
        </div>

        {/* Description */}
        <div className="modal-body">
          <p className="description">{config.description}</p>

          {/* Benefits */}
          <div className="benefits">
            <h4>Benefits:</h4>
            <ul>
              {config.benefits.map((benefit, idx) => (
                <li key={idx}>{benefit}</li>
              ))}
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="privacy-notice">
            <span className="lock-icon">🔒</span>
            <p>
              Your location data is encrypted and shared only with authorized personnel.
              You can disable this anytime in settings.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <small>Please enable location in your browser settings and try again.</small>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={handleRequestLocation}
            disabled={isRequesting || loading}
          >
            {isRequesting || loading ? (
              <>
                <span className="spinner-mini"></span>
                Requesting...
              </>
            ) : (
              <>
                <span>✓</span> Enable Location
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSkip}
            disabled={isRequesting || loading}
          >
            Skip for now
          </button>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <small>
            You can enable location anytime in your profile settings.
          </small>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
