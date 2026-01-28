# PHASE 5: DATABASE MIGRATIONS & BACKUP PROCEDURES
## Complete Data Management Guide

---

## DATABASE MIGRATION STRATEGY

### Migration Framework

```python
# backend/migrations.py - Database migration manager

import os
from datetime import datetime
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)

class MigrationManager:
    """Manages database schema migrations"""
    
    def __init__(self, mongo_url):
        self.client = MongoClient(mongo_url)
        self.db = self.client.kiranast
        self._ensure_migrations_collection()
    
    def _ensure_migrations_collection(self):
        """Create migrations tracking collection"""
        if 'migrations' not in self.db.list_collection_names():
            self.db.create_collection('migrations')
            self.db.migrations.create_index('name', unique=True)
    
    def get_applied_migrations(self):
        """Get list of applied migrations"""
        return [m['name'] for m in self.db.migrations.find()]
    
    def apply_migration(self, name, up_func):
        """Apply a migration"""
        if name in self.get_applied_migrations():
            logger.info(f"Migration {name} already applied")
            return
        
        try:
            logger.info(f"Applying migration: {name}")
            up_func(self.db)
            
            self.db.migrations.insert_one({
                'name': name,
                'applied_at': datetime.utcnow(),
                'status': 'success'
            })
            logger.info(f"Migration {name} completed successfully")
        except Exception as e:
            logger.error(f"Migration {name} failed: {e}")
            self.db.migrations.insert_one({
                'name': name,
                'applied_at': datetime.utcnow(),
                'status': 'failed',
                'error': str(e)
            })
            raise
    
    def rollback_migration(self, name, down_func):
        """Rollback a migration"""
        try:
            logger.info(f"Rolling back migration: {name}")
            down_func(self.db)
            
            self.db.migrations.delete_one({'name': name})
            logger.info(f"Migration {name} rolled back successfully")
        except Exception as e:
            logger.error(f"Rollback of {name} failed: {e}")
            raise
```

### Phase 4 Migrations

#### Migration 1: Access Control Collections

```python
# backend/migrations/001_access_control.py

def up(db):
    """Create access control collections"""
    
    # Permissions collection
    db.create_collection('permissions')
    db.permissions.create_index('name', unique=True)
    db.permissions.create_index('user_id')
    db.permissions.create_index('resource_type')
    
    # Roles collection
    db.create_collection('roles')
    db.roles.create_index('name', unique=True)
    db.roles.create_index('permissions')
    
    # Insert default roles
    default_roles = [
        {
            'name': 'admin',
            'description': 'Full system access',
            'permissions': ['*'],
            'created_at': datetime.utcnow()
        },
        {
            'name': 'staff',
            'description': 'Staff access',
            'permissions': ['read_orders', 'update_orders', 'read_products'],
            'created_at': datetime.utcnow()
        },
        {
            'name': 'customer',
            'description': 'Customer access',
            'permissions': ['read_own_orders', 'create_orders', 'read_products'],
            'created_at': datetime.utcnow()
        }
    ]
    db.roles.insert_many(default_roles)

def down(db):
    """Rollback access control collections"""
    db.drop_collection('permissions')
    db.drop_collection('roles')
```

#### Migration 2: 2FA Authentication

```python
# backend/migrations/002_2fa_auth.py

def up(db):
    """Add 2FA fields to users"""
    
    # Update users collection
    db.users.update_many(
        {},
        {'$set': {
            '2fa_enabled': False,
            '2fa_method': None,  # 'totp', 'sms', 'backup_codes'
            '2fa_secret': None,
            '2fa_backup_codes': [],
            'phone_number': None
        }}
    )
    
    # Create 2FA attempts collection
    db.create_collection('2fa_attempts')
    db.2fa_attempts.create_index('user_id')
    db.2fa_attempts.create_index('timestamp')
    db.2fa_attempts.create_index('success')

def down(db):
    """Rollback 2FA fields"""
    db.users.update_many(
        {},
        {'$unset': {
            '2fa_enabled': 1,
            '2fa_method': 1,
            '2fa_secret': 1,
            '2fa_backup_codes': 1,
            'phone_number': 1
        }}
    )
    db.drop_collection('2fa_attempts')
```

#### Migration 3: Audit Logging

```python
# backend/migrations/003_audit_logging.py

def up(db):
    """Create audit log collection"""
    
    db.create_collection('audit_logs')
    db.audit_logs.create_index('user_id')
    db.audit_logs.create_index('resource_id')
    db.audit_logs.create_index('action')
    db.audit_logs.create_index('timestamp')
    db.audit_logs.create_index([('timestamp', -1)])  # For efficient querying
    
    # TTL index - keep logs for 90 days
    db.audit_logs.create_index(
        'timestamp',
        expireAfterSeconds=7776000  # 90 days
    )
    
    # Create index for suspicious activity queries
    db.audit_logs.create_index([
        ('user_id', 1),
        ('action', 1),
        ('timestamp', -1)
    ])

def down(db):
    """Rollback audit logging"""
    db.drop_collection('audit_logs')
```

#### Migration 4: Payment Records

