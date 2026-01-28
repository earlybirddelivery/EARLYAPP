# MongoDB Atlas Setup - Automated Guide

## Quick Start (Fastest Route - 10 minutes)

### 1. Create MongoDB Atlas Account
```
https://www.mongodb.com/cloud/atlas
→ Try Free
→ Sign up with Google
→ Verify email
```

### 2. Create Cluster (Automated Steps)
After signup, follow wizard:
1. **Deploy** your first database
2. Select **M0 FREE** tier (always free)
3. Choose **AWS** provider
4. Select nearest region to you:
   - US: `us-east-1` (N. Virginia)
   - EU: `eu-west-1` (Ireland)
   - Asia: `ap-southeast-1` (Singapore)
5. Click **Create Deployment**
6. Wait 3-5 minutes

### 3. Create Database User
1. Click **Security** → **Database Access**
2. Click **Add New Database User**
3. Username: `earlyapp_user`
4. Password: Generate strong password (20+ chars)
5. Database User Privileges: **Built-in Role → Read and write to any database**
6. Click **Add User**
7. **SAVE YOUR PASSWORD** - You won't see it again!

### 4. Configure Network Access
1. Go to **Security** → **Network Access**
2. Click **Add IP Address**
3. For Development: **Allow Access from Anywhere**
   - CIDR: `0.0.0.0/0`
   - Confirm
4. For Production: Only add Cloud Run IPs
   ```
   Cloud Run uses dynamic IPs, so you'll need to either:
   - Use private IP connections
   - Or keep it open and rely on authentication
   ```

### 5. Get Connection String
1. Click **Databases** tab
2. Find your cluster
3. Click **Connect**
4. Choose **Drivers**
5. Driver: **Node.js**, Version: **5.x**
6. Copy the connection string
7. **Replace**:
   - `<password>` → Your password from Step 3
   - `<database>` → `earlyapp`
   - Remove `/<username>` if present

**Final Connection String:**
```
mongodb+srv://earlyapp_user:YOUR_PASSWORD@cluster0-xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
```

### 6. Test Connection
Optional - verify connection works before deploying backend:

```bash
# Install mongosh (MongoDB CLI)
npm install -g mongodb-cli-shell

# Or use MongoDB Compass GUI
# Download from: https://www.mongodb.com/products/tools/compass

# Test with your connection string
mongosh "mongodb+srv://earlyapp_user:PASSWORD@cluster0-xxxxx.mongodb.net/earlyapp"
```

---

## Create Initial Database & Collections

Once connected, run these commands:

```javascript
// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.orders.createIndex({ customerId: 1 });
db.orders.createIndex({ createdAt: -1 });
db.deliveries.createIndex({ deliveryBoyId: 1 });
db.deliveries.createIndex({ orderId: 1 });
db.products.createIndex({ supplierId: 1 });

// Optional: Create sample collections
db.createCollection("users");
db.createCollection("orders");
db.createCollection("deliveries");
db.createCollection("products");

// Verify
show collections
```

---

## MongoDB Connection in Backend

### Environment Variable
```bash
MONGODB_URI=mongodb+srv://earlyapp_user:PASSWORD@cluster0-xxxxx.mongodb.net/earlyapp?retryWrites=true&w=majority
```

### Python Code Example (using Motor - async)
```python
from motor.motor_asyncio import AsyncClient
import os

MONGODB_URI = os.getenv("MONGODB_URI")
client = AsyncClient(MONGODB_URI)
db = client.earlyapp

# Use in routes:
users = db.users
orders = db.orders
# etc.
```

---

## Backup Strategy

### Automatic Backups (Free Tier)
- MongoDB Atlas provides:
  - 10 automated snapshots (7 days retention)
  - Snapshots every 6 hours

### Manual Backups
```bash
# Export database
mongodump --uri "mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp"

# Import database
mongorestore --uri "mongodb+srv://earlyapp_user:PASSWORD@cluster0.xxxxx.mongodb.net/earlyapp" ./dump
```

---

## Upgrade from M0 to Paid (When Needed)

If you exceed M0 limits:
1. Go to **Clusters** → Your cluster
2. Click **Upgrade**
3. Choose **M2** (paid tier starts here - ~$9/month)
4. Increases:
   - Storage: 10GB
   - Data transfer
   - Concurrent connections

---

## Security Best Practices

✅ **What you've done**:
- Created dedicated user (not admin)
- Set strong password
- Configured network access

✅ **Additional steps for production**:
- Use IP allowlist instead of 0.0.0.0/0
- Enable TLS/SSL (enabled by default)
- Enable 2-Factor Authentication
- Use VPC peering for private connections
- Enable MongoDB encryption at rest

---

## Troubleshooting

### "Connection Timeout"
- Check network access allows your IP
- Verify password is correct
- Try from different network
- Check cluster is running (green status)

### "Authentication Failed"
- Verify username and password
- Check special characters are URL-encoded
- Re-create user with simpler password temporarily

### "Database Not Found"
- Database is created automatically on first write
- Or create explicitly: `use earlyapp`

---

## Next Steps After Setup

1. ✅ Get connection string
2. Set `MONGODB_URI` environment variable
3. Deploy backend to Cloud Run
4. Backend will automatically create collections on first use
5. Verify data in MongoDB Atlas console

**Connection String Ready?** → Proceed to Backend Deployment
