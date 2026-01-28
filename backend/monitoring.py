"""
STEP 37: Monitoring & Health Check System
==========================================

Provides real-time system health monitoring, performance metrics, and diagnostics.
Tracks database connectivity, API performance, error rates, and resource usage.

Usage:
    from monitoring import MonitoringService
    monitor = MonitoringService(db)
    await monitor.start()  # Start background monitoring
    
Endpoints:
    GET /api/health - Basic health check
    GET /api/health/detailed - Comprehensive system status
    GET /api/health/metrics - Performance metrics
    GET /api/health/diagnostics - System diagnostics
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import deque
import os

try:
    import psutil  # type: ignore
    PSUTIL_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    PSUTIL_AVAILABLE = False
    psutil = None


class HealthStatus:
    """Health status constants"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class PerformanceMetrics:
    """Tracks API performance metrics"""
    
    def __init__(self, window_size: int = 100):
        self.request_times = deque(maxlen=window_size)
        self.error_count = 0
        self.success_count = 0
        self.last_error: Optional[str] = None
        self.last_error_time: Optional[datetime] = None
        self.endpoints: Dict[str, Dict[str, Any]] = {}
        self.lock = asyncio.Lock()
    
    async def record_request(
        self,
        endpoint: str,
        duration: float,
        status_code: int,
        error: Optional[str] = None
    ):
        """Record API request metrics"""
        async with self.lock:
            self.request_times.append(duration)
            
            if status_code >= 400:
                self.error_count += 1
                self.last_error = error
                self.last_error_time = datetime.utcnow()
            else:
                self.success_count += 1
            
            # Track per-endpoint stats
            if endpoint not in self.endpoints:
                self.endpoints[endpoint] = {
                    "call_count": 0,
                    "total_time": 0.0,
                    "error_count": 0,
                    "avg_time": 0.0,
                    "max_time": 0.0,
                    "min_time": float('inf')
                }
            
            endpoint_stats = self.endpoints[endpoint]
            endpoint_stats["call_count"] += 1
            endpoint_stats["total_time"] += duration
            endpoint_stats["avg_time"] = (
                endpoint_stats["total_time"] / endpoint_stats["call_count"]
            )
            endpoint_stats["max_time"] = max(
                endpoint_stats["max_time"], duration
            )
            endpoint_stats["min_time"] = min(
                endpoint_stats["min_time"], duration
            )
            
            if status_code >= 400:
                endpoint_stats["error_count"] += 1
    
    async def get_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        async with self.lock:
            if not self.request_times:
                return {
                    "requests_recorded": 0,
                    "avg_response_time": 0.0,
                    "p95_response_time": 0.0,
                    "p99_response_time": 0.0,
                    "error_rate": 0.0
                }
            
            times_list = sorted(list(self.request_times))
            total_requests = self.success_count + self.error_count
            error_rate = (
                self.error_count / total_requests * 100
                if total_requests > 0 else 0
            )
            
            return {
                "requests_recorded": total_requests,
                "success_count": self.success_count,
                "error_count": self.error_count,
                "avg_response_time": sum(self.request_times) / len(self.request_times),
                "p95_response_time": times_list[int(len(times_list) * 0.95)],
                "p99_response_time": times_list[int(len(times_list) * 0.99)],
                "error_rate": error_rate,
                "last_error": self.last_error,
                "last_error_time": self.last_error_time.isoformat() if self.last_error_time else None
            }


class SystemMetrics:
    """Tracks system-level metrics"""
    
    def __init__(self):
        self.cpu_samples = deque(maxlen=60)  # 1 minute of samples
        self.memory_samples = deque(maxlen=60)
        self.process = psutil.Process(os.getpid())
        self.collection_stats: Dict[str, Dict[str, Any]] = {}
    
    async def collect_metrics(self):
        """Collect current system metrics"""
        try:
            cpu_percent = self.process.cpu_percent(interval=0.1)
            memory_info = self.process.memory_info()
            
            self.cpu_samples.append(cpu_percent)
            self.memory_samples.append(memory_info.rss / 1024 / 1024)  # MB
        except Exception as e:
            print(f"Error collecting system metrics: {e}")
    
    async def get_summary(self) -> Dict[str, Any]:
        """Get system metrics summary"""
        if not self.cpu_samples:
            return {
                "cpu_percent": 0.0,
                "memory_mb": 0.0,
                "avg_cpu_percent": 0.0,
                "avg_memory_mb": 0.0
            }
        
        return {
            "cpu_percent": self.cpu_samples[-1],
            "memory_mb": self.memory_samples[-1],
            "avg_cpu_percent": sum(self.cpu_samples) / len(self.cpu_samples),
            "avg_memory_mb": sum(self.memory_samples) / len(self.memory_samples),
            "max_cpu_percent": max(self.cpu_samples),
            "max_memory_mb": max(self.memory_samples)
        }


