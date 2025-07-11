import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '../types';
import toast from 'react-hot-toast';

// Get the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          this.removeAuthToken();
          if (window.location.pathname !== '/login') {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
          break;
        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          if (data?.detail) {
            toast.error(data.detail);
          } else if (data?.message) {
            toast.error(data.message);
          } else {
            toast.error('An unexpected error occurred.');
          }
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Request setup error
      toast.error('Request failed. Please try again.');
    }
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Generic HTTP methods
  async get<T = any>(url: string, params?: any): Promise<AxiosResponse<T>> {
    return this.client.get(url, { params });
  }

  async post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.client.post(url, data);
  }

  async put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.client.put(url, data);
  }

  async patch<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data);
  }

  async delete<T = any>(url: string): Promise<AxiosResponse<T>> {
    return this.client.delete(url);
  }

  // File upload
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Voice upload
  async uploadVoice(audioBlob: Blob): Promise<AxiosResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.wav');

    return this.client.post('/ai/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }

  // Setup endpoints
  async getSetupStatus() {
    return this.get('/setup/status');
  }

  async initializeSystem(setupData: any) {
    return this.post('/setup/initialize', setupData);
  }

  // Super Admin endpoints
  async getAdminDashboard() {
    return this.get('/admin/dashboard');
  }

  async getAllSchools() {
    return this.get('/admin/schools');
  }

  async createSchool(schoolData: any) {
    return this.post('/admin/schools', schoolData);
  }

  async updateSchool(schoolId: string, schoolData: any) {
    return this.put(`/admin/schools/${schoolId}`, schoolData);
  }

  async deleteSchool(schoolId: string) {
    return this.delete(`/admin/schools/${schoolId}`);
  }

  // School Admin endpoints
  async getSchoolDashboard() {
    return this.get('/school/dashboard');
  }

  async getSchoolInfo() {
    return this.get('/school/info');
  }

  async updateSchoolInfo(schoolData: any) {
    return this.put('/school/info', schoolData);
  }

  async getSchoolUsers() {
    return this.get('/school/users');
  }

  async createSchoolUser(userData: any) {
    return this.post('/school/users', userData);
  }

  async updateSchoolUser(userId: string, userData: any) {
    return this.put(`/school/users/${userId}`, userData);
  }

  async deleteSchoolUser(userId: string) {
    return this.delete(`/school/users/${userId}`);
  }

  // AI endpoints
  async sendAIMessage(message: string, conversationId?: string) {
    return this.post('/ai/chat', {
      message,
      conversation_id: conversationId,
    });
  }

  async sendAIVoiceMessage(audioBlob: Blob, conversationId?: string) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.wav');
    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }

    return this.client.post('/ai/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Document endpoints
  async generateDocument(documentData: any) {
    return this.post('/documents/generate', documentData);
  }

  async getDocuments() {
    return this.get('/documents');
  }

  async getDocument(documentId: string) {
    return this.get(`/documents/${documentId}`);
  }

  async deleteDocument(documentId: string) {
    return this.delete(`/documents/${documentId}`);
  }

  // Notification endpoints
  async createNotification(notificationData: any) {
    return this.post('/notifications', notificationData);
  }

  async getNotifications() {
    return this.get('/notifications');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.patch(`/notifications/${notificationId}/read`);
  }

  async deleteNotification(notificationId: string) {
    return this.delete(`/notifications/${notificationId}`);
  }

  // System endpoints
  async getSystemStats() {
    return this.get('/system/stats');
  }

  async getHealthCheck() {
    return this.get('/health');
  }

  // Utility methods
  getBaseUrl(): string {
    return API_BASE_URL;
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error('Failed to download file');
      throw error;
    }
  }

  // Generate and download PDF
  async downloadPDF(url: string, filename: string): Promise<void> {
    return this.downloadFile(url, filename);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export the class for testing purposes
export { ApiService };