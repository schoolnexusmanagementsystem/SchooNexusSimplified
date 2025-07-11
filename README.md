# 🏫 School Nexus - AI-Powered Multi-Tenant School Management SaaS

A modern, production-ready, full-stack SaaS platform for school management with AI-powered features, multi-tenant architecture, and comprehensive administrative tools.

## 🌟 Features

### 🔧 Core Platform Features
- **Multi-Tenant Architecture**: Single platform serving multiple schools
- **Role-Based Access Control**: Super Admin, School Admin, Staff, Students, Parents
- **Modern Setup Wizard**: First-run configuration for database and admin setup
- **Responsive Design**: Desktop and mobile-optimized interface
- **Progressive Web App (PWA)**: Installable on all devices
- **Real-time Notifications**: In-app, email, and SMS notifications

### 🤖 AI-Powered Features
- **Intelligent Chat Assistant**: Role-based AI assistant for each user type
- **Voice Input Support**: Speech-to-text for natural interactions
- **Smart Document Generation**: AI-generated ID cards, reports, certificates
- **Data Analytics & Insights**: AI-powered dashboard statistics and trends
- **Natural Language Queries**: Ask questions about school data in plain English

### 📊 School Management
- **Student Information System**: Complete student records and profiles
- **Staff Management**: Employee records, roles, and permissions
- **Class & Subject Management**: Academic structure organization
- **Document Management**: Digital document storage and generation
- **Attendance Tracking**: Automated attendance monitoring
- **Grade Management**: Comprehensive gradebook system

### 🔗 Integration & Communication
- **Telegram Bot Integration**: Per-school bot instances
- **WhatsApp Integration**: Automated messaging via Twilio
- **Email Notifications**: SMTP-based email delivery
- **File Upload & Storage**: Multiple storage backends (S3, MinIO, Cloudinary)
- **API-First Design**: RESTful APIs for all functionality

### 🛡️ Security & Compliance
- **JWT Authentication**: Secure token-based authentication
- **Two-Factor Authentication**: Enhanced security for admin accounts
- **Rate Limiting**: API abuse prevention
- **Audit Logging**: Complete activity tracking
- **Data Encryption**: Secure data storage and transmission

## 🏗️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.8+)
- **Database**: PostgreSQL / MySQL / MongoDB / Supabase
- **Authentication**: JWT with bcrypt password hashing
- **AI Integration**: OpenAI GPT-4 / Anthropic Claude
- **Voice Processing**: Speech Recognition / Whisper API
- **Document Generation**: ReportLab / WeasyPrint
- **Caching**: Redis
- **Task Queue**: Celery
- **Monitoring**: Sentry, Prometheus

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand + React Query
- **UI Components**: Radix UI + Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Chart.js / Recharts
- **Forms**: React Hook Form
- **Voice Input**: React Speech Recognition

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: Multi-database support with automatic migration
- **File Storage**: AWS S3, MinIO, Cloudinary, or local storage
- **Deployment**: Production-ready with environment configuration
- **Monitoring**: Health checks, metrics, and error tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and Yarn
- Python 3.8+ and pip
- Database (PostgreSQL/MySQL/MongoDB) or Supabase account
- Optional: Redis for caching
- Optional: OpenAI/Anthropic API key for AI features

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/school-nexus.git
cd school-nexus
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
yarn install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

### 4. Database Setup

#### Option A: PostgreSQL (Recommended)
```bash
# Install PostgreSQL and create database
createdb school_nexus

# Update .env with PostgreSQL credentials
DATABASE_TYPE=postgresql
POSTGRES_HOST=localhost
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=school_nexus
```

#### Option B: Supabase (Easiest)
```bash
# Create Supabase project at https://supabase.com
# Update .env with Supabase credentials
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

#### Option C: MySQL
```bash
# Update .env with MySQL credentials
DATABASE_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=school_nexus
```

### 5. Start the Application

#### Backend
```bash
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
yarn start
```

### 6. Initial Setup
1. Open `http://localhost:3000` in your browser
2. Complete the setup wizard:
   - Configure database connection
   - Set up super admin account
   - Configure basic platform settings
3. Login with your super admin credentials
4. Create your first school and school admin

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Application
APP_NAME=School Nexus
DEBUG=false

# Database
DATABASE_TYPE=postgresql
POSTGRES_HOST=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=school_nexus

