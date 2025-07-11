import React, { useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  GraduationCap,
  Menu,
  X,
  Bell,
  Settings,
  LogOut,
  Users,
  BookOpen,
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  Shield,
  Building,
  UserCheck,
  ChevronDown,
  Search,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['super_admin', 'school_admin', 'staff', 'student', 'parent', 'visitor']
  },
  {
    name: 'Schools',
    href: '/schools',
    icon: <Building className="w-5 h-5" />,
    roles: ['super_admin']
  },
  {
    name: 'Students',
    href: '/students',
    icon: <Users className="w-5 h-5" />,
    roles: ['school_admin', 'staff', 'parent']
  },
  {
    name: 'Staff',
    href: '/staff',
    icon: <UserCheck className="w-5 h-5" />,
    roles: ['school_admin', 'staff']
  },
  {
    name: 'Classes',
    href: '/classes',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['school_admin', 'staff', 'student']
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['school_admin', 'staff', 'student', 'parent']
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
    roles: ['school_admin', 'staff', 'student', 'parent'],
    badge: '3'
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: <FileText className="w-5 h-5" />,
    roles: ['school_admin', 'staff']
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['super_admin', 'school_admin']
  },
  {
    name: 'System',
    href: '/system',
    icon: <Shield className="w-5 h-5" />,
    roles: ['super_admin']
  }
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || 'visitor')
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const getUserDisplayName = () => {
    if (!user) return 'Guest';
    return `${user.first_name} ${user.last_name}`;
  };

  const getRoleDisplayName = () => {
    const roleNames = {
      super_admin: 'Super Administrator',
      school_admin: 'School Administrator',
      staff: 'Staff Member',
      student: 'Student',
      parent: 'Parent',
      visitor: 'Visitor'
    };
    return roleNames[user?.role as keyof typeof roleNames] || 'User';
  };

  const getSchoolName = () => {
    return user?.school?.name || 'System';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">School Nexus</h1>
              <p className="text-xs text-gray-500">{getSchoolName()}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveRoute(item.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full flex items-center space-x-3 p-3 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 truncate">{getUserDisplayName()}</p>
                <p className="text-gray-500 text-xs">{getRoleDisplayName()}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => navigate('/preferences')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Preferences
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {location.pathname === '/dashboard' ? 'Dashboard' : 
                   location.pathname.split('/')[1]?.charAt(0).toUpperCase() + 
                   location.pathname.split('/')[1]?.slice(1) || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.first_name}!
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Quick Settings */}
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};