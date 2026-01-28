/**
 * PHASE 4A.2: WebSocket Client Service
 * Author: System
 * Date: January 27, 2026
 * Purpose: Client-side WebSocket connection management and event handling
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Event subscription management
 * - Message queuing during disconnection
 * - Heartbeat/keepalive mechanism
 * - Event filtering and routing
 * - TypeScript support
 */

class WebSocketService {
  constructor(url = null, token = null, userId = null) {
    this.url = url || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/websocket/ws`;
    this.token = token;
    this.userId = userId;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.subscriptions = new Set();
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 30000; // 30 seconds
  }

  /**
   * Connect to WebSocket server
   * Handles authentication and initial setup
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WS] Connected to server');
          
          // Send authentication
          const authMessage = {
            type: 'auth',
            token: this.token,
            user_id: this.userId,
            user_role: this.getUserRole(),
            timestamp: new Date().toISOString(),
          };
          
          this.ws.send(JSON.stringify(authMessage));
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Setup heartbeat
          this.setupHeartbeat();
          
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Connection error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WS] Connection closed');
          this.isConnected = false;
          this.clearHeartbeat();
          this.attemptReconnect();
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connection_established':
          console.log('[WS] Connection established:', message.connection_id);
          break;

        case 'authenticated':
          console.log('[WS] Authenticated as:', message.user_id);
          this.isConnected = true;
          this.flushMessageQueue();
          break;

        case 'heartbeat_ack':
          console.debug('[WS] Heartbeat acknowledged');
          break;

        case 'subscription_updated':
          console.log('[WS] Subscription updated');
          break;

        case 'error':
          console.error('[WS] Server error:', message.message);
          this.emit('error', message);
          break;

        default:
          // Route event to handlers
          this.routeEvent(message);
          break;
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }

  /**
   * Route event to registered handlers
   */
  routeEvent(event) {
    const { event_type, event_level, user_id, data, timestamp } = event;

    // Log event
    console.debug(`[WS Event] ${event_type} (${event_level}):`, data);

    // Emit to all handlers
    if (this.eventHandlers.has(event_type)) {
      const handlers = this.eventHandlers.get(event_type);
      handlers.forEach(handler => {
        try {
          handler({
            type: event_type,
            level: event_level,
            userId: user_id,
            data,
            timestamp: new Date(timestamp),
          });
        } catch (error) {
          console.error(`[WS] Handler error for ${event_type}:`, error);
        }
      });
    }

    // Emit to wildcard handlers
    if (this.eventHandlers.has('*')) {
      const handlers = this.eventHandlers.get('*');
      handlers.forEach(handler => {
        try {
          handler({
            type: event_type,
            level: event_level,
            userId: user_id,
            data,
            timestamp: new Date(timestamp),
          });
        } catch (error) {
          console.error('[WS] Wildcard handler error:', error);
        }
      });
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(eventTypes) {
    if (!Array.isArray(eventTypes)) {
      eventTypes = [eventTypes];
    }

    const subscriptionMessage = {
      type: 'subscribe',
      events: eventTypes,
    };

    eventTypes.forEach(evt => this.subscriptions.add(evt));
    this.send(subscriptionMessage);
    console.log('[WS] Subscribed to:', eventTypes);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventTypes) {
    if (!Array.isArray(eventTypes)) {
      eventTypes = [eventTypes];
    }

    const unsubscribeMessage = {
      type: 'unsubscribe',
      events: eventTypes,
    };

    eventTypes.forEach(evt => this.subscriptions.delete(evt));
    this.send(unsubscribeMessage);
    console.log('[WS] Unsubscribed from:', eventTypes);
  }

  /**
   * Register event handler
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
    console.log(`[WS] Handler registered for ${eventType}`);
  }

  /**
   * Remove event handler
   */
  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        console.log(`[WS] Handler removed for ${eventType}`);
      }
    }
  }

  /**
   * Emit event (internal)
   */
  emit(eventType, data) {
    this.routeEvent({
      event_type: eventType,
      event_level: 'medium',
      user_id: this.userId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message through WebSocket
   */
  send(message) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.warn('[WS] Message queued (not connected)');
    }
  }

  /**
   * Flush queued messages
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
    console.log('[WS] Message queue flushed');
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  setupHeartbeat() {
    this.clearHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        };
        this.ws.send(JSON.stringify(heartbeat));
        console.debug('[WS] Heartbeat sent');
      }
    }, this.heartbeatTimeout);
  }

  /**
   * Clear heartbeat interval
   */
  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        30000 // Max 30 seconds
      );

      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('[WS] Reconnection failed:', error);
          this.attemptReconnect();
        });
      }, delay);
    } else {
      console.error('[WS] Max reconnection attempts reached');
      this.emit('connection_failed', {
        reason: 'Max reconnection attempts',
      });
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.clearHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('[WS] Disconnected');
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
      queuedMessages: this.messageQueue.length,
    };
  }

  /**
   * Get user role from localStorage or context
   */
  getUserRole() {
    return localStorage.getItem('user_role') || 'customer';
  }
}

// Export for use in React components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketService;
}