# AI Features
OPENAI_API_KEY=your_openai_key
ENABLE_AI_FEATURES=true
ENABLE_VOICE_FEATURES=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Security
JWT_SECRET_KEY=your_secret_key
SECRET_KEY=your_app_secret
```

#### Frontend (.env.local)
```bash
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_APP_NAME=School Nexus
REACT_APP_ENABLE_PWA=true
```

### Database Migration
The application automatically creates database tables on first run. For manual migration:
```bash
cd backend
python -c "from database import init_database; import asyncio; asyncio.run(init_database())"
```

## 📱 PWA Installation

The application supports Progressive Web App (PWA) installation:

1. **Desktop**: Click the install button in the address bar
2. **Mobile**: Use "Add to Home Screen" from the browser menu
3. **Features**: Offline capability, push notifications, native app experience

## 🤖 AI Configuration

### OpenAI Setup
1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. Add to backend `.env`: `OPENAI_API_KEY=your_key`
3. Set `AI_PROVIDER=openai` and `AI_MODEL=gpt-4`

### Anthropic Setup
1. Get API key from [Anthropic Console](https://console.anthropic.com)
2. Add to backend `.env`: `ANTHROPIC_API_KEY=your_key`
3. Set `AI_PROVIDER=anthropic`

### Voice Features
For voice input support:
```bash
# Option 1: Browser native (Chrome/Edge)
ENABLE_VOICE_FEATURES=true

# Option 2: Whisper API
WHISPER_API_KEY=your_whisper_key
```

## 🔗 Bot Integration

### Telegram Bot
1. Create bot with [@BotFather](https://t.me/botfather)
2. Add to school settings: `TELEGRAM_BOT_TOKEN=your_token`
3. Set webhook URL: `TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook`

### WhatsApp (Twilio)
1. Get Twilio credentials from [Twilio Console](https://console.twilio.com)
2. Add to `.env`:
```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

## 🚀 Production Deployment

### Docker Deployment (Recommended)

#### 1. Using Docker Compose
```bash
# Clone repository
git clone https://github.com/your-org/school-nexus.git
cd school-nexus

# Copy production environment
cp .env.example .env
# Edit .env with production values

# Start with Docker Compose
docker-compose up -d
```

#### 2. Manual Docker Build
```bash
# Build backend
cd backend
docker build -t school-nexus-backend .

# Build frontend
cd frontend
docker build -t school-nexus-frontend .

# Run containers
docker run -d -p 8000:8000 school-nexus-backend
docker run -d -p 3000:3000 school-nexus-frontend
```

### Manual Deployment

#### Backend (Ubuntu/CentOS)
```bash
# Install Python and dependencies
sudo apt-get update
sudo apt-get install python3 python3-pip postgresql nginx

# Clone and setup
git clone https://github.com/your-org/school-nexus.git
cd school-nexus/backend
pip3 install -r requirements.txt

# Setup systemd service
sudo cp school-nexus.service /etc/systemd/system/
sudo systemctl enable school-nexus
sudo systemctl start school-nexus

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/school-nexus
sudo ln -s /etc/nginx/sites-available/school-nexus /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

#### Frontend (Build and Serve)
```bash
cd frontend
yarn install
yarn build

# Serve with Nginx or any static server
sudo cp -r build/* /var/www/school-nexus/
```

### Environment Configuration

#### Production Environment Variables
```bash
# Security
DEBUG=false
SECRET_KEY=your_production_secret_key
JWT_SECRET_KEY=your_production_jwt_key

# Database (Production)
DATABASE_TYPE=postgresql
POSTGRES_HOST=your_db_host
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=school_nexus_prod

# HTTPS and Security
CORS_ORIGINS=https://your-domain.com,https://api.your-domain.com
TRUSTED_HOSTS=your-domain.com,api.your-domain.com

# Monitoring
SENTRY_DSN=your_sentry_dsn
ENABLE_METRICS=true

# Performance
REDIS_URL=redis://your-redis-host:6379
ENABLE_CACHING=true
```

## 🔒 Security Checklist

- [ ] Change default admin credentials
- [ ] Use strong secret keys
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review user permissions
- [ ] Test disaster recovery

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl http://localhost:8000/health

# API status
curl http://localhost:8000/api/system/stats
```

### Log Management
```bash
# Backend logs
tail -f backend/logs/school_nexus.log

# System logs
journalctl -u school-nexus -f
```

### Database Backup
```bash
# PostgreSQL backup
pg_dump school_nexus > backup_$(date +%Y%m%d).sql

# Automated backup script
0 2 * * * /path/to/backup_script.sh
```

## 🛠️ Development

### Local Development Setup
```bash
# Backend development
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Frontend development
cd frontend
yarn start

# Run tests
yarn test
```

### API Documentation
- **Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Spec**: `http://localhost:8000/openapi.json`

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📞 Support

### Documentation
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Admin Guide](docs/admin-guide.md)
- [Developer Guide](docs/developer-guide.md)

### Community
- [Discord Community](https://discord.gg/school-nexus)
- [GitHub Issues](https://github.com/your-org/school-nexus/issues)
- [Feature Requests](https://github.com/your-org/school-nexus/discussions)

### Professional Support
- Email: support@schoolnexus.com
- Enterprise Support: enterprise@schoolnexus.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://reactjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- AI powered by [OpenAI](https://openai.com/) and [Anthropic](https://anthropic.com/)

---

**School Nexus** - Transforming education through intelligent school management.

For more information, visit [schoolnexus.com](https://schoolnexus.com)
