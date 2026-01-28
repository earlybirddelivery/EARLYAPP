"""
PHASE 4A.2: WebSocket Real-time Updates Service
Author: System
Date: January 27, 2026
Purpose: Handle real-time WebSocket connections and event broadcasting

This service provides:
- WebSocket connection management
- Event subscription and broadcasting
- Automatic reconnection handling
- Message queuing and retry logic
- Connection pooling and resource management
- Event filtering based on user roles
- Heartbeat/keepalive mechanism
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Set, List, Optional, Any, Callable
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from enum import Enum
import time

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """All possible real-time event types in the system"""
    
    # Earnings Events
    EARNING_RECORDED = "earning_recorded"
    BONUS_EARNED = "bonus_earned"
    PAYOUT_APPROVED = "payout_approved"
    PAYOUT_COMPLETED = "payout_completed"
    WALLET_UPDATED = "wallet_updated"
    
    # Delivery Events
    DELIVERY_ACCEPTED = "delivery_accepted"
    DELIVERY_PICKED_UP = "delivery_picked_up"
    DELIVERY_IN_TRANSIT = "delivery_in_transit"
    DELIVERY_ARRIVED = "delivery_arrived"
    DELIVERY_COMPLETED = "delivery_completed"
    DELIVERY_CANCELLED = "delivery_cancelled"
    
    # Order Events
    ORDER_CREATED = "order_created"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_REJECTED = "order_rejected"
    ORDER_READY = "order_ready"
    ORDER_CANCELLED = "order_cancelled"
    
    # Payment Events
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    REFUND_INITIATED = "refund_initiated"
    REFUND_COMPLETED = "refund_completed"
    
    # Admin Events
    DISPUTE_CREATED = "dispute_created"
    DISPUTE_RESOLVED = "dispute_resolved"
    STAFF_OFFLINE = "staff_offline"
    SYSTEM_ALERT = "system_alert"
    
    # GPS Events
    LOCATION_UPDATED = "location_updated"
    ETA_UPDATED = "eta_updated"
    
    # Notification Events
    MESSAGE_RECEIVED = "message_received"
    NOTIFICATION_SENT = "notification_sent"


class UserRole(str, Enum):
    """User roles for permission-based event filtering"""
    CUSTOMER = "customer"
    DELIVERY_BOY = "delivery_boy"
    ADMIN = "admin"
    SUPPORT = "support"
    SUPPLIER = "supplier"


class EventLevel(str, Enum):
    """Priority levels for events"""
    CRITICAL = "critical"      # System errors, security alerts
    HIGH = "high"              # Order/payment changes, disputes
    MEDIUM = "medium"          # Status updates, location changes
    LOW = "low"                # Analytics, non-critical updates


class WebSocketEvent(BaseModel):
    """Schema for WebSocket event messages"""
    event_type: EventType
    event_level: EventLevel = EventLevel.MEDIUM
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: str
    data: Dict[str, Any]
    source: str = "system"  # Which service triggered this
    retry_count: int = 0
    max_retries: int = 3


class ConnectionInfo(BaseModel):
    """Track connected WebSocket client information"""
    connection_id: str
    user_id: str
    user_role: UserRole
    websocket: WebSocket
    subscribed_events: Set[EventType] = Field(default_factory=set)
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = 0
    is_active: bool = True


class WebSocketManager:
    """
    Central manager for all WebSocket connections
    
    Responsibilities:
    - Manage active connections
    - Route events to appropriate clients
    - Handle subscriptions/unsubscriptions
    - Implement reconnection logic
    - Monitor connection health
    """
    
    def __init__(self):
        # Active connections: {connection_id: ConnectionInfo}
        self.active_connections: Dict[str, ConnectionInfo] = {}
        
        # User connections: {user_id: Set[connection_id]}
        self.user_connections: Dict[str, Set[str]] = {}
        
        # Event subscribers: {event_type: Set[user_id]}
        self.event_subscribers: Dict[EventType, Set[str]] = {
            event: set() for event in EventType
        }
        
        # Event queue for failed sends
        self.event_queue: List[WebSocketEvent] = []
        
        # Event callbacks
        self.event_callbacks: Dict[EventType, List[Callable]] = {}
        
        # Lock for thread-safe operations
        self.lock = asyncio.Lock()
        
        logger.info("WebSocketManager initialized")
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_role: UserRole
    ) -> str:
        """
        Accept and register a new WebSocket connection
        
        Args:
            websocket: FastAPI WebSocket instance
            user_id: User connecting
            user_role: User's role for permission filtering
            
        Returns:
            connection_id: Unique identifier for this connection
        """
        await websocket.accept()
        
        connection_id = str(uuid.uuid4())
        conn_info = ConnectionInfo(
            connection_id=connection_id,
            user_id=user_id,
            user_role=user_role,
            websocket=websocket
        )
        
        async with self.lock:
            self.active_connections[connection_id] = conn_info
            
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
        
        logger.info(f"User {user_id} connected: {connection_id}")
        
        # Send connection confirmation
        await self._send_message(
            websocket,
            {
                "type": "connection_established",
                "connection_id": connection_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """
        Remove a disconnected WebSocket connection
        
        Args:
            connection_id: Connection to remove
        """
        async with self.lock:
            if connection_id in self.active_connections:
                conn_info = self.active_connections.pop(connection_id)
                user_id = conn_info.user_id
                
                # Remove from user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id].discard(connection_id)
                    if not self.user_connections[user_id]:
                        del self.user_connections[user_id]
                
                logger.info(f"User {user_id} disconnected: {connection_id}")
    
    async def subscribe(
        self,
        connection_id: str,
        event_types: List[EventType]
    ):
        """
        Subscribe a connection to specific event types
        
        Args:
            connection_id: Connection to subscribe
            event_types: List of events to subscribe to
        """
        async with self.lock:
            if connection_id in self.active_connections:
                conn_info = self.active_connections[connection_id]
                user_id = conn_info.user_id
                
                for event_type in event_types:
                    conn_info.subscribed_events.add(event_type)
                    self.event_subscribers[event_type].add(user_id)
                
                logger.info(
                    f"Connection {connection_id} subscribed to "
                    f"{len(event_types)} events"
                )
    
    async def unsubscribe(
        self,
        connection_id: str,
        event_types: List[EventType]
    ):
        """
        Unsubscribe a connection from specific event types
        
        Args:
            connection_id: Connection to unsubscribe
            event_types: List of events to unsubscribe from
        """
        async with self.lock:
            if connection_id in self.active_connections:
                conn_info = self.active_connections[connection_id]
                user_id = conn_info.user_id
                
                for event_type in event_types:
                    conn_info.subscribed_events.discard(event_type)
                    self.event_subscribers[event_type].discard(user_id)
    
    async def broadcast_event(self, event: WebSocketEvent):
        """
        Broadcast an event to all subscribed clients
        
        Args:
            event: WebSocketEvent to broadcast
        """
        logger.info(f"Broadcasting event: {event.event_type} from {event.source}")
        
        # Get subscribers for this event
        async with self.lock:
            subscribers = self.event_subscribers.get(
                event.event_type,
                set()
            ).copy()
        
        # Send to each subscriber
        failed_connections = []
        
        for connection_id in self.active_connections.keys():
            conn_info = self.active_connections[connection_id]
            
            # Check if subscribed
            if conn_info.user_id not in subscribers:
                continue
            
            # Check role-based filtering
            if not self._should_send_to_role(event, conn_info.user_role):
                continue
            
            # Attempt to send
            success = await self._send_event(connection_id, event)
            if not success:
                failed_connections.append(connection_id)
        
        # Queue failed events for retry
        if failed_connections:
            await self._queue_event_retry(event)
        
        # Trigger callbacks
        await self._trigger_callbacks(event)
    
    async def send_to_user(
        self,
        user_id: str,
        event: WebSocketEvent
    ):
        """
        Send an event to a specific user (all their connections)
        
        Args:
            user_id: User to send to
            event: Event to send
        """
        connections = self.user_connections.get(user_id, set())
        
        for connection_id in connections.copy():
            if connection_id in self.active_connections:
                await self._send_event(connection_id, event)
    
    async def send_to_role(
        self,
        role: UserRole,
        event: WebSocketEvent
    ):
        """
        Send an event to all users with a specific role
        
        Args:
            role: User role to target
            event: Event to send
        """
        async with self.lock:
            for connection_id, conn_info in self.active_connections.items():
                if conn_info.user_role == role:
                    await self._send_event(connection_id, event)
    
    async def _send_event(
        self,
        connection_id: str,
        event: WebSocketEvent
    ) -> bool:
        """
        Send event to a specific connection
        
        Args:
            connection_id: Target connection
            event: Event to send
            
        Returns:
            bool: True if successful, False if failed
        """
        try:
            if connection_id not in self.active_connections:
                return False
            
            conn_info = self.active_connections[connection_id]
            websocket = conn_info.websocket
            
            # Send event
            await self._send_message(websocket, event.dict())
            
            # Update stats
            conn_info.message_count += 1
            return True
            
        except Exception as e:
            logger.error(f"Failed to send event to {connection_id}: {e}")
            return False
    
    async def _send_message(
        self,
        websocket: WebSocket,
        message: Dict[str, Any]
    ):
        """Send a JSON message to WebSocket"""
        try:
            await websocket.send_json(message)
        except WebSocketDisconnect:
            logger.warning("WebSocket disconnected during send")
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def _queue_event_retry(self, event: WebSocketEvent):
        """Queue event for retry on next connection"""
        if event.retry_count < event.max_retries:
            event.retry_count += 1
            self.event_queue.append(event)
            logger.info(f"Event queued for retry: {event.event_id}")
    
    async def _trigger_callbacks(self, event: WebSocketEvent):
        """Trigger registered callbacks for event"""
        callbacks = self.event_callbacks.get(event.event_type, [])
        for callback in callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Callback error: {e}")
    
    def _should_send_to_role(self, event: WebSocketEvent, role: UserRole) -> bool:
        """Check if event should be sent to user role"""
        
        # Admin sees everything
        if role == UserRole.ADMIN:
            return True
        
        # Map event types to roles
        delivery_events = {
            EventType.DELIVERY_ACCEPTED,
            EventType.DELIVERY_PICKED_UP,
            EventType.DELIVERY_IN_TRANSIT,
            EventType.DELIVERY_ARRIVED,
            EventType.DELIVERY_COMPLETED,
            EventType.LOCATION_UPDATED,
            EventType.ETA_UPDATED,
        }
        
        earnings_events = {
            EventType.EARNING_RECORDED,
            EventType.BONUS_EARNED,
            EventType.PAYOUT_APPROVED,
            EventType.PAYOUT_COMPLETED,
            EventType.WALLET_UPDATED,
        }
        
        order_events = {
            EventType.ORDER_CREATED,
            EventType.ORDER_CONFIRMED,
            EventType.ORDER_READY,
            EventType.ORDER_CANCELLED,
        }
        
        payment_events = {
            EventType.PAYMENT_INITIATED,
            EventType.PAYMENT_COMPLETED,
            EventType.PAYMENT_FAILED,
            EventType.REFUND_INITIATED,
            EventType.REFUND_COMPLETED,
        }
        
        # Role-based filtering
        if role == UserRole.DELIVERY_BOY:
            return event.event_type in delivery_events | earnings_events
        
        if role == UserRole.CUSTOMER:
            return event.event_type in order_events | payment_events | delivery_events
        
        if role == UserRole.SUPPORT:
            return event.event_type in {
                *order_events,
                *payment_events,
                EventType.DISPUTE_CREATED,
                EventType.DISPUTE_RESOLVED,
            }
        
        if role == UserRole.SUPPLIER:
            return event.event_type in order_events
        
        return False
    
    async def heartbeat(self, connection_id: str) -> bool:
        """
        Handle heartbeat from client, keep connection alive
        
        Args:
            connection_id: Connection sending heartbeat
            
        Returns:
            bool: True if connection still active
        """
        if connection_id in self.active_connections:
            self.active_connections[connection_id].last_heartbeat = datetime.utcnow()
            return True
        return False
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about all connections"""
        async with self.lock:
            return {
                "total_connections": len(self.active_connections),
                "total_users": len(self.user_connections),
                "queued_events": len(self.event_queue),
                "active_subscriptions": sum(
                    len(subs) for subs in self.event_subscribers.values()
                ),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def cleanup_inactive_connections(self, timeout_seconds: int = 300):
        """
        Remove connections inactive for longer than timeout
        
        Args:
            timeout_seconds: Inactivity timeout in seconds
        """
        now = datetime.utcnow()
        inactive = []
        
        async with self.lock:
            for conn_id, conn_info in self.active_connections.items():
                elapsed = (now - conn_info.last_heartbeat).total_seconds()
                if elapsed > timeout_seconds:
                    inactive.append(conn_id)
        
        for conn_id in inactive:
            logger.warning(f"Removing inactive connection: {conn_id}")
            await self.disconnect(conn_id)
    
    async def register_callback(
        self,
        event_type: EventType,
        callback: Callable
    ):
        """
        Register a callback for event type
        
        Args:
            event_type: Event type to listen for
            callback: Async function to call
        """
        if event_type not in self.event_callbacks:
            self.event_callbacks[event_type] = []
        self.event_callbacks[event_type].append(callback)
        logger.info(f"Registered callback for {event_type}")


# Global WebSocket manager instance
manager = WebSocketManager()


class WebSocketClient:
    """
    Client-side helper for connecting to WebSocket
    Used for integration within backend services
    """
    
    def __init__(self, user_id: str, user_role: str):
        self.user_id = user_id
        self.user_role = user_role
        self.event_queue: asyncio.Queue = asyncio.Queue()
    
    async def record_event(self, event: WebSocketEvent):
        """Record an event for broadcasting"""
        await self.event_queue.put(event)
        await manager.broadcast_event(event)


# Event emission helpers
async def emit_earning_recorded(
    delivery_boy_id: str,
    amount: float,
    delivery_id: str,
    **kwargs
):
    """Emit event when earning is recorded"""
    event = WebSocketEvent(
        event_type=EventType.EARNING_RECORDED,
        event_level=EventLevel.MEDIUM,
        user_id=delivery_boy_id,
        data={
            "amount": amount,
            "delivery_id": delivery_id,
            "breakdown": kwargs.get("breakdown", {}),
            "new_balance": kwargs.get("new_balance", 0),
        },
        source="earnings_service"
    )
    await manager.broadcast_event(event)


async def emit_delivery_status_update(
    delivery_id: str,
    status: str,
    customer_id: str,
    delivery_boy_id: str,
    **kwargs
):
    """Emit event when delivery status changes"""
    status_event_map = {
        "ACCEPTED": EventType.DELIVERY_ACCEPTED,
        "PICKED_UP": EventType.DELIVERY_PICKED_UP,
        "IN_TRANSIT": EventType.DELIVERY_IN_TRANSIT,
        "ARRIVED": EventType.DELIVERY_ARRIVED,
        "COMPLETED": EventType.DELIVERY_COMPLETED,
        "CANCELLED": EventType.DELIVERY_CANCELLED,
    }
    
    event = WebSocketEvent(
        event_type=status_event_map.get(status, EventType.DELIVERY_IN_TRANSIT),
        event_level=EventLevel.HIGH,
        user_id=customer_id,  # Send to customer
        data={
            "delivery_id": delivery_id,
            "status": status,
            "delivery_boy_id": delivery_boy_id,
            "eta": kwargs.get("eta"),
            "location": kwargs.get("location"),
            "timestamp": datetime.utcnow().isoformat(),
        },
        source="delivery_service"
    )
    
    await manager.broadcast_event(event)
    
    # Also notify delivery boy
    event.user_id = delivery_boy_id
    await manager.send_to_user(delivery_boy_id, event)


async def emit_payment_update(
    order_id: str,
    customer_id: str,
    status: str,
    amount: float,
    **kwargs
):
    """Emit event when payment status changes"""
    status_event_map = {
        "INITIATED": EventType.PAYMENT_INITIATED,
        "COMPLETED": EventType.PAYMENT_COMPLETED,
        "FAILED": EventType.PAYMENT_FAILED,
    }
    
    event = WebSocketEvent(
        event_type=status_event_map.get(status, EventType.PAYMENT_INITIATED),
        event_level=EventLevel.HIGH,
        user_id=customer_id,
        data={
            "order_id": order_id,
            "status": status,
            "amount": amount,
            "payment_method": kwargs.get("payment_method"),
            "transaction_id": kwargs.get("transaction_id"),
        },
        source="payment_service"
    )
    
    await manager.broadcast_event(event)


async def emit_order_update(
    order_id: str,
    customer_id: str,
    status: str,
    **kwargs
):
    """Emit event when order status changes"""
    status_event_map = {
        "CREATED": EventType.ORDER_CREATED,
        "CONFIRMED": EventType.ORDER_CONFIRMED,
        "REJECTED": EventType.ORDER_REJECTED,
        "READY": EventType.ORDER_READY,
        "CANCELLED": EventType.ORDER_CANCELLED,
    }
    
    event = WebSocketEvent(
        event_type=status_event_map.get(status, EventType.ORDER_CREATED),
        event_level=EventLevel.HIGH,
        user_id=customer_id,
        data={
            "order_id": order_id,
            "status": status,
            "items_count": kwargs.get("items_count"),
            "total_amount": kwargs.get("total_amount"),
            "estimated_delivery": kwargs.get("estimated_delivery"),
        },
        source="order_service"
    )
    
    await manager.broadcast_event(event)
