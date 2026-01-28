import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Phone, AlertCircle, Clock, MapPin } from 'lucide-react';

/**
 * DeliveryTrackingMap.jsx - Real-time delivery tracking map
 * Shows delivery boy location, customer location, and delivery status
 */

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DeliveryTrackingMap = ({ deliveryId, onlineId }) => {
  const [tracking, setTracking] = useState(null);
  const [eta, setEta] = useState(null);
  const [path, setPath] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  const mapRef = useRef(null);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/gps/ws/tracking/${deliveryId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('WebSocket connected');
      // Send auth token
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'location_update') {
        setTracking(data.data);
        
        // Add to path history
        if (data.data.current_latitude && data.data.current_longitude) {
          setPath(prev => [...prev, [data.data.current_latitude, data.data.current_longitude]]);
        }
        
        setLoading(false);
      } else if (data.type === 'eta_update') {
        setEta(data.data);
      } else if (data.type === 'pong') {
        // Keep-alive response
      }
    };

    ws.onerror = (error) => {
      setConnectionStatus('error');
      setError('WebSocket connection error');
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    // Send keep-alive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [deliveryId]);

  // Fetch initial tracking data
  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/gps/tracking/${deliveryId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          setTracking(result.data);
          
          if (result.data.current_latitude && result.data.current_longitude) {
            setPath([[result.data.current_latitude, result.data.current_longitude]]);
          }
        }
      } catch (err) {
        setError('Failed to fetch tracking data');
        console.error(err);
      }
    };

    fetchTracking();
  }, [deliveryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery map...</p>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Delivery not found'}</p>
        </div>
      </div>
    );
  }

  const deliveryLocation = tracking.current_latitude && tracking.current_longitude
    ? [tracking.current_latitude, tracking.current_longitude]
    : null;

  // Default center (India)
  const mapCenter = deliveryLocation || [28.7041, 77.1025];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-4 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
            <p className="text-sm text-gray-600">Order: {tracking.order_id || 'N/A'}</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {connectionStatus === 'connected' ? '● Live' :
             connectionStatus === 'error' ? '⚠ Connection Error' :
             '○ Disconnected'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {/* Delivery Boy Current Location */}
            {deliveryLocation && (
              <Marker position={deliveryLocation}>
                <Popup>
                  <div className="font-semibold">Delivery Boy</div>
                  <div className="text-sm">
                    Speed: {tracking.speed_kmh ? `${tracking.speed_kmh} km/h` : 'N/A'}
                  </div>
                  <div className="text-sm">
                    Accuracy: {tracking.accuracy_meters ? `${tracking.accuracy_meters}m` : 'N/A'}
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Path History */}
            {path.length > 1 && (
              <Polyline positions={path} color="blue" weight={3} opacity={0.7} />
            )}
          </MapContainer>
        </div>

        {/* Info Panel */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* ETA Card */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Estimated Arrival</h3>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {tracking.estimated_arrival_time ? 
                  new Date(tracking.estimated_arrival_time).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : 'Calculating...'}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {tracking.distance_remaining_km} km remaining
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {tracking.status || 'In Transit'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Distance Remaining</span>
                  <span className="font-semibold text-gray-900">
                    {tracking.distance_remaining_km} km
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Speed</span>
                  <span className="font-semibold text-gray-900">
                    {tracking.speed_kmh ? `${tracking.speed_kmh} km/h` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Update</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {tracking.last_updated ? 
                      new Date(tracking.last_updated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" />
                Call Delivery Boy
              </button>
              <button className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg hover:bg-gray-300 font-semibold">
                Share Tracking Link
              </button>
            </div>

            {/* Coordinates */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Coordinates
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Current:</span>
                  <span className="text-gray-900 ml-2">
                    {tracking.current_latitude}, {tracking.current_longitude}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="text-gray-900 ml-2">
                    ±{tracking.accuracy_meters || '?'} meters
                  </span>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'connected' && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  {connectionStatus === 'error' ? 
                    'Connection error. Attempting to reconnect...' :
                    'Disconnected. Updates may be delayed.'}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTrackingMap;