```python
# backend/migrations/004_payments.py

def up(db):
    """Create payment tracking collections"""
    
    # Transactions collection
    db.create_collection('transactions')
    db.transactions.create_index('order_id', unique=True)
    db.transactions.create_index('user_id')
    db.transactions.create_index('status')
    db.transactions.create_index('timestamp')
    
    # Payment methods collection
    db.create_collection('payment_methods')
    db.payment_methods.create_index('user_id')
    db.payment_methods.create_index('is_default')

def down(db):
    """Rollback payment collections"""
    db.drop_collection('transactions')
    db.drop_collection('payment_methods')
```

#### Migration 5: Analytics Data

```python
# backend/migrations/005_analytics.py

def up(db):
    """Create analytics collections"""
    
    # User analytics
    db.create_collection('user_analytics')
    db.user_analytics.create_index('user_id')
    db.user_analytics.create_index('date')
    
    # Order analytics
    db.create_collection('order_analytics')
    db.order_analytics.create_index('date')
    db.order_analytics.create_index('product_id')
    
    # Revenue analytics
    db.create_collection('revenue_analytics')
    db.revenue_analytics.create_index('date')
    db.revenue_analytics.create_index([('date', -1)])

def down(db):
    """Rollback analytics collections"""
    db.drop_collection('user_analytics')
    db.drop_collection('order_analytics')
    db.drop_collection('revenue_analytics')
```

---