class DatabaseHealthChecker:
    """Checks database connectivity and performance"""
    
    def __init__(self, db):
        self.db = db
        self.last_check: Optional[datetime] = None
        self.last_check_result: Optional[Dict[str, Any]] = None
        self.response_time: float = 0.0
        self.collection_stats: Dict[str, Dict[str, Any]] = {}
    
    async def check(self) -> Dict[str, Any]:
        """Perform database health check"""
        start_time = time.time()
        
        try:
            # Ping database
            await self.db.command("ping")
            self.response_time = time.time() - start_time
            
            # Get collection stats
            self.collection_stats = await self._get_collection_stats()
            
            # Determine status
            status = (
                HealthStatus.HEALTHY
                if self.response_time < 1.0
                else HealthStatus.DEGRADED
            )
            
            result = {
                "status": status,
                "response_time_ms": self.response_time * 1000,
                "collections": self.collection_stats,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.last_check = datetime.utcnow()
            self.last_check_result = result
            
            return result
        
        except Exception as e:
            return {
                "status": HealthStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _get_collection_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get stats for all collections"""
        stats = {}
        try:
            collection_names = await self.db.list_collection_names()
            
            for collection_name in collection_names:
                collection = self.db[collection_name]
                count = await collection.count_documents({})
                stats[collection_name] = {
                    "document_count": count,
                    "indexed_fields": list(collection._database.get_codec_options().document_class)
                }
        except Exception as e:
            stats["error"] = str(e)
        
        return stats


class MonitoringService:
    """Main monitoring service"""
    
    def __init__(self, db, check_interval: int = 30):
        self.db = db
        self.check_interval = check_interval
        self.performance_metrics = PerformanceMetrics()
        self.system_metrics = SystemMetrics()
        self.db_checker = DatabaseHealthChecker(db)
        self.monitoring_task: Optional[asyncio.Task] = None
        self.is_running = False
        self.start_time = datetime.utcnow()
        self.alerts_triggered: List[Dict[str, Any]] = []
    
    async def start(self):
        """Start background monitoring"""
        if self.is_running:
            return
        
        self.is_running = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        print("✓ Monitoring service started")
    
    async def stop(self):
        """Stop background monitoring"""
        self.is_running = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        print("✓ Monitoring service stopped")
    
    async def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.is_running:
            try:
                # Collect metrics
                await self.system_metrics.collect_metrics()
                
                # Check database health every 30 seconds
                if (
                    self.db_checker.last_check is None or
                    datetime.utcnow() - self.db_checker.last_check >
                    timedelta(seconds=self.check_interval)
                ):
                    await self.db_checker.check()
                
                await asyncio.sleep(10)  # Check every 10 seconds
            
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                await asyncio.sleep(10)
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get basic health status"""
        db_health = self.db_checker.last_check_result or await self.db_checker.check()
        system_health = await self.system_metrics.get_summary()
        perf_health = await self.performance_metrics.get_summary()
        
        # Determine overall status
        db_status = db_health.get("status", HealthStatus.UNHEALTHY)
        cpu_percent = system_health.get("cpu_percent", 0)
        error_rate = perf_health.get("error_rate", 0)
        
        overall_status = HealthStatus.HEALTHY
        if db_status != HealthStatus.HEALTHY:
            overall_status = HealthStatus.UNHEALTHY
        elif cpu_percent > 80 or error_rate > 5:
            overall_status = HealthStatus.DEGRADED
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": (
                datetime.utcnow() - self.start_time
            ).total_seconds(),
            "database": db_health,
            "system": system_health,
            "performance": perf_health
        }
    
    async def get_detailed_diagnostics(self) -> Dict[str, Any]:
        """Get detailed system diagnostics"""
        health = await self.get_health_status()
        
        return {
            **health,
            "endpoints": self.performance_metrics.endpoints,
            "alerts": self.alerts_triggered[-10:],  # Last 10 alerts
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def add_alert(self, alert_type: str, message: str, severity: str = "warning"):
        """Record an alert"""
        alert = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": alert_type,
            "message": message,
            "severity": severity
        }
        self.alerts_triggered.append(alert)
        
        # Keep only last 1000 alerts
        if len(self.alerts_triggered) > 1000:
            self.alerts_triggered = self.alerts_triggered[-1000:]


# Global monitoring instance
_monitoring_service: Optional[MonitoringService] = None


def get_monitoring() -> Optional[MonitoringService]:
    """Get global monitoring instance"""
    return _monitoring_service


def set_monitoring(service: MonitoringService):
    """Set global monitoring instance"""
    global _monitoring_service
    _monitoring_service = service
