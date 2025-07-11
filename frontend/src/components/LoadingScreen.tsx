import React from 'react';
import { Loader2, GraduationCap } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading School Nexus...", 
  fullScreen = true 
}) => {
  const containerClass = fullScreen 
    ? "fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClass}>
      <div className="text-center">
        {/* Logo and Branding */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            
            {/* Animated Ring */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
              <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">School Nexus</h1>
          <p className="text-gray-600">AI-Powered School Management</p>
        </div>

        {/* Loading Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-gray-700 font-medium">{message}</span>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>

        {/* Loading Tips */}
        <div className="mt-8 max-w-md">
          <p className="text-sm text-gray-500">
            Setting up your intelligent school management experience...
          </p>
        </div>
      </div>
    </div>
  );
};

// Skeleton loader for content areas
export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-200 rounded h-4 w-full mb-2"></div>
      <div className="bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
      <div className="bg-gray-200 rounded h-4 w-1/2"></div>
    </div>
  );
};

// Card skeleton for dashboard
export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="bg-gray-200 rounded h-4 w-24 mb-2"></div>
          <div className="bg-gray-200 rounded h-8 w-16"></div>
        </div>
        <div className="bg-gray-200 rounded-full w-12 h-12"></div>
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="bg-gray-200 rounded h-6 w-48 animate-pulse"></div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={colIndex} 
                  className="bg-gray-200 rounded h-4 flex-1 animate-pulse"
                  style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.1}s` }}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};