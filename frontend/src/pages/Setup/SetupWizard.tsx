import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Database, Settings, User, CheckCircle } from 'lucide-react';

interface SetupForm {
  databaseType: 'postgresql' | 'mysql' | 'supabase';
  databaseUrl: string;
  platformName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetupForm>();

  const databaseType = watch('databaseType');

  const steps = [
    {
      id: 1,
      title: 'Database Configuration',
      icon: Database,
      description: 'Choose your database type and configure connection',
    },
    {
      id: 2,
      title: 'Platform Settings',
      icon: Settings,
      description: 'Set up your platform name and branding',
    },
    {
      id: 3,
      title: 'Admin Account',
      icon: User,
      description: 'Create your super administrator account',
    },
    {
      id: 4,
      title: 'Complete',
      icon: CheckCircle,
      description: 'Setup completed successfully',
    },
  ];

  const onSubmit = async (data: SetupForm) => {
    setIsSubmitting(true);
    
    try {
      // Simulate setup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store setup completion
      localStorage.setItem('setupComplete', 'true');
      
      // Move to completion step
      setCurrentStep(4);
      
      // Complete setup after showing success
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Setup failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Database Type
              </label>
              <select
                {...register('databaseType', { required: 'Database type is required' })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">Select database type</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="supabase">Supabase</option>
              </select>
              {errors.databaseType && (
                <p className="mt-1 text-sm text-red-600">{errors.databaseType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Database URL
              </label>
              <input
                type="text"
                {...register('databaseUrl', { required: 'Database URL is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                placeholder={
                  databaseType === 'supabase' 
                    ? 'https://your-project.supabase.co' 
                    : 'postgresql://username:password@localhost:5432/database'
                }
              />
              {errors.databaseUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.databaseUrl.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform Name
              </label>
              <input
                type="text"
                {...register('platformName', { required: 'Platform name is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="School Nexus"
              />
              {errors.platformName && (
                <p className="mt-1 text-sm text-red-600">{errors.platformName.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                {...register('adminFullName', { required: 'Full name is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="John Doe"
              />
              {errors.adminFullName && (
                <p className="mt-1 text-sm text-red-600">{errors.adminFullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                {...register('adminEmail', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="admin@schoolnexus.com"
              />
              {errors.adminEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.adminEmail.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                {...register('adminPassword', { 
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Enter a strong password"
              />
              {errors.adminPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.adminPassword.message}</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Setup Complete!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your School Nexus platform has been configured successfully.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          School Nexus Setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Configure your platform in a few simple steps
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress Steps */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {steps.map((step) => (
                  <li key={step.id} className="md:flex-1">
                    <div className="group pl-4 py-2 flex flex-col border-l-4 md:pl-0 md:pt-4 md:pb-0 md:border-l-0 md:border-t-4 border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">
                        Step {step.id}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.title}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Step Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            {currentStep < 4 && (
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 border border-transparent rounded-md py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 border border-transparent rounded-md py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;