# PHASE 5: MONITORING & OBSERVABILITY SETUP
## Complete Monitoring Infrastructure Configuration

---

## PROMETHEUS CONFIGURATION

### prometheus.prod.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'kiranast-monitor'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - 'alert_rules.yml'
  - 'recording_rules.yml'

scrape_configs:
  # Backend Application Metrics
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Frontend Application
  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

  # Database Metrics
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongo:27017']
    scrape_interval: 30s

  # Redis Metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 10s

  # Docker Daemon
  - job_name: 'docker'
    static_configs:
      - targets: ['unix:///var/run/docker.sock']
    scrape_interval: 15s

  # Node Exporter (System Metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s

  # Prometheus Self-Monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s

  # Load Balancer Metrics
  - job_name: 'haproxy'
    static_configs:
      - targets: ['loadbalancer:8080']
    scrape_interval: 15s

  # cAdvisor (Container Metrics)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 15s
```

---

## ALERT RULES

### alert_rules.yml

```yaml
groups:
  - name: application_alerts
    interval: 30s
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} on {{ $labels.instance }}"

      # High Response Time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "p95 response time is {{ $value }}s"

      # 2FA Failures
      - alert: High2FAFailureRate
        expr: rate(auth_2fa_failures_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High 2FA failure rate"
          description: "2FA failure rate is {{ $value | humanizePercentage }}"

      # Permission Check Failures
      - alert: HighPermissionCheckFailures
        expr: rate(rbac_permission_denied_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High permission denial rate"
          description: "Permission denials: {{ $value | humanizePercentage }}"

  - name: infrastructure_alerts
    interval: 30s
    rules:
      # High CPU Usage
      - alert: HighCPUUsage
        expr: node_cpu_seconds_total{mode="system"} > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value | humanizePercentage }}"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Available memory: {{ $value | humanizePercentage }}"

      # Disk Space Critical
      - alert: DiskSpaceCritical
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space critically low"
          description: "Available disk: {{ $value | humanizePercentage }}"

      # Container Restart Looping
      - alert: ContainerRestartLooping
        expr: rate(container_last_seen{container_label_restart_policy="always"}[15m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Container restart looping"
          description: "Container {{ $labels.container_label_name }} restarting too frequently"

  - name: database_alerts
    interval: 30s
    rules:
      # MongoDB Connection Pool Exhausted
      - alert: MongoDBConnectionPoolExhausted
        expr: mongodb_connection_pool_current_size / mongodb_connection_pool_max_size > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connection pool nearly exhausted"
          description: "Connection pool usage: {{ $value | humanizePercentage }}"

      # MongoDB Query Performance
      - alert: MongoDBSlowQueries
        expr: rate(mongodb_operation_time_sum{quantile="0.95"}[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB slow queries detected"
          description: "p95 query time: {{ $value }}s"

      # Redis Memory Usage
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Memory usage: {{ $value | humanizePercentage }}"

  - name: deployment_alerts
    interval: 30s
    rules:
      # Deployment Failure
      - alert: DeploymentFailed
        expr: deployment_status{status="failed"} == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Deployment failed"
          description: "Deployment {{ $labels.deployment_name }} failed"

      # Pod Not Ready
      - alert: PodNotReady
        expr: kube_pod_status_ready{condition="false"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod not ready"
          description: "Pod {{ $labels.pod }} not ready for 5 minutes"

      # Unschedulable Pod
      - alert: UnschedulablePod
        expr: kube_pod_status_scheduled{condition="false"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod unschedulable"
          description: "Pod {{ $labels.pod }} cannot be scheduled"
```

---

## GRAFANA DASHBOARD CONFIGURATION

### Sample Dashboard: Application Performance

```json
{
  "dashboard": {
    "title": "Kiranast - Application Performance",
    "tags": ["production", "application"],
    "timezone": "UTC",
    "panels": [
      {
        "title": "Request Rate (req/sec)",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "2FA Success Rate",
        "targets": [
          {
            "expr": "rate(auth_2fa_success_total[5m]) / (rate(auth_2fa_attempts_total[5m]) + 0.001)"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Permission Check Performance",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rbac_permission_check_duration_seconds_bucket)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "gauge_active_users"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

### Sample Dashboard: Infrastructure

```json
{
  "dashboard": {
    "title": "Kiranast - Infrastructure Monitoring",
    "tags": ["production", "infrastructure"],
    "timezone": "UTC",
    "panels": [
      {
        "title": "CPU Usage (%)",
        "targets": [
          {
            "expr": "100 * (1 - (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])))"
          }
        ],
        "type": "graph",
        "alert": {
          "threshold": 80
        }
      },
      {
        "title": "Memory Usage (%)",
        "targets": [
          {
            "expr": "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))"
          }
        ],
        "type": "graph",
        "alert": {
          "threshold": 85
        }
      },
      {
        "title": "Disk Usage (%)",
        "targets": [
          {
            "expr": "100 * (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes))"
          }
        ],
        "type": "graph",
        "alert": {
          "threshold": 80
        }
      },
      {
        "title": "Network I/O",
        "targets": [
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])"
          },
          {
            "expr": "rate(node_network_receive_bytes_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Container Status",
        "targets": [
          {
            "expr": "container_up"
          }
        ],
        "type": "stat"
      },
      {
        "title": "System Uptime",
        "targets": [
          {
            "expr": "node_boot_time_seconds"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

---

## ALERTMANAGER CONFIGURATION

### alertmanager.yml

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK}'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'critical'
      repeat_interval: 5m
      
    # Warning alerts - Slack notification
    - match:
        severity: warning
      receiver: 'warning'
      repeat_interval: 1h
      
    # Deployment alerts - email
    - match:
        alertname: DeploymentFailed
      receiver: 'deployment'
      repeat_interval: 30m

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        color: 'warning'

  - name: 'critical'
    slack_configs:
      - channel: '#critical-alerts'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        color: 'danger'
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_KEY}'

  - name: 'warning'
    slack_configs:
      - channel: '#warnings'
        title: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        color: 'warning'

  - name: 'deployment'
    email_configs:
      - to: 'devops@kiranast ore.com'
        from: 'alerting@kiranast ore.com'
        smarthost: '${SMTP_HOST}:587'
        auth_username: '${SMTP_USER}'
        auth_password: '${SMTP_PASSWORD}'
        headers:
          Subject: 'Kiranast Deployment Alert'
```

---

## MONITORING QUICK START

### Deploy Monitoring Stack

```bash
# 1. Start monitoring services (in docker-compose.prod.yml)
docker-compose -f docker-compose.prod.yml up -d prometheus grafana alertmanager

# 2. Verify Prometheus
curl http://localhost:9090/api/v1/query?query=up

# 3. Access Grafana
# URL: http://localhost:3002
# Username: admin
# Password: ${GRAFANA_PASSWORD}

# 4. Add Prometheus as Data Source
# URL: http://prometheus:9090

# 5. Import dashboards
# Dashboard IDs:
# - 1860 (Node Exporter)
# - 3591 (MongoDB)
# - 11835 (Redis)
```

### Key Metrics to Monitor

#### Application
- Request rate (requests/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Success rate (%)
- Throughput (ops/sec)

#### Business
- Orders created (daily, hourly)
- Revenue (daily, cumulative)
- Active users (current, daily)
- Conversion rate (%)
- Average order value

#### Security
- Failed login attempts
- 2FA success rate
- Permission denials
- Suspicious activities
- API rate limit hits

#### Infrastructure
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)
- Network I/O (bytes/sec)
- Disk I/O (ops/sec)

---

## HEALTH CHECK ENDPOINTS

### Backend Health Checks

```python
# Flask endpoints

@app.route('/api/health', methods=['GET'])
def health_check():
    """Basic health check"""
    return {
        'status': 'ok',
        'service': 'backend',
        'timestamp': datetime.utcnow().isoformat()
    }, 200

@app.route('/api/health/detailed', methods=['GET'])
def detailed_health():
    """Detailed health check with dependencies"""
    try:
        # Check database
        db.admin_command('ping')
        db_status = 'ok'
    except:
        db_status = 'error'
    
    try:
        # Check cache
        redis.ping()
        cache_status = 'ok'
    except:
        cache_status = 'error'
    
    return {
        'status': 'ok' if db_status == 'ok' and cache_status == 'ok' else 'degraded',
        'service': 'backend',
        'database': db_status,
        'cache': cache_status,
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }, 200

@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(REGISTRY)
```

### Frontend Health Checks

```javascript
// React health endpoint

export const healthCheck = async () => {
  try {
    const response = await fetch('/health');
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
```

---

## MONITORING RUNBOOK

### Alert: High Error Rate

1. Check error logs
```bash
docker-compose logs backend | grep ERROR
```

2. Verify database connectivity
```bash
docker exec mongo mongosh --eval "db.adminCommand('ping')"
```

3. Check service status
```bash
curl http://localhost:5000/api/health/detailed
```

4. Review recent deployments
```bash
git log --oneline -10
```

5. If issue persists, initiate rollback

---

## TROUBLESHOOTING

### Prometheus Not Collecting Metrics

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify scrape configs
cat /etc/prometheus/prometheus.yml

# Check service connectivity
docker exec prometheus curl http://backend:5000/metrics
```

### Grafana Dashboards Not Showing Data

```bash
# Verify Prometheus data source
curl http://localhost:9090/api/v1/query?query=up

# Check Grafana logs
docker-compose logs grafana

# Restart Grafana
docker-compose restart grafana
```

### Alerts Not Triggering

```bash
# Verify alert rules loaded
curl http://localhost:9090/api/v1/rules

# Test AlertManager
curl -X POST http://localhost:9093/api/v1/alerts \
  -d '[{"labels":{"alertname":"TestAlert"}}]'

# Check AlertManager logs
docker-compose logs alertmanager
```

---

*Implementation Date*: January 28, 2026
*Monitoring Stack Version*: 1.0
*Last Updated*: January 28, 2026
