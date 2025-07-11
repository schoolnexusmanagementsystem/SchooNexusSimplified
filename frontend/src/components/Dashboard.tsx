import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { AIChat } from './AIChat';
import { LoadingScreen } from './LoadingScreen';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  TrendingUp,
  Bell,
  FileText,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Target,
  Award
} from 'lucide-react';

interface DashboardStats {
  total_students: number;
  total_staff: number;
  total_classes: number;
  attendance_rate: number;
  upcoming_events: number;
  unread_messages: number;
  recent_activities: number;
  ai_conversations: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user_name: string;
  icon: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load dashboard statistics
      const statsResponse = await apiService.get<DashboardStats>('/dashboard/stats');
      setStats(statsResponse.data);
      
      // Load recent activities
      const activitiesResponse = await apiService.get<RecentActivity[]>('/dashboard/activities');
      setActivities(activitiesResponse.data);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        title: 'AI Assistant',
        description: 'Get help with AI-powered insights',
        icon: <Activity className="w-6 h-6" />,
        action: () => setShowAIChat(true),
        color: 'bg-gradient-to-r from-blue-500 to-purple-600'
      }
    ];

    switch (user?.role) {
      case 'super_admin':
        return [
          ...baseActions,
          {
            title: 'Manage Schools',
            description: 'Add or configure schools',
            icon: <GraduationCap className="w-6 h-6" />,
            action: () => window.location.href = '/schools',
            color: 'bg-gradient-to-r from-green-500 to-teal-600'
          },
          {
            title: 'System Analytics',
            description: 'View platform-wide metrics',
            icon: <BarChart3 className="w-6 h-6" />,
            action: () => window.location.href = '/analytics',
            color: 'bg-gradient-to-r from-purple-500 to-pink-600'
          },
          {
            title: 'User Management',
            description: 'Manage all platform users',
            icon: <Users className="w-6 h-6" />,
            action: () => window.location.href = '/users',
            color: 'bg-gradient-to-r from-orange-500 to-red-600'
          }
        ];

      case 'school_admin':
        return [
          ...baseActions,
          {
            title: 'Student Management',
            description: 'Add or manage students',
            icon: <Users className="w-6 h-6" />,
            action: () => window.location.href = '/students',
            color: 'bg-gradient-to-r from-green-500 to-teal-600'
          },
          {
            title: 'Staff Management',
            description: 'Manage teaching staff',
            icon: <Users className="w-6 h-6" />,
            action: () => window.location.href = '/staff',
            color: 'bg-gradient-to-r from-blue-500 to-indigo-600'
          },
          {
            title: 'Class Management',
            description: 'Create or edit classes',
            icon: <BookOpen className="w-6 h-6" />,
            action: () => window.location.href = '/classes',
            color: 'bg-gradient-to-r from-purple-500 to-pink-600'
          },
          {
            title: 'Send Announcement',
            description: 'Broadcast to school community',
            icon: <MessageSquare className="w-6 h-6" />,
            action: () => window.location.href = '/announcements/new',
            color: 'bg-gradient-to-r from-orange-500 to-red-600'
          }
        ];

      case 'staff':
        return [
          ...baseActions,
          {
            title: 'Take Attendance',
            description: 'Mark student attendance',
            icon: <CheckCircle className="w-6 h-6" />,
            action: () => window.location.href = '/attendance',
            color: 'bg-gradient-to-r from-green-500 to-teal-600'
          },
          {
            title: 'Grade Assignments',
            description: 'Review and grade work',
            icon: <FileText className="w-6 h-6" />,
            action: () => window.location.href = '/assignments',
            color: 'bg-gradient-to-r from-blue-500 to-indigo-600'
          },
          {
            title: 'Schedule Meeting',
            description: 'Schedule parent meetings',
            icon: <Calendar className="w-6 h-6" />,
            action: () => window.location.href = '/meetings/new',
            color: 'bg-gradient-to-r from-purple-500 to-pink-600'
          }
        ];

      case 'student':
        return [
          ...baseActions,
          {
            title: 'View Schedule',
            description: 'Check your class schedule',
            icon: <Calendar className="w-6 h-6" />,
            action: () => window.location.href = '/schedule',
            color: 'bg-gradient-to-r from-green-500 to-teal-600'
          },
          {
            title: 'My Assignments',
            description: 'View and submit work',
            icon: <FileText className="w-6 h-6" />,
            action: () => window.location.href = '/assignments',
            color: 'bg-gradient-to-r from-blue-500 to-indigo-600'
          },
          {
            title: 'Check Grades',
            description: 'View your academic progress',
            icon: <Award className="w-6 h-6" />,
            action: () => window.location.href = '/grades',
            color: 'bg-gradient-to-r from-purple-500 to-pink-600'
          }
        ];

      case 'parent':
        return [
          ...baseActions,
          {
            title: 'Child Progress',
            description: 'View academic performance',
            icon: <TrendingUp className="w-6 h-6" />,
            action: () => window.location.href = '/progress',
            color: 'bg-gradient-to-r from-green-500 to-teal-600'
          },
          {
            title: 'Schedule Meeting',
            description: 'Book teacher meetings',
            icon: <Calendar className="w-6 h-6" />,
            action: () => window.location.href = '/meetings',
            color: 'bg-gradient-to-r from-blue-500 to-indigo-600'
          },
          {
            title: 'School Events',
            description: 'View upcoming events',
            icon: <Bell className="w-6 h-6" />,
            action: () => window.location.href = '/events',
            color: 'bg-gradient-to-r from-purple-500 to-pink-600'
          }
        ];

      default:
        return baseActions;
    }
  };

  const getWelcomeMessage = () => {
    const time = new Date().getHours();
    let greeting = '';
    
    if (time < 12) greeting = 'Good morning';
    else if (time < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    return `${greeting}, ${user?.first_name}! Welcome to ${user?.school?.name || 'School Nexus'}.`;
  };

  const getRoleSpecificStats = () => {
    if (!stats) return [];

    switch (user?.role) {
      case 'super_admin':
        return [
          { label: 'Total Schools', value: stats.total_students, icon: <GraduationCap className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Platform Users', value: stats.total_staff, icon: <Users className="w-5 h-5" />, color: 'text-green-600' },
          { label: 'Active Sessions', value: stats.recent_activities, icon: <Activity className="w-5 h-5" />, color: 'text-purple-600' },
          { label: 'AI Conversations', value: stats.ai_conversations, icon: <Target className="w-5 h-5" />, color: 'text-orange-600' }
        ];

      case 'school_admin':
        return [
          { label: 'Total Students', value: stats.total_students, icon: <Users className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Teaching Staff', value: stats.total_staff, icon: <Users className="w-5 h-5" />, color: 'text-green-600' },
          { label: 'Active Classes', value: stats.total_classes, icon: <BookOpen className="w-5 h-5" />, color: 'text-purple-600' },
          { label: 'Attendance Rate', value: `${stats.attendance_rate}%`, icon: <CheckCircle className="w-5 h-5" />, color: 'text-orange-600' }
        ];

      case 'staff':
        return [
          { label: 'My Students', value: stats.total_students, icon: <Users className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'My Classes', value: stats.total_classes, icon: <BookOpen className="w-5 h-5" />, color: 'text-green-600' },
          { label: 'Unread Messages', value: stats.unread_messages, icon: <MessageSquare className="w-5 h-5" />, color: 'text-purple-600' },
          { label: 'Upcoming Events', value: stats.upcoming_events, icon: <Calendar className="w-5 h-5" />, color: 'text-orange-600' }
        ];

      case 'student':
        return [
          { label: 'My Classes', value: stats.total_classes, icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Pending Assignments', value: stats.unread_messages, icon: <FileText className="w-5 h-5" />, color: 'text-green-600' },
          { label: 'Attendance Rate', value: `${stats.attendance_rate}%`, icon: <CheckCircle className="w-5 h-5" />, color: 'text-purple-600' },
          { label: 'School Events', value: stats.upcoming_events, icon: <Calendar className="w-5 h-5" />, color: 'text-orange-600' }
        ];

      case 'parent':
        return [
          { label: 'Child\'s Classes', value: stats.total_classes, icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-600' },
          { label: 'Unread Messages', value: stats.unread_messages, icon: <MessageSquare className="w-5 h-5" />, color: 'text-green-600' },
          { label: 'Attendance Rate', value: `${stats.attendance_rate}%`, icon: <CheckCircle className="w-5 h-5" />, color: 'text-purple-600' },
          { label: 'Upcoming Events', value: stats.upcoming_events, icon: <Calendar className="w-5 h-5" />, color: 'text-orange-600' }
        ];

      default:
        return [];
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{getWelcomeMessage()}</h1>
            <p className="text-blue-100">
              Here's what's happening today at your school.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-200">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-sm text-blue-200">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getRoleSpecificStats().map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getQuickActions().map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`${action.color} text-white p-4 rounded-lg hover:scale-105 transition-transform duration-200`}
            >
              <div className="flex items-center space-x-3">
                {action.icon}
                <div className="text-left">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{activity.title}</h4>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Assistant Widget */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
            <button
              onClick={() => setShowAIChat(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Open Chat
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Quick Help</h3>
              <p className="text-sm text-gray-600 mb-3">
                Need help with anything? Ask our AI assistant for instant support.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowAIChat(true)}
                  className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  "How do I check my schedule?"
                </button>
                <button
                  onClick={() => setShowAIChat(true)}
                  className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  "Show me my recent grades"
                </button>
                <button
                  onClick={() => setShowAIChat(true)}
                  className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  "What events are coming up?"
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1">
              <AIChat 
                className="h-full"
                defaultContext={`User role: ${user?.role}, School: ${user?.school?.name}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};