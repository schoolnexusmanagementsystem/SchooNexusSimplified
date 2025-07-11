import React from 'react';

// User and Authentication Types
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SCHOOL_ADMIN = 'school_admin',
  STAFF = 'staff',
  STUDENT = 'student',
  PARENT = 'parent',
  VISITOR = 'visitor',
}

export enum SchoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum DocumentType {
  ID_CARD = 'id_card',
  REPORT_CARD = 'report_card',
  EXAM_CARD = 'exam_card',
  ADMISSION_LETTER = 'admission_letter',
  CERTIFICATE = 'certificate',
  TRANSCRIPT = 'transcript',
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

// User Interface
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  school?: School;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  two_factor_enabled?: boolean;
}

// School Interface
export interface School {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  website?: string;
  status: SchoolStatus;
  subscription_plan: SubscriptionPlan;
  subscription_expires_at?: string;
  settings?: Record<string, any>;
  branding?: Record<string, any>;
  academic_year_start?: string;
  academic_year_end?: string;
  current_term?: string;
  telegram_bot_token?: string;
  whatsapp_number?: string;
  ai_enabled: boolean;
  total_users: number;
  storage_used_mb: number;
  api_calls_this_month: number;
  created_at: string;
  updated_at: string;
  admin_user_id?: string;
}

// Statistics Interface
export interface DashboardStats {
  total_schools: number;
  active_schools: number;
  total_users: number;
  total_students: number;
  total_staff?: number;
}

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
  school_code: string;
}

export interface TwoFactorRequest {
  temp_token: string;
  code: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
  requires_2fa?: boolean;
  temp_token?: string;
}

export interface SchoolCreateRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
  subscription_plan?: SubscriptionPlan;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  school_id?: string;
}

export interface UserUpdateRequest {
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  role?: UserRole;
}

// AI Types
export interface AIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type: 'text' | 'error' | 'system';
  suggestions?: string[];
}

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}

export interface AIMessageRequest {
  message: string;
  conversation_id?: string;
  voice_data?: string; // Base64 encoded audio
}

export interface AIMessageResponse {
  response: string;
  conversation_id: string;
  response_type: 'text' | 'table' | 'chart' | 'document';
  metadata?: Record<string, any>;
  suggestions?: string[];
}

// Document Types
export interface Document {
  id: string;
  title: string;
  document_type: DocumentType;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  template_id?: string;
  template_data?: Record<string, any>;
  tags: string[];
  is_public: boolean;
  is_template: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
  school_id: string;
}

export interface DocumentRequest {
  title: string;
  document_type: DocumentType;
  template_data?: Record<string, any>;
  user_id?: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  role_filter: UserRole[];
  class_filter: string[];
  is_read: boolean;
  is_sent: boolean;
  send_email: boolean;
  send_sms: boolean;
  send_push: boolean;
  sent_at?: string;
  read_at?: string;
  created_at: string;
  school_id?: string;
  user_id?: string;
}

export interface NotificationRequest {
  title: string;
  message: string;
  notification_type?: NotificationType;
  role_filter?: UserRole[];
  send_email?: boolean;
  send_sms?: boolean;
}

// Setup Types
export interface SetupData {
  database: {
    type: 'postgresql' | 'mysql' | 'mongodb' | 'supabase';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    url?: string;
  };
  admin: {
    full_name: string;
    email: string;
    password: string;
  };
  platform: {
    name: string;
    logo?: string;
  };
}

export interface DatabaseConfig {
  database_type: 'postgresql' | 'mysql' | 'supabase' | 'mongodb';
  host: string;
  port: number;
  username: string;
  password: string;
  database_name: string;
  supabase_url?: string;
  supabase_key?: string;
}

export interface SuperAdminConfig {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// Class and Subject Types
export interface SchoolClass {
  id: string;
  name: string;
  grade_level: string;
  section: string;
  class_teacher_id?: string;
  academic_year: string;
  max_students: number;
  room_number?: string;
  schedule?: Record<string, any>;
  created_at: string;
  updated_at: string;
  school_id: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  grade_levels: string[];
  is_core: boolean;
  credit_hours: number;
  created_at: string;
  updated_at: string;
  school_id: string;
}

// File Upload Types
export interface FileUpload {
  filename: string;
  original_filename: string;
  size: number;
  content_type: string;
  upload_url: string;
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
}

// Theme and UI Types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
}

// Error Types
export interface AppError {
  message: string;
  code?: string | number;
  details?: Record<string, any>;
  timestamp: string;
}

// Voice Recognition Types
export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// PWA Types
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isSetupRequired: boolean;
  refreshToken: () => Promise<void>;
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
}

// Hook Types
export interface UseApiOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface UseFormOptions<T = any> {
  defaultValues?: Partial<T>;
  validationSchema?: any;
  onSubmit: (data: T) => Promise<void> | void;
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

// Export default type for convenience
export type { User as DefaultUser, School as DefaultSchool };