## BACKUP PROCEDURES

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh - Automated backup script

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:=/backups}"
MONGO_HOST="${MONGO_HOST:=mongo}"
MONGO_PORT="${MONGO_PORT:=27017}"
MONGO_USER="${MONGO_USER:=admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:=admin123}"
RETENTION_DAYS="${RETENTION_DAYS:=30}"
S3_BUCKET="${S3_BUCKET:=}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup timestamp
TIMESTAMP=$(date +%Y_%m_%d_%H_%M_%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
BACKUP_LOG="$BACKUP_DIR/backup_$TIMESTAMP.log"

echo "Starting backup at $(date)" > "$BACKUP_LOG"

# Backup database
echo "Backing up MongoDB..." >> "$BACKUP_LOG"
mongodump \
  --host="$MONGO_HOST:$MONGO_PORT" \
  --username="$MONGO_USER" \
  --password="$MONGO_PASSWORD" \
  --authenticationDatabase=admin \
  --out "$BACKUP_DIR/dump_$TIMESTAMP" >> "$BACKUP_LOG" 2>&1

# Backup application configuration
echo "Backing up configuration..." >> "$BACKUP_LOG"
cp -r /app/config "$BACKUP_DIR/config_$TIMESTAMP"

# Compress backup
echo "Compressing backup..." >> "$BACKUP_LOG"
tar -czf "$BACKUP_FILE" \
  -C "$BACKUP_DIR" \
  "dump_$TIMESTAMP" \
  "config_$TIMESTAMP" >> "$BACKUP_LOG" 2>&1

# Remove uncompressed backups
rm -rf "$BACKUP_DIR/dump_$TIMESTAMP" "$BACKUP_DIR/config_$TIMESTAMP"

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
  echo "Uploading backup to S3..." >> "$BACKUP_LOG"
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/" >> "$BACKUP_LOG" 2>&1
fi

# Delete old backups (retention policy)
echo "Cleaning up old backups..." >> "$BACKUP_LOG"
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully at $(date)" >> "$BACKUP_LOG"
```

### Backup Schedule

```yaml
# Cron schedule
# Backup every 6 hours
0 */6 * * * /app/scripts/backup.sh

# Full backup every Sunday
0 0 * * 0 /app/scripts/backup-full.sh

# Verify backups every Monday
0 1 * * 1 /app/scripts/verify-backups.sh
```

---

## RESTORE PROCEDURES

### Database Restore

```bash
#!/bin/bash
# scripts/restore.sh - Database restore script

set -e

BACKUP_FILE="${1:?Backup file required}"
MONGO_HOST="${MONGO_HOST:=mongo}"
MONGO_PORT="${MONGO_PORT:=27017}"
MONGO_USER="${MONGO_USER:=admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:=admin123}"

# Extract backup
echo "Extracting backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Create backup of current database
echo "Creating backup of current database..."
CURRENT_BACKUP="$HOME/backup_$(date +%s).tar.gz"
mongodump \
  --host="$MONGO_HOST:$MONGO_PORT" \
  --username="$MONGO_USER" \
  --password="$MONGO_PASSWORD" \
  --authenticationDatabase=admin \
  --out="$TEMP_DIR/current_state"
tar -czf "$CURRENT_BACKUP" -C "$TEMP_DIR" "current_state"
echo "Current state backed up to: $CURRENT_BACKUP"

# Restore database
echo "Restoring database from backup..."
mongorestore \
  --host="$MONGO_HOST:$MONGO_PORT" \
  --username="$MONGO_USER" \
  --password="$MONGO_PASSWORD" \
  --authenticationDatabase=admin \
  --drop \
  "$TEMP_DIR/dump_"*

# Restore configuration
echo "Restoring configuration..."
rm -rf /app/config
cp -r "$TEMP_DIR/config_"* /app/config

# Cleanup
rm -rf "$TEMP_DIR"

echo "Restore completed successfully"
```

### Point-in-Time Recovery

```bash
#!/bin/bash
# scripts/point-in-time-restore.sh

RESTORE_TIME="${1:?Restore time required (format: YYYY-MM-DD HH:MM:SS)}"

# Find backup containing the restore time
BACKUP_FILE=$(find /backups -name "backup_*.tar.gz" -printf '%T@ %p\n' | \
  awk -v rt="$(date -d "$RESTORE_TIME" +%s)" '$1 >= rt' | \
  sort -n | head -1 | cut -d' ' -f2-)

if [ -z "$BACKUP_FILE" ]; then
  echo "No backup found for time: $RESTORE_TIME"
  exit 1
fi

echo "Restoring from backup: $BACKUP_FILE"
/app/scripts/restore.sh "$BACKUP_FILE"
```

---

## DATA VALIDATION

### Pre-Migration Validation

```python
# backend/validation.py

def validate_data_before_migration():
    """Validate data integrity before migration"""
    
    db = get_db()
    issues = []
    
    # Check users
    user_count = db.users.count_documents({})
    if user_count == 0:
        issues.append("No users found")
    
    # Check orders
    order_count = db.orders.count_documents({})
    if order_count == 0:
        issues.append("No orders found")
    
    # Check for orphaned records
    orders_without_users = db.orders.count_documents({
        'user_id': {'$nin': [u['_id'] for u in db.users.find({}, {'_id': 1})]}
    })
    if orders_without_users > 0:
        issues.append(f"Found {orders_without_users} orphaned orders")
    
    # Check data consistency
    if not validate_data_consistency(db):
        issues.append("Data consistency check failed")
    
    return issues

def validate_data_after_migration():
    """Validate data integrity after migration"""
    
    db = get_db()
    issues = []
    
    # Verify all collections exist
    required_collections = [
        'users', 'orders', 'products', 'permissions', 'roles',
        'audit_logs', 'transactions'
    ]
    
    existing_collections = db.list_collection_names()
    for collection in required_collections:
        if collection not in existing_collections:
            issues.append(f"Collection {collection} missing")
    
    # Verify indexes
    required_indexes = {
        'users': ['email'],
        'orders': ['user_id', 'status'],
        'permissions': ['user_id'],
        'audit_logs': ['user_id', 'timestamp']
    }
    
    for collection, indexes in required_indexes.items():
        existing_indexes = [idx['name'] for idx in db[collection].list_indexes()]
        for index in indexes:
            if index + '_1' not in existing_indexes and f'{index}_-1' not in existing_indexes:
                issues.append(f"Index {index} missing on {collection}")
    
    return issues
```

---

## MIGRATION RUNBOOK

### Pre-Migration

1. **Notify team**
   ```bash
   # Send notification
   echo "Starting database migration" | mail -s "Migration Alert" team@company.com
   ```

2. **Create backup**
   ```bash
   ./scripts/backup.sh
   ```

3. **Verify backup**
   ```bash
   ./scripts/verify-backups.sh
   ```

4. **Data validation**
   ```bash
   python -c "from validation import validate_data_before_migration; print(validate_data_before_migration())"
   ```

### During Migration

1. **Stop services**
   ```bash
   docker-compose down
   ```

2. **Apply migrations**
   ```bash
   python -m backend.migrations apply all
   ```

3. **Validate data**
   ```bash
   python -c "from validation import validate_data_after_migration; print(validate_data_after_migration())"
   ```

4. **Restart services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Post-Migration

1. **Health check**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Verify services**
   ```bash
   docker-compose ps
   ```

3. **Check logs**
   ```bash
   docker-compose logs backend | grep ERROR
   ```

4. **Monitor metrics**
   - Check error rate
   - Check response times
   - Check database connections

---

## DISASTER RECOVERY

### Recovery Time Objectives (RTO)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single container failure | 5 min | 0 min |
| Database failure | 15 min | 1 hour |
| Multi-service failure | 30 min | 30 min |
| Complete data loss | 2 hours | 6 hours |

### Recovery Procedures

#### Container Failure
```bash
# Docker automatically restarts failed containers
docker-compose up -d --no-build
```

#### Database Failure
```bash
# Restore from latest backup
./scripts/restore.sh /backups/latest-backup.tar.gz

# Verify data
mongo --eval "db.orders.count()"
```

#### Data Corruption
```bash
# Restore to known good state
./scripts/point-in-time-restore.sh "2026-01-28 10:00:00"

# Verify integrity
python scripts/verify-data.py
```

---

## MIGRATION SUCCESS CRITERIA

✅ All collections created  
✅ All indexes created  
✅ No data loss  
✅ Data validation passed  
✅ Services operational  
✅ No error rate increase  
✅ No response time degradation  
✅ Audit logging active  

---

*Implementation Date*: January 28, 2026
*Migration Framework Version*: 1.0
*Last Updated*: January 28, 2026
