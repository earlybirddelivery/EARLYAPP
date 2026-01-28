/**
 * gpsService.js - GPS tracking API wrapper
 * Handles all GPS-related API calls and WebSocket connections
 */

class GPSService {
  constructor() {
    this.baseUrl = '/api/gps';
    this.ws = null;
    this.listeners = {};
  }

  /**
   * Get authorization token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('token');
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expired, redirect to login
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Start tracking a delivery
   */
  async startTracking(deliveryId) {
    return this.request(`/tracking/start/${deliveryId}`, {
      method: 'POST',
    });
  }

  /**
   * Update delivery location (real-time)
   */
  async updateLocation(deliveryId, latitude, longitude, speed = null, accuracy = null) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      ...(speed !== null && { speed }),
      ...(accuracy !== null && { accuracy }),
    });

    return this.request(`/tracking/update/${deliveryId}?${params}`, {
      method: 'POST',
    });
  }

  /**
   * End tracking for a delivery
   */
  async endTracking(deliveryId) {
    return this.request(`/tracking/end/${deliveryId}`, {
      method: 'POST',
    });
  }

  /**
   * Get current tracking data for a delivery
   */
  async getTracking(deliveryId) {
    return this.request(`/tracking/${deliveryId}`);
  }

  /**
   * Get location history for a delivery
   */
  async getTrackingHistory(deliveryId, limit = 100, offset = 0) {
    const params = new URLSearchParams({ limit, offset });
    return this.request(`/tracking/${deliveryId}/history?${params}`);
  }

  /**
   * Get all active deliveries
   */
  async getActiveDeliveries() {
    return this.request('/deliveries/active');
  }

  /**
   * Calculate ETA
   */
  async calculateETA(currentLat, currentLon, destLat, destLon, speed = 15) {
    const params = new URLSearchParams({
      current_latitude: currentLat,
      current_longitude: currentLon,
      destination_latitude: destLat,
      destination_longitude: destLon,
      average_speed_kmh: speed,
    });

    return this.request(`/eta?${params}`);
  }

  /**
   * Connect to WebSocket for real-time tracking updates
   */
  connectWebSocket(deliveryId, onMessage, onError, onClose) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${this.baseUrl}/ws/tracking/${deliveryId}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Send auth token
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.getAuthToken(),
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
        // Emit to listeners
        this.emit('message', data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) {
        onError(error);
      }
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (onClose) {
        onClose();
      }
      this.emit('close');
    };

    return this.ws;
  }

  /**
   * Send a message through WebSocket
   */
  sendWebSocketMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Close WebSocket connection
   */
  closeWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Keep-alive ping
   */
  sendPing() {
    this.sendWebSocketMessage({ type: 'ping' });
  }

  /**
   * Request location update
   */
  requestLocationUpdate(latitude, longitude, speed = null, accuracy = null) {
    this.sendWebSocketMessage({
      type: 'location_update',
      latitude,
      longitude,
      ...(speed !== null && { speed }),
      ...(accuracy !== null && { accuracy }),
    });
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Get geolocation from device
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Watch device location changes
   */
  watchLocation(onLocationChange, onError = null) {
    if (!navigator.geolocation) {
      if (onError) onError(new Error('Geolocation not supported'));
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        onLocationChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
        });
      },
      (error) => {
        if (onError) onError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  /**
   * Clear location watch
   */
  clearLocationWatch(watchId) {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format distance for display
   */
  static formatDistance(km) {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(2)}km`;
  }

  /**
   * Format time in HH:MM AM/PM format
   */
  static formatTime(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format time remaining
   */
  static formatTimeRemaining(minutes) {
    if (minutes < 1) {
      return '< 1 min';
    }
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }

  /**
   * Get speed category
   */
  static getSpeedCategory(speedKmh) {
    if (!speedKmh) return 'stationary';
    if (speedKmh < 5) return 'slow';
    if (speedKmh < 15) return 'normal';
    if (speedKmh < 30) return 'fast';
    return 'very_fast';
  }

  /**
   * Validate coordinates
   */
  static validateCoordinates(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return false;
    }
    if (lat < -90 || lat > 90) {
      return false;
    }
    if (lon < -180 || lon > 180) {
      return false;
    }
    return true;
  }
}

// Create singleton instance
const gpsService = new GPSService();

export default gpsService;
