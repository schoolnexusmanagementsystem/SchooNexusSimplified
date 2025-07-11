# 🚀 School Nexus - Production Deployment Guide

This guide provides step-by-step instructions for deploying School Nexus to production environments.

## 📋 Pre-Deployment Checklist

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **RAM**: Minimum 4GB (8GB+ recommended)
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores
- **Network**: Open ports 80, 443, 8000, 5432, 6379

### Dependencies
- Docker 20.10+ and Docker Compose 2.0+
- PostgreSQL 13+ (if not using Docker)
- Redis 6+ (for caching)
- Nginx (for reverse proxy)
- SSL Certificate (Let's Encrypt recommended)

## 🐳 Docker Deployment (Recommended)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/school-nexus.git
cd school-nexus

# Copy environment file
cp .env.example .env

# Configure environment variables
nano .env
```

### 3. Environment Configuration

Edit `.env` with your production values:

```bash
# Security (CHANGE THESE!)
SECRET_KEY=your-super-secure-secret-key-here
JWT_SECRET_KEY=your-super-secure-jwt-key-here
POSTGRES_PASSWORD=your-secure-database-password
REDIS_PASSWORD=your-secure-redis-password

# Database
DATABASE_TYPE=postgresql
POSTGRES_HOST=postgres
POSTGRES_USER=postgres
POSTGRES_DB=school_nexus

# Domain and CORS
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# AI Features (Optional)
OPENAI_API_KEY=your-openai-api-key
ENABLE_AI_FEATURES=true

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENABLE_METRICS=true

# Production settings
DEBUG=false
SETUP_COMPLETED=false
```

### 4. Deploy Application

```bash
# Start basic services
docker-compose up -d postgres redis backend frontend

# Check logs
docker-compose logs -f backend

# For full production with monitoring
docker-compose --profile production --profile monitoring up -d

# Check all services
docker-compose ps
```

### 5. Initial Setup

1. Open `https://yourdomain.com` in browser
2. Complete setup wizard:
   - Database connection (already configured)
   - Super admin account
   - Platform settings
3. Login and create your first school

## 🔧 Manual Deployment

### 1. Database Setup (PostgreSQL)

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE school_nexus;
CREATE USER school_nexus_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE school_nexus TO school_nexus_user;
\q
```

### 2. Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

### 3. Backend Deployment

```bash
# Install Python and dependencies
sudo apt install python3 python3-pip python3-venv

# Create application directory
sudo mkdir -p /opt/school-nexus
sudo chown $USER:$USER /opt/school-nexus
cd /opt/school-nexus

# Clone repository
git clone https://github.com/your-org/school-nexus.git .

# Setup Python environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Create systemd service
sudo nano /etc/systemd/system/school-nexus.service
```

**Systemd Service File:**
```ini
[Unit]
Description=School Nexus FastAPI App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/school-nexus/backend
Environment=PATH=/opt/school-nexus/backend/venv/bin
EnvironmentFile=/opt/school-nexus/backend/.env
ExecStart=/opt/school-nexus/backend/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable school-nexus
sudo systemctl start school-nexus
sudo systemctl status school-nexus
```

### 4. Frontend Deployment

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build frontend
cd /opt/school-nexus/frontend
npm install -g yarn
yarn install
yarn build

# Copy to web directory
sudo mkdir -p /var/www/school-nexus
sudo cp -r build/* /var/www/school-nexus/
sudo chown -R www-data:www-data /var/www/school-nexus
```

### 5. Nginx Configuration

```bash
# Install Nginx
sudo apt install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/school-nexus
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Frontend
    location / {
        root /var/www/school-nexus;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads {
        alias /opt/school-nexus/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/school-nexus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create symlink
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring Setup

### 1. Application Monitoring

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/school-nexus
```

```
/opt/school-nexus/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload school-nexus
    endscript
}
```

### 2. Database Backup

```bash
# Create backup script
sudo nano /opt/backup-school-nexus.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/school-nexus"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U school_nexus_user school_nexus | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# File backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /opt/school-nexus/backend/uploads

# Keep only last 30 backups
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable and schedule
chmod +x /opt/backup-school-nexus.sh
sudo crontab -e
# Add: 0 2 * * * /opt/backup-school-nexus.sh
```

### 3. Health Monitoring

```bash
# Create health check script
sudo nano /opt/health-check.sh
```

```bash
#!/bin/bash
# Check backend health
curl -f http://localhost:8000/health || exit 1

# Check database connection
pg_isready -h localhost -U school_nexus_user || exit 1

# Check Redis
redis-cli -a your_redis_password ping || exit 1

echo "All services healthy"
```

## 🔧 Performance Optimization

### 1. Database Optimization

```sql
-- Connect to PostgreSQL and run these optimizations
\c school_nexus

-- Create additional indexes for performance
CREATE INDEX CONCURRENTLY idx_users_school_active ON users(school_id, is_active);
CREATE INDEX CONCURRENTLY idx_schools_status_created ON schools(status, created_at);
CREATE INDEX CONCURRENTLY idx_logs_created_action ON system_logs(created_at, action);

-- Update table statistics
ANALYZE;
```

### 2. Application Caching

Update `.env` for production caching:
```bash
# Enable Redis caching
REDIS_URL=redis://:your_redis_password@localhost:6379
REDIS_TTL=3600

# Enable application caching
ENABLE_CACHING=true
```

### 3. Nginx Optimization

Add to Nginx configuration:
```nginx
# Worker processes
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# File caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 Troubleshooting

### Common Issues

**1. Backend won't start:**
```bash
# Check logs
sudo journalctl -u school-nexus -f

# Check database connection
sudo -u postgres psql -c "SELECT 1"

# Check environment variables
systemctl show school-nexus --property=Environment
```

**2. Frontend 404 errors:**
```bash
# Check Nginx configuration
sudo nginx -t

# Check file permissions
ls -la /var/www/school-nexus/

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**3. Database connection issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U school_nexus_user -d school_nexus -c "SELECT 1"

# Check firewall
sudo ufw status
```

**4. SSL certificate issues:**
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Renew certificate
sudo certbot renew --dry-run
```

### Performance Monitoring

```bash
# Monitor system resources
htop
iotop
df -h

# Monitor database performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity"

# Monitor Nginx logs
sudo tail -f /var/log/nginx/access.log

# Monitor application logs
sudo journalctl -u school-nexus -f
```

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Backup before update
/opt/backup-school-nexus.sh

# Pull latest code
cd /opt/school-nexus
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart school-nexus

# Update frontend
cd ../frontend
yarn install
yarn build
sudo cp -r build/* /var/www/school-nexus/
sudo systemctl reload nginx
```

### Database Migrations

```bash
# Run any pending migrations
cd /opt/school-nexus/backend
source venv/bin/activate
python -c "from database import init_database; import asyncio; asyncio.run(init_database())"
```

## 📞 Support

For deployment support:
- Documentation: [docs.schoolnexus.com](https://docs.schoolnexus.com)
- Community: [Discord](https://discord.gg/school-nexus)
- Professional Support: support@schoolnexus.com

---

**Remember**: Always test deployments in a staging environment before deploying to production!