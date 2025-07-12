# 🚀 School Nexus Deployment Guide

This guide covers different deployment options for the School Nexus platform, from local development to production cloud deployment.

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+ or MySQL 8+
- Redis (optional, for caching)
- Docker & Docker Compose (for containerized deployment)
- Git

## 🏠 Local Development

### Quick Start with Setup Script

1. **Clone and setup**
```bash
git clone <repository-url>
cd school-nexus
npm run setup
```

2. **Configure environment**
```bash
# Edit backend/.env with your database and API keys
# Edit frontend/.env with your API URLs
```

3. **Start development servers**
```bash
npm run dev
```

### Manual Setup

1. **Install dependencies**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. **Set up database**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

3. **Configure environment variables**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit the .env files with your configuration
```

4. **Start servers**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

## 🐳 Docker Deployment

### Development with Docker

1. **Build and start services**
```bash
docker-compose up -d
```

2. **Run migrations**
```bash
docker-compose exec backend npm run migrate:deploy
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Database: localhost:5432

### Production with Docker

1. **Create production environment file**
```bash
cp docker-compose.yml docker-compose.prod.yml
# Edit docker-compose.prod.yml for production settings
```

2. **Build production images**
```bash
docker-compose -f docker-compose.prod.yml build
```

3. **Deploy to production**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Run migrations**
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:deploy
```

## ☁️ Cloud Deployment

### AWS Deployment

#### Option 1: AWS ECS with Fargate

1. **Create ECR repositories**
```bash
aws ecr create-repository --repository-name school-nexus-backend
aws ecr create-repository --repository-name school-nexus-frontend
```

2. **Build and push images**
```bash
# Backend
docker build -t school-nexus-backend ./backend
docker tag school-nexus-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/school-nexus-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/school-nexus-backend:latest

# Frontend
docker build -t school-nexus-frontend ./frontend
docker tag school-nexus-frontend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/school-nexus-frontend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/school-nexus-frontend:latest
```

3. **Create ECS cluster and services**
```bash
# Create cluster
aws ecs create-cluster --cluster-name school-nexus

# Create task definitions and services
# (Use AWS Console or CloudFormation for this step)
```

4. **Set up RDS database**
```bash
aws rds create-db-instance \
  --db-instance-identifier school-nexus-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password <password> \
  --allocated-storage 20
```

#### Option 2: AWS App Runner

1. **Connect your GitHub repository**
2. **Configure build settings**
3. **Set environment variables**
4. **Deploy automatically**

### Google Cloud Deployment

#### Option 1: Google Cloud Run

1. **Enable required APIs**
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

2. **Build and deploy**
```bash
# Backend
gcloud run deploy school-nexus-backend \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Frontend
gcloud run deploy school-nexus-frontend \
  --source ./frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

3. **Set up Cloud SQL**
```bash
gcloud sql instances create school-nexus-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

#### Option 2: Google Kubernetes Engine (GKE)

1. **Create GKE cluster**
```bash
gcloud container clusters create school-nexus-cluster \
  --num-nodes=3 \
  --zone=us-central1-a
```

2. **Deploy with kubectl**
```bash
kubectl apply -f k8s/
```

### DigitalOcean Deployment

1. **Create Droplet**
```bash
# Create a droplet with Docker pre-installed
```

2. **Deploy with Docker Compose**
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Clone repository and deploy
git clone <repository-url>
cd school-nexus
docker-compose up -d
```

3. **Set up domain and SSL**
```bash
# Configure nginx and Let's Encrypt
```

## 🔧 Environment Configuration

### Production Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/school_nexus"

# JWT (Generate a strong secret)
JWT_SECRET="your-super-secret-jwt-key-256-bits-long"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Server
PORT=5000
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"

# Redis
REDIS_URL="redis://your-redis-host:6379"

# Security
CORS_ORIGIN="https://your-domain.com"
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

#### Frontend (.env)
```env
REACT_APP_API_URL="https://api.your-domain.com/api"
REACT_APP_SOCKET_URL="https://api.your-domain.com"
```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL certificate**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

2. **Configure nginx**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Security

1. **Use strong passwords**
2. **Enable SSL connections**
3. **Restrict network access**
4. **Regular backups**

### Application Security

1. **Update JWT secret**
2. **Configure CORS properly**
3. **Enable rate limiting**
4. **Set up monitoring**

## 📊 Monitoring and Logging

### Application Monitoring

1. **Set up Sentry for error tracking**
2. **Configure health checks**
3. **Set up uptime monitoring**

### Database Monitoring

1. **Enable slow query logging**
2. **Monitor connection pools**
3. **Set up backup monitoring**

### Infrastructure Monitoring

1. **CPU and memory usage**
2. **Disk space monitoring**
3. **Network traffic monitoring**

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push Docker images
        run: |
          docker build -t school-nexus-backend ./backend
          docker build -t school-nexus-frontend ./frontend
          # Push to registry
      
      - name: Deploy to production
        run: |
          # Deploy to your cloud provider
```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check firewall rules

2. **CORS errors**
   - Verify CORS_ORIGIN configuration
   - Check frontend API URL

3. **JWT errors**
   - Ensure JWT_SECRET is set
   - Check token expiration

4. **AI API errors**
   - Verify OpenAI API key
   - Check API quota limits

### Debug Commands

```bash
# Check application logs
docker-compose logs backend
docker-compose logs frontend

# Check database connection
docker-compose exec backend npx prisma db push

# Check environment variables
docker-compose exec backend env | grep DATABASE

# Monitor resource usage
docker stats
```

## 📈 Scaling

### Horizontal Scaling

1. **Load balancer setup**
2. **Database read replicas**
3. **Redis clustering**
4. **CDN configuration**

### Vertical Scaling

1. **Increase server resources**
2. **Optimize database queries**
3. **Enable caching**
4. **Compress responses**

## 🔄 Backup and Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Application Backups

1. **Configuration files**
2. **Uploaded files**
3. **Log files**

### Recovery Procedures

1. **Database restoration**
2. **Application rollback**
3. **Data recovery**

---

For more detailed information, refer to the main [README.md](README.md) file.