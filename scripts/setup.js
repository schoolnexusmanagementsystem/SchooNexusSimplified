#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up School Nexus...\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, cwd = process.cwd()) {
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if Node.js version is compatible
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    log('❌ Node.js 18 or higher is required. Please upgrade Node.js.', 'red');
    process.exit(1);
  }
  
  log(`✅ Node.js version: ${nodeVersion}`, 'green');
}

// Install dependencies
function installDependencies() {
  log('📦 Installing dependencies...', 'blue');
  
  // Install root dependencies
  if (!runCommand('npm install')) {
    log('❌ Failed to install root dependencies', 'red');
    return false;
  }
  
  // Install backend dependencies
  log('📦 Installing backend dependencies...', 'blue');
  if (!runCommand('npm install', './backend')) {
    log('❌ Failed to install backend dependencies', 'red');
    return false;
  }
  
  // Install frontend dependencies
  log('📦 Installing frontend dependencies...', 'blue');
  if (!runCommand('npm install', './frontend')) {
    log('❌ Failed to install frontend dependencies', 'red');
    return false;
  }
  
  log('✅ All dependencies installed successfully', 'green');
  return true;
}

// Create environment files
function createEnvFiles() {
  log('🔧 Creating environment files...', 'blue');
  
  // Backend .env
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  if (!fs.existsSync(backendEnvPath)) {
    const backendEnvContent = `# Database Configuration
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/school_nexus"

# JWT Configuration
JWT_SECRET="school-nexus-secret-key-2024-change-in-production"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"

# Server Configuration
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Logging
LOG_LEVEL="info"

# Redis Configuration (optional)
REDIS_URL="redis://localhost:6379"
`;
    
    fs.writeFileSync(backendEnvPath, backendEnvContent);
    log('✅ Created backend/.env', 'green');
  }
  
  // Frontend .env
  const frontendEnvPath = path.join(__dirname, '../frontend/.env');
  if (!fs.existsSync(frontendEnvPath)) {
    const frontendEnvContent = `REACT_APP_API_URL="http://localhost:5000/api"
REACT_APP_SOCKET_URL="http://localhost:5000"
`;
    
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    log('✅ Created frontend/.env', 'green');
  }
}

// Create necessary directories
function createDirectories() {
  log('📁 Creating necessary directories...', 'blue');
  
  const directories = [
    './backend/logs',
    './backend/uploads',
    './frontend/build'
  ];
  
  directories.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      log(`✅ Created ${dir}`, 'green');
    }
  });
}

// Generate Prisma client
function generatePrismaClient() {
  log('🔧 Generating Prisma client...', 'blue');
  
  if (!runCommand('npx prisma generate', './backend')) {
    log('❌ Failed to generate Prisma client', 'red');
    return false;
  }
  
  log('✅ Prisma client generated', 'green');
  return true;
}

// Main setup function
function main() {
  log('🏫 School Nexus Setup Script', 'blue');
  log('=============================\n', 'blue');
  
  // Check Node.js version
  checkNodeVersion();
  
  // Create directories
  createDirectories();
  
  // Create environment files
  createEnvFiles();
  
  // Install dependencies
  if (!installDependencies()) {
    log('❌ Setup failed during dependency installation', 'red');
    process.exit(1);
  }
  
  // Generate Prisma client
  if (!generatePrismaClient()) {
    log('❌ Setup failed during Prisma client generation', 'red');
    process.exit(1);
  }
  
  log('\n🎉 Setup completed successfully!', 'green');
  log('\n📋 Next steps:', 'blue');
  log('1. Configure your database connection in backend/.env', 'yellow');
  log('2. Add your OpenAI API key in backend/.env', 'yellow');
  log('3. Run database migrations: cd backend && npx prisma migrate dev', 'yellow');
  log('4. Start the development servers: npm run dev', 'yellow');
  log('\n🌐 Access the application:', 'blue');
  log('- Frontend: http://localhost:3000', 'yellow');
  log('- Backend API: http://localhost:5000', 'yellow');
  log('- API Documentation: http://localhost:5000/api/docs', 'yellow');
  log('\n🔑 Default Super Admin credentials:', 'blue');
  log('- Email: admin@schoolnexus.com', 'yellow');
  log('- Password: admin123', 'yellow');
}

// Run setup
if (require.main === module) {
  main();
}

module.exports = { main };