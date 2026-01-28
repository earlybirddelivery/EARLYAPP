"""
STEP 37: Alert Management System
=================================

Manages alerts and notifications for system events.
Supports email, Slack, and logging.

Usage:
    from alerts import AlertManager
    alert_manager = AlertManager()
    await alert_manager.send_alert("database_down", "Database connection lost", "critical")

Configuration:
    - Email alerts via SMTP (configure in .env)
    - Slack alerts via webhook (configure in .env)
    - System logging for all alerts
    - Alert history and trending
"""

import asyncio
import smtplib
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
import os
import json
from collections import deque


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    ERROR = "error"


class AlertType(str, Enum):
    """Common alert types"""
    DATABASE_DOWN = "database_down"
    DATABASE_SLOW = "database_slow"
    HIGH_ERROR_RATE = "high_error_rate"
    HIGH_CPU = "high_cpu"
    HIGH_MEMORY = "high_memory"
    API_TIMEOUT = "api_timeout"
    BILLING_FAILURE = "billing_failure"
    DELIVERY_ISSUE = "delivery_issue"
    SECURITY_ALERT = "security_alert"
    CUSTOM = "custom"


class AlertManager:
    """Manages alert generation and delivery"""
    
    def __init__(
        self,
        email_enabled: bool = True,
        slack_enabled: bool = True,
        max_history: int = 1000
    ):
        self.email_enabled = email_enabled and os.environ.get("SMTP_SERVER")
        self.slack_enabled = slack_enabled and os.environ.get("SLACK_WEBHOOK_URL")
        self.max_history = max_history
        self.alert_history: deque = deque(maxlen=max_history)
        self.alert_counts: Dict[str, int] = {}
        self.muted_alerts: Dict[str, datetime] = {}  # Muted until datetime
        self.lock = asyncio.Lock()
    
    async def send_alert(
        self,
        alert_type: str,
        message: str,
        severity: str = AlertSeverity.WARNING,
        details: Optional[Dict[str, Any]] = None,
        suppress_duplicates: bool = True
    ) -> bool:
        """
        Send an alert through all enabled channels
        
        Args:
            alert_type: Type of alert
            message: Alert message
            severity: Severity level
            details: Additional details
            suppress_duplicates: Suppress duplicate alerts within 5 minutes
        
        Returns:
            True if alert was sent, False if suppressed
        """
        async with self.lock:
            # Check if alert is muted
            if alert_type in self.muted_alerts:
                if datetime.utcnow() < self.muted_alerts[alert_type]:
                    return False
                del self.muted_alerts[alert_type]
            
            # Check for duplicate suppression
            if suppress_duplicates:
                duplicate = self._check_duplicate(alert_type, message)
                if duplicate and duplicate < timedelta(minutes=5):
                    return False
            
            # Create alert object
            alert = {
                "timestamp": datetime.utcnow().isoformat(),
                "type": alert_type,
                "message": message,
                "severity": severity,
                "details": details or {}
            }
            
            # Record in history
            self.alert_history.append(alert)
            self.alert_counts[alert_type] = self.alert_counts.get(alert_type, 0) + 1
            
            # Send through enabled channels
            try:
                if self.email_enabled:
                    asyncio.create_task(self._send_email_alert(alert))
                
                if self.slack_enabled:
                    asyncio.create_task(self._send_slack_alert(alert))
                
                # Always log
                self._log_alert(alert)
                
                return True
            
            except Exception as e:
                print(f"Error sending alert: {e}")
                return False
    
    async def _send_email_alert(self, alert: Dict[str, Any]):
        """Send email alert"""
        try:
            smtp_server = os.environ.get("SMTP_SERVER")
            smtp_port = int(os.environ.get("SMTP_PORT", "587"))
            sender_email = os.environ.get("ALERT_EMAIL_FROM")
            sender_password = os.environ.get("ALERT_EMAIL_PASSWORD")
            recipient_emails = os.environ.get(
                "ALERT_EMAIL_TO", ""
            ).split(",")
            
            if not all([smtp_server, sender_email, sender_password, recipient_emails]):
                return
            
            subject = f"[{alert['severity'].upper()}] {alert['type']}"
            body = f"""
Alert Type: {alert['type']}
Severity: {alert['severity']}
Time: {alert['timestamp']}
Message: {alert['message']}

Details:
{json.dumps(alert['details'], indent=2)}

---
EarlyBird Delivery Services Monitoring
            """
            
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                
                for recipient in recipient_emails:
                    server.send_message(
                        f"From: {sender_email}\n"
                        f"To: {recipient}\n"
                        f"Subject: {subject}\n\n"
                        f"{body}"
                    )
        
        except Exception as e:
            print(f"Error sending email alert: {e}")
    
    async def _send_slack_alert(self, alert: Dict[str, Any]):
        """Send Slack alert"""
        try:
            webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
            if not webhook_url:
                return
            
            # Color based on severity
            color_map = {
                AlertSeverity.INFO: "#36A64F",
                AlertSeverity.WARNING: "#FF9900",
                AlertSeverity.ERROR: "#FF6B6B",
                AlertSeverity.CRITICAL: "#FF0000"
            }
            
            payload = {
                "attachments": [
                    {
                        "color": color_map.get(alert["severity"], "#808080"),
                        "title": f"{alert['type']}",
                        "text": alert["message"],
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert["severity"],
                                "short": True
                            },
                            {
                                "title": "Time",
                                "value": alert["timestamp"],
                                "short": True
                            }
                        ],
                        "footer": "EarlyBird Monitoring"
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as resp:
                    if resp.status != 200:
                        print(f"Slack webhook returned {resp.status}")
        
        except Exception as e:
            print(f"Error sending Slack alert: {e}")
    
    def _log_alert(self, alert: Dict[str, Any]):
        """Log alert to system logger"""
        timestamp = alert["timestamp"]
        alert_type = alert["type"]
        severity = alert["severity"]
        message = alert["message"]
        
        log_message = (
            f"[{timestamp}] {severity.upper()}: {alert_type} - {message}"
        )
        print(log_message)
    
    def _check_duplicate(
        self,
        alert_type: str,
        message: str
    ) -> Optional[timedelta]:
        """
        Check if similar alert was sent recently
        
        Returns:
            Time since last similar alert, or None if not found
        """
        now = datetime.utcnow()
        
        for alert in reversed(self.alert_history):
            if (
                alert["type"] == alert_type and
                alert["message"] == message
            ):
                return now - datetime.fromisoformat(alert["timestamp"])
        
        return None
    
    def mute_alert_type(self, alert_type: str, duration_seconds: int = 300):
        """Mute an alert type for specified duration"""
        self.muted_alerts[alert_type] = (
            datetime.utcnow() + timedelta(seconds=duration_seconds)
        )
        print(f"Muted {alert_type} for {duration_seconds} seconds")
    
    def unmute_alert_type(self, alert_type: str):
        """Unmute an alert type"""
        if alert_type in self.muted_alerts:
            del self.muted_alerts[alert_type]
            print(f"Unmuted {alert_type}")
    
    async def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary statistics"""
        async with self.lock:
            return {
                "total_alerts": len(self.alert_history),
                "alerts_by_type": dict(self.alert_counts),
                "muted_alerts": {
                    k: v.isoformat()
                    for k, v in self.muted_alerts.items()
                },
                "recent_alerts": list(self.alert_history)[-10:]
            }
    
    async def get_alert_history(
        self,
        limit: int = 100,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get filtered alert history"""
        async with self.lock:
            history = list(self.alert_history)
            
            if alert_type:
                history = [a for a in history if a["type"] == alert_type]
            
            if severity:
                history = [a for a in history if a["severity"] == severity]
            
            return history[-limit:]
    
    def reset_stats(self):
        """Reset alert statistics"""
        self.alert_history.clear()
        self.alert_counts.clear()
        print("Alert statistics reset")


# Common alert helper functions

async def alert_database_down(details: Optional[Dict[str, Any]] = None):
    """Alert when database goes down"""
    manager = get_alert_manager()
    if manager:
        await manager.send_alert(
            AlertType.DATABASE_DOWN,
            "Database connection lost",
            AlertSeverity.CRITICAL,
            details
        )


async def alert_high_error_rate(error_rate: float, details: Optional[Dict[str, Any]] = None):
    """Alert when error rate is high"""
    manager = get_alert_manager()
    if manager:
        await manager.send_alert(
            AlertType.HIGH_ERROR_RATE,
            f"High error rate detected: {error_rate:.2f}%",
            AlertSeverity.WARNING,
            details
        )


async def alert_performance_issue(endpoint: str, avg_time: float):
    """Alert when endpoint performance degrades"""
    manager = get_alert_manager()
    if manager:
        await manager.send_alert(
            AlertType.API_TIMEOUT,
            f"Slow API response: {endpoint} ({avg_time:.2f}ms)",
            AlertSeverity.WARNING,
            {"endpoint": endpoint, "avg_time_ms": avg_time}
        )


# Global alert manager instance
_alert_manager: Optional[AlertManager] = None


def get_alert_manager() -> Optional[AlertManager]:
    """Get global alert manager instance"""
    return _alert_manager


def set_alert_manager(manager: AlertManager):
    """Set global alert manager instance"""
    global _alert_manager
    _alert_manager = manager


def initialize_alerts() -> AlertManager:
    """Initialize and return alert manager"""
    manager = AlertManager()
    set_alert_manager(manager)
    return manager
