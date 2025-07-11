import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  User, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { apiService } from '../services/api';
import { DatabaseConfig, SuperAdminConfig } from '../types';

interface SetupStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: SetupStep[] = [
  {
    id: 1,
    title: 'Database Configuration',
    description: 'Configure your database connection',
    icon: <Database className="w-6 h-6" />
  },
  {
    id: 2,
    title: 'Super Admin Account',
    description: 'Create the first administrator account',
    icon: <User className="w-6 h-6" />
  },
  {
    id: 3,
    title: 'Platform Settings',
    description: 'Configure platform settings',
    icon: <Settings className="w-6 h-6" />
  },
  {
    id: 4,
    title: 'Setup Complete',
    description: 'Your School Nexus is ready!',
    icon: <CheckCircle className="w-6 h-6" />
  }
];

export const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({
    database_type: 'postgresql',
    host: 'localhost',
    port: 5432,
    username: '',
    password: '',
    database_name: 'school_nexus',
    supabase_url: '',
    supabase_key: ''
  });

  const [superAdminConfig, setSuperAdminConfig] = useState<SuperAdminConfig>({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const [platformSettings, setPlatformSettings] = useState({
    platform_name: 'School Nexus',
    enable_ai_features: true,
    enable_notifications: true,
    default_timezone: 'UTC'
  });

  const handleDatabaseConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatabaseConfig(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 5432 : value
    }));
  };

  const handleSuperAdminConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSuperAdminConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlatformSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setPlatformSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const validateDatabaseConfig = (): boolean => {
    if (databaseConfig.database_type === 'supabase') {
      return !!(databaseConfig.supabase_url && databaseConfig.supabase_key);
    }
    return !!(databaseConfig.host && databaseConfig.username && databaseConfig.password && databaseConfig.database_name);
  };

  const validateSuperAdminConfig = (): boolean => {
    return !!(
      superAdminConfig.email &&
      superAdminConfig.password &&
      superAdminConfig.confirm_password &&
      superAdminConfig.first_name &&
      superAdminConfig.last_name &&
      superAdminConfig.password === superAdminConfig.confirm_password
    );
  };

  const testDatabaseConnection = async (): Promise<boolean> => {
    try {
      const response = await apiService.post('/setup/test-database', databaseConfig);
      return response.data.success;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  };

  const handleNext = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (currentStep === 1) {
        if (!validateDatabaseConfig()) {
          setError('Please fill in all required database fields.');
          return;
        }
        
        const connectionSuccess = await testDatabaseConnection();
        if (!connectionSuccess) {
          setError('Database connection failed. Please check your configuration.');
          return;
        }
      }
      
      if (currentStep === 2) {
        if (!validateSuperAdminConfig()) {
          setError('Please fill in all required fields and ensure passwords match.');
          return;
        }
      }

      if (currentStep === 3) {
        // Complete setup
        const setupData = {
          database: databaseConfig,
          super_admin: superAdminConfig,
          platform: platformSettings
        };

        await apiService.post('/setup/complete', setupData);
        setCurrentStep(4);
        return;
      }

      if (currentStep === 4) {
        navigate('/login');
        return;
      }

      setCurrentStep(prev => prev + 1);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Type
              </label>
              <select
                name="database_type"
                value={databaseConfig.database_type}
                onChange={handleDatabaseConfigChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="supabase">Supabase</option>
              </select>
            </div>

            {databaseConfig.database_type === 'supabase' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supabase URL
                  </label>
                  <input
                    type="url"
                    name="supabase_url"
                    value={databaseConfig.supabase_url}
                    onChange={handleDatabaseConfigChange}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supabase Anon Key
                  </label>
                  <input
                    type="password"
                    name="supabase_key"
                    value={databaseConfig.supabase_key}
                    onChange={handleDatabaseConfigChange}
                    placeholder="Your Supabase anon key"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host
                    </label>
                    <input
                      type="text"
                      name="host"
                      value={databaseConfig.host}
                      onChange={handleDatabaseConfigChange}
                      placeholder="localhost"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      name="port"
                      value={databaseConfig.port}
                      onChange={handleDatabaseConfigChange}
                      placeholder="5432"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Name
                  </label>
                  <input
                    type="text"
                    name="database_name"
                    value={databaseConfig.database_name}
                    onChange={handleDatabaseConfigChange}
                    placeholder="school_nexus"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={databaseConfig.username}
                    onChange={handleDatabaseConfigChange}
                    placeholder="Database username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={databaseConfig.password}
                    onChange={handleDatabaseConfigChange}
                    placeholder="Database password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={superAdminConfig.first_name}
                  onChange={handleSuperAdminConfigChange}
                  placeholder="Enter first name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={superAdminConfig.last_name}
                  onChange={handleSuperAdminConfigChange}
                  placeholder="Enter last name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={superAdminConfig.email}
                onChange={handleSuperAdminConfigChange}
                placeholder="admin@school.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={superAdminConfig.phone}
                onChange={handleSuperAdminConfigChange}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={superAdminConfig.password}
                onChange={handleSuperAdminConfigChange}
                placeholder="Enter secure password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirm_password"
                value={superAdminConfig.confirm_password}
                onChange={handleSuperAdminConfigChange}
                placeholder="Confirm password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {superAdminConfig.password && superAdminConfig.confirm_password && 
               superAdminConfig.password !== superAdminConfig.confirm_password && (
                <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                name="platform_name"
                value={platformSettings.platform_name}
                onChange={handlePlatformSettingsChange}
                placeholder="School Nexus"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Timezone
              </label>
              <select
                name="default_timezone"
                value={platformSettings.default_timezone}
                onChange={handlePlatformSettingsChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enable_ai_features"
                  checked={platformSettings.enable_ai_features}
                  onChange={handlePlatformSettingsChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Enable AI Features
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enable_notifications"
                  checked={platformSettings.enable_notifications}
                  onChange={handlePlatformSettingsChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Enable Notifications
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Setup Complete!
              </h3>
              <p className="text-gray-600">
                Your School Nexus platform has been successfully configured. You can now log in with your super admin account.
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong>
                <br />
                1. Log in with your super admin account
                <br />
                2. Create your first school
                <br />
                3. Add users and configure AI settings
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">School Nexus Setup</h1>
          <p className="text-gray-600 mt-2">Let's get your school management platform ready</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                  ${currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                  }
                `}>
                  {currentStep > step.id ? <CheckCircle className="w-6 h-6" /> : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-full h-1 mx-4 transition-all
                    ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            {steps.map(step => (
              <div key={step.id} className="text-center max-w-[150px]">
                <h3 className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>
                {currentStep === 4 ? 'Go to Login' : currentStep === 3 ? 'Complete Setup' : 'Next'}
              </span>
              {currentStep < 4 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};