import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { LoadingScreen } from './LoadingScreen';
import { 
  FileText, 
  Download, 
  Eye, 
  Users, 
  Award, 
  BarChart3,
  Calendar,
  Settings,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DocumentTemplate {
  name: string;
  description: string;
  permissions: string[];
  parameters: string[];
}

interface DocumentTemplates {
  id_cards: Record<string, DocumentTemplate>;
  reports: Record<string, DocumentTemplate>;
  certificates: Record<string, DocumentTemplate>;
}

interface DocumentFormData {
  [key: string]: string | string[];
}

export const DocumentGenerator: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplates | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState<DocumentFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadTemplates();
    loadRecentDocuments();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<{ templates: DocumentTemplates }>('/documents/document-templates');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentDocuments = async () => {
    try {
      // This would load recent documents from the backend
      // For now, using mock data
      setRecentDocuments([
        {
          id: '1',
          name: 'Student ID Card - John Doe',
          type: 'id_card',
          generated_at: new Date().toISOString(),
          status: 'completed'
        },
        {
          id: '2',
          name: 'Academic Report - Term 1',
          type: 'report',
          generated_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed'
        }
      ]);
    } catch (error) {
      console.error('Error loading recent documents:', error);
    }
  };

  const handleTemplateSelect = (category: string, templateKey: string) => {
    setSelectedCategory(category);
    setSelectedTemplate(templateKey);
    setFormData({});
    setPreviewUrl('');
  };

  const handleFormChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const canAccessTemplate = (template: DocumentTemplate) => {
    return template.permissions.includes(user?.role || '');
  };

  const generateDocument = async () => {
    if (!selectedTemplate || !selectedCategory) return;

    try {
      setIsGenerating(true);
      
      let url = '';
      const params = new URLSearchParams();
      
      // Build URL based on template type
      switch (selectedCategory) {
        case 'id_cards':
          if (selectedTemplate === 'student_id') {
            url = `/api/documents/student-id/${formData.student_id}`;
          } else if (selectedTemplate === 'staff_id') {
            url = `/api/documents/staff-id/${formData.staff_id}`;
          }
          break;
          
        case 'reports':
          if (selectedTemplate === 'academic_report') {
            url = `/api/documents/academic-report/${formData.student_id}`;
            params.append('academic_year', formData.academic_year as string);
            params.append('term', formData.term as string);
          } else if (selectedTemplate === 'school_report') {
            url = `/api/documents/school-report/${formData.report_type}`;
            params.append('start_date', formData.start_date as string);
            params.append('end_date', formData.end_date as string);
          } else if (selectedTemplate === 'attendance_report') {
            url = `/api/documents/attendance-report/${formData.class_id}`;
            params.append('report_date', formData.report_date as string);
          }
          break;
          
        case 'certificates':
          url = `/api/documents/certificate/${selectedTemplate}/${formData.recipient_id}`;
          if (selectedTemplate === 'achievement' && formData.achievement) {
            params.append('achievement', formData.achievement as string);
          } else if (selectedTemplate === 'participation' && formData.activity) {
            params.append('activity', formData.activity as string);
          } else if (selectedTemplate === 'completion' && formData.program) {
            params.append('program', formData.program as string);
          }
          break;
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      // Download the document
      const response = await apiService.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `document_${Date.now()}.${selectedCategory === 'id_cards' ? 'png' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // Refresh recent documents
      loadRecentDocuments();
      
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormFields = () => {
    if (!selectedTemplate || !selectedCategory || !templates) return null;

    const template = templates[selectedCategory as keyof DocumentTemplates][selectedTemplate];
    if (!template) return null;

    const renderField = (param: string) => {
      switch (param) {
        case 'student_id':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <input
                type="text"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter student ID"
              />
            </div>
          );

        case 'staff_id':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Staff ID
              </label>
              <input
                type="text"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter staff ID"
              />
            </div>
          );

        case 'academic_year':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Academic Year
              </label>
              <input
                type="text"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2023-2024"
              />
            </div>
          );

        case 'term':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Term
              </label>
              <select
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select term</option>
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          );

        case 'report_type':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Report Type
              </label>
              <select
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select report type</option>
                <option value="academic">Academic Report</option>
                <option value="attendance">Attendance Report</option>
                <option value="financial">Financial Report</option>
                <option value="administrative">Administrative Report</option>
              </select>
            </div>
          );

        case 'start_date':
        case 'end_date':
        case 'report_date':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {param.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              <input
                type="date"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          );

        case 'class_id':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Class ID
              </label>
              <input
                type="text"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter class ID"
              />
            </div>
          );

        case 'recipient_id':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Recipient ID
              </label>
              <input
                type="text"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter recipient ID"
              />
            </div>
          );

        case 'achievement':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Achievement Description
              </label>
              <textarea
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the achievement"
              />
            </div>
          );

        case 'activity':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Activity Description
              </label>
              <textarea
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the activity"
              />
            </div>
          );

        case 'program':
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Program Description
              </label>
              <textarea
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the program"
              />
            </div>
          );

        default:
          return (
            <div key={param} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {param.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              <input
                type="text"
                value={formData[param] || ''}
                onChange={(e) => handleFormChange(param, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${param.replace('_', ' ')}`}
              />
            </div>
          );
      }
    };

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {template.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {template.description}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {template.parameters.map(renderField)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingScreen message="Loading document templates..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Generator</h1>
            <p className="text-gray-600 mt-1">
              Generate professional documents, ID cards, reports, and certificates
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Document Settings</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Document Templates</h2>
            
            {templates && (
              <div className="space-y-4">
                {/* ID Cards */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    ID Cards
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(templates.id_cards).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => handleTemplateSelect('id_cards', key)}
                        disabled={!canAccessTemplate(template)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTemplate === key && selectedCategory === 'id_cards'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!canAccessTemplate(template) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reports */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Reports
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(templates.reports).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => handleTemplateSelect('reports', key)}
                        disabled={!canAccessTemplate(template)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTemplate === key && selectedCategory === 'reports'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!canAccessTemplate(template) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Certificates */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Award className="w-4 h-4 mr-2" />
                    Certificates
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(templates.certificates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => handleTemplateSelect('certificates', key)}
                        disabled={!canAccessTemplate(template)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTemplate === key && selectedCategory === 'certificates'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!canAccessTemplate(template) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {selectedTemplate ? (
              <div>
                {renderFormFields()}
                
                <div className="mt-6 flex items-center space-x-4">
                  <button
                    onClick={generateDocument}
                    disabled={isGenerating}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate Document
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedTemplate('');
                      setSelectedCategory('');
                      setFormData({});
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Document Template
                </h3>
                <p className="text-gray-600">
                  Choose a template from the left panel to start generating documents
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Documents</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Document Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Generated</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentDocuments.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{doc.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {doc.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(doc.generated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};