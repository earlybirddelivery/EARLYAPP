import React, { useEffect, useState, useCallback } from 'react';
import useLocationTracking from '@/hooks/useLocationTracking';
import { calculateETA, formatETA, calculateMultiStopETA } from '@/lib/etaCalculator';
import './CustomerDeliveryTracking.css';

/**
 * Customer Delivery Tracking Page
 * Swiggy/Zomato-like live delivery tracking UI
 */
const CustomerDeliveryTracking = ({ orderId, deliveryId }) => {
  const { location: deliveryBoyLocation } = useLocationTracking();

  const [delivery, setDelivery] = useState(null);
  const [order, setOrder] = useState(null);
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);

  useEffect(() => {
    loadDeliveryData();
    // Refresh every 5 seconds
    const interval = setInterval(loadDeliveryData, 5000);
    return () => clearInterval(interval);
  }, [deliveryId]);

  // Update ETA when location changes
  useEffect(() => {
    if (deliveryBoyLocation && order && delivery) {
      updateETA();
    }
  }, [deliveryBoyLocation]);

  const loadDeliveryData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch delivery details
      const deliveryRes = await fetch(
        `http://localhost:8000/api/deliveries/${deliveryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const deliveryData = await deliveryRes.json();
      setDelivery(deliveryData.delivery);

      // Fetch order details
      const orderRes = await fetch(
        `http://localhost:8000/api/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const orderData = await orderRes.json();
      setOrder(orderData.order);

      // Fetch upcoming deliveries for this boy
      const upcomingRes = await fetch(
        `http://localhost:8000/api/deliveries?delivery_boy_id=${deliveryData.delivery.delivery_boy_id}&status=pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const upcomingData = await upcomingRes.json();
      setUpcomingDeliveries(upcomingData.deliveries || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading delivery data:', error);
      setLoading(false);
    }
  };

  const updateETA = () => {
    if (!deliveryBoyLocation || !order) return;

    const etaData = calculateETA(
      {
        latitude: deliveryBoyLocation.latitude,
        longitude: deliveryBoyLocation.longitude,
      },
      {
        latitude: order.delivery_latitude,
        longitude: order.delivery_longitude,
      },
      upcomingDeliveries
    );

    setEta(etaData);
  };

  if (loading) {
    return (
      <div className="tracking-loading">
        <div className="spinner"></div>
        <p>Loading delivery details...</p>
      </div>
    );
  }

  if (!delivery || !order) {
    return <div className="tracking-error">Delivery not found</div>;
  }

  return (
    <div className="customer-tracking-page">
      {/* Header */}
      <div className="tracking-header">
        <h1>Your Order #{orderId}</h1>
        <p className="order-status">
          {delivery.status === 'in_progress' ? '🚗 On the way' : '📦 Processing'}
        </p>
      </div>

      {/* Live Tracking Map */}
      <div className="tracking-map-container">
        <div className="tracking-map">
          {deliveryBoyLocation ? (
            <>
              {/* Delivery Boy Location */}
              <div
                className="location-marker delivery-boy"
                style={{
                  left: `${(deliveryBoyLocation.longitude + 180) % 360}%`,
                  top: `${((deliveryBoyLocation.latitude + 90) % 180)}%`,
                }}
                title="Delivery Boy Location"
              >
                <span className="marker-icon">🛵</span>
              </div>

              {/* Destination */}
              <div
                className="location-marker destination"
                style={{
                  left: `${(order.delivery_longitude + 180) % 360}%`,
                  top: `${((order.delivery_latitude + 90) % 180)}%`,
                }}
                title="Your Delivery Location"
              >
                <span className="marker-icon">📍</span>
              </div>
            </>
          ) : (
            <div className="map-loading">Loading location...</div>
          )}

          {/* Map Background */}
          <div className="map-background"></div>
        </div>
      </div>

      {/* ETA Card */}
      {eta && (
        <div className="eta-card">
          <div className="eta-main">
            <div className="eta-time">
              <span className="eta-value">{formatETA(eta.minutes)}</span>
              <span className="eta-label">Estimated arrival</span>
            </div>

            <div className="eta-details">
              <div className="eta-item">
                <span className="icon">📍</span>
                <span className="value">{eta.distanceKm} km away</span>
              </div>
              <div className="eta-item">
                <span className="icon">⏱️</span>
                <span className="value">{eta.stops} more stops</span>
              </div>
              <div className="eta-item">
                <span className="icon">⚡</span>
                <span className="value">{eta.avgSpeed} km/h avg</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="eta-progress">
            <div className="progress-label">
              <span>Travel time</span>
              <span>{eta.travelTimeMinutes} mins</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((eta.travelTimeMinutes / eta.minutes) * 100) || 0}%`,
                }}
              ></div>
            </div>

            {eta.stops > 0 && (
              <>
                <div className="progress-label">
                  <span>Stop time ({eta.stops} stops)</span>
                  <span>{eta.stopTimeMinutes} mins</span>
                </div>
                <div className="progress-bar secondary">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${((eta.stopTimeMinutes / eta.minutes) * 100) || 0}%`,
                    }}
                  ></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delivery Boy Info */}
      {delivery.delivery_boy && (
        <div className="delivery-boy-card">
          <div className="boy-header">
            <div className="boy-avatar">
              {delivery.delivery_boy.photo ? (
                <img src={delivery.delivery_boy.photo} alt="Delivery Boy" />
              ) : (
                <span className="avatar-initials">
                  {delivery.delivery_boy.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="boy-info">
              <h3>{delivery.delivery_boy.name}</h3>
              <p className="boy-role">Delivery Partner</p>
              <div className="boy-rating">
                <span className="stars">⭐ {delivery.delivery_boy.rating || 4.5}</span>
                <span className="reviews">({delivery.delivery_boy.reviews || 200} reviews)</span>
              </div>
            </div>

            <div className="boy-actions">
              <button className="action-btn call-btn" title="Call delivery boy">
                📞
              </button>
              <button className="action-btn message-btn" title="Message">
                💬
              </button>
            </div>
          </div>

          {/* Delivery Boy Status */}
          <div className="boy-status">
            <div className="status-item">
              <span className="status-label">Current Speed</span>
              <span className="status-value">
                {deliveryBoyLocation?.speed
                  ? `${(deliveryBoyLocation.speed * 3.6).toFixed(1)} km/h`
                  : 'N/A'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Accuracy</span>
              <span className="status-value">
                ±{deliveryBoyLocation?.accuracy?.toFixed(0) || 'N/A'}m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="order-details-card">
        <h3>Order Details</h3>

        <div className="detail-section">
          <h4>Delivery Address</h4>
          <p className="address-text">
            {order.delivery_address || 'Address not available'}
          </p>
          <p className="address-hint">
            {order.delivery_notes && `Special instructions: ${order.delivery_notes}`}
          </p>
        </div>

        <div className="detail-section">
          <h4>Items</h4>
          <div className="items-list">
            {order.items && order.items.map((item, idx) => (
              <div key={idx} className="item">
                <span className="item-name">{item.name}</span>
                <span className="item-qty">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h4>Expected Arrival</h4>
          <div className="arrival-time">
            <span className="time-icon">🕐</span>
            <span className="time-text">
              {eta ? formatETA(eta.minutes) : 'Calculating...'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-card">
        <h3>Order Timeline</h3>
        <div className="timeline">
          <div className={`timeline-item ${delivery.status === 'completed' ? 'completed' : ''}`}>
            <div className="timeline-dot completed"></div>
            <div className="timeline-content">
              <p className="timeline-title">Order Placed</p>
              <p className="timeline-time">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className={`timeline-item ${delivery.status === 'in_progress' ? 'active' : ''}`}>
            <div className={`timeline-dot ${delivery.status === 'in_progress' ? 'active' : ''}`}></div>
            <div className="timeline-content">
              <p className="timeline-title">On the Way</p>
              <p className="timeline-time">
                {delivery.started_at ? new Date(delivery.started_at).toLocaleString() : 'In progress'}
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <p className="timeline-title">Delivery</p>
              <p className="timeline-time">{eta ? formatETA(eta.minutes) : 'Calculating...'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share & Support */}
      <div className="action-buttons">
        <button className="btn btn-secondary">
          📤 Share Status
        </button>
        <button className="btn btn-secondary">
          ❓ Help & Support
        </button>
      </div>
    </div>
  );
};

export default CustomerDeliveryTracking;
