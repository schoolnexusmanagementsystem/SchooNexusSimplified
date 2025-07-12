# 🏫 School Nexus - AI-Driven School Management SaaS Platform

A production-ready, multi-tenant SaaS platform for school management with AI-powered features, designed to serve multiple schools with a single hosted backend.

## ✨ Features

### 🏢 Multi-Tenant SaaS Architecture
- **Single hosted backend** serving multiple schools
- **Tenant isolation** with row-level security
- **Super Admin dashboard** for platform management
- **School-specific dashboards** with scoped data access

### 👥 User Role Management
- **Super Admin**: Platform owner with full access
- **School Admin**: School-specific administrator
- **Staff**: Teachers and administrative staff
- **Students**: Student accounts with limited access
- **Parents**: Parent accounts for student monitoring
- **Visitors**: Limited access accounts

### 🤖 AI-Powered Features
- **AI Chat Assistant** per school with context awareness
- **Voice-to-text** integration using OpenAI Whisper
- **Natural language queries** for school data
- **Dynamic response types**: Text, tables, charts, documents

### 📊 Modern Dashboard
- **Role-based dashboards** with customizable statistics
- **Real-time notifications** and activity feeds
- **Responsive design** for desktop and mobile
- **Dark/Light theme** support

### 📄 Document Generation
- **Dynamic document templates** with Handlebars
- **PDF export** for reports, certificates, ID cards
- **Template management** per school
- **Batch document generation**

### 🤖 Chatbot Integration
- **Telegram bot** support per school
- **WhatsApp bot** integration
- **School-scoped bot responses**
- **Admin configuration panel**

### 📱 Progressive Web App (PWA)
- **Installable** on mobile and desktop
- **Offline-ready** (with limitations)
- **Push notifications** support
- **Native-like experience**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+ or MySQL 8+
- Redis (optional, for caching)
- Docker & Docker Compose (for containerized deployment)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd school-nexus
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Set up environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

4. **Set up the database**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. **Start the development servers**
```bash
# From root directory
npm run dev

# Or start individually
npm run dev:backend  # Backend on http://localhost:5000
npm run dev:frontend # Frontend on http://localhost:3000
```

### Docker Deployment

1. **Build and start all services**
```bash
docker-compose up -d
```

2. **Run database migrations**
```bash
docker-compose exec backend npm run migrate:deploy
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
```
backend/
├── src/
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, validation, error handling
│   ├── utils/           # Utilities and helpers
│   ├── socket/          # Socket.IO setup
│   ├── cron/            # Scheduled tasks
│   └── index.ts         # Main server file
├── prisma/              # Database schema and migrations
├── uploads/             # File uploads
└── logs/                # Application logs
```

### Frontend (React + TypeScript + Tailwind CSS)
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── stores/          # State management (Zustand)
│   ├── utils/           # Utilities and helpers
│   └── App.tsx          # Main app component
├── public/              # Static assets
└── build/               # Production build
```

### Database Schema
- **Multi-tenant design** with school_id foreign keys
- **User management** with role-based access
- **School data** (students, staff, classes, subjects)
- **AI interactions** tracking
- **Document templates** and generation
- **Bot configurations** per school

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/school_nexus"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Server
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

#### Frontend (.env)
```env
REACT_APP_API_URL="http://localhost:5000/api"
REACT_APP_SOCKET_URL="http://localhost:5000"
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Admin Routes (Super Admin only)
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/schools` - List all schools
- `POST /api/admin/schools` - Create new school
- `GET /api/admin/users` - List all users

### School Routes (School Admin)
- `GET /api/school/dashboard` - School dashboard
- `GET /api/school/users` - School users
- `GET /api/school/students` - School students
- `GET /api/school/staff` - School staff

### AI Routes
- `POST /api/ai/chat` - AI chat interaction
- `GET /api/ai/history` - AI interaction history
- `POST /api/ai/voice-to-text` - Voice transcription

### Document Routes
- `GET /api/documents/templates` - Get templates
- `POST /api/documents/templates` - Create template
- `POST /api/documents/generate` - Generate document

## 🚀 Deployment

### Production Deployment

1. **Set up production environment**
```bash
# Set NODE_ENV=production
# Configure production database
# Set up SSL certificates
# Configure domain names
```

2. **Build and deploy**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

3. **Run migrations**
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:deploy
```

### Cloud Deployment

#### AWS Deployment
- Use AWS ECS for container orchestration
- RDS for PostgreSQL database
- ElastiCache for Redis
- CloudFront for CDN
- Route 53 for DNS

#### Google Cloud Deployment
- Use Google Cloud Run for containers
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud CDN for content delivery

## 🔒 Security Features

- **JWT authentication** with secure token handling
- **Role-based access control** (RBAC)
- **Multi-tenant data isolation**
- **Rate limiting** and request throttling
- **CORS configuration** for cross-origin requests
- **Helmet.js** for security headers
- **Input validation** and sanitization
- **SQL injection prevention** with Prisma ORM

## 📊 Monitoring & Logging

- **Winston logging** with file and console outputs
- **Health check endpoints** for monitoring
- **Error tracking** with detailed error logs
- **Performance monitoring** with request timing
- **Database query logging** in development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Contact the development team

## 🎯 Roadmap

- [ ] **Advanced Analytics Dashboard**
- [ ] **Mobile App** (React Native)
- [ ] **Advanced AI Features** (predictive analytics)
- [ ] **Payment Integration** (Stripe/Paystack)
- [ ] **Advanced Reporting** with custom dashboards
- [ ] **API Rate Limiting** per school
- [ ] **Advanced Security** (2FA, SSO)
- [ ] **Performance Optimization** (caching, CDN)
- [ ] **Multi-language Support**
- [ ] **Advanced Bot Features** (voice, image recognition)

---

**Built with ❤️ for modern education management**
