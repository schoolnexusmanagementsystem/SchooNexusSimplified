import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User,
  Loader2,
  Volume2,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { AIMessage, VoiceRecordingState } from '../types';

interface AIChatProps {
  className?: string;
  defaultContext?: string;
  allowVoice?: boolean;
  showDownload?: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({
  className = '',
  defaultContext = '',
  allowVoice = true,
  showDownload = true
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    transcript: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with context-appropriate welcome message
  useEffect(() => {
    if (user && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage();
      setMessages([{
        id: Date.now().toString(),
        content: welcomeMessage,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      }]);
    }
  }, [user]);

  const getWelcomeMessage = (): string => {
    const role = user?.role || 'user';
    const school = user?.school?.name || 'your school';
    
    const welcomeMessages = {
      super_admin: `Hello! I'm your AI assistant for School Nexus platform management. I can help you with system administration, school onboarding, analytics, and platform-wide tasks. How can I assist you today?`,
      school_admin: `Welcome to ${school}! I'm your AI assistant specialized in school administration. I can help you with student management, staff coordination, academic planning, reports, and daily operations. What would you like to work on?`,
      staff: `Hi there! I'm here to help you with your teaching and administrative tasks at ${school}. I can assist with lesson planning, student assessments, attendance tracking, and communication. How can I support you today?`,
      student: `Hello! I'm your AI study companion at ${school}. I can help you with homework, study schedules, assignment reminders, and learning resources. What subject or topic would you like help with?`,
      parent: `Welcome! I'm here to help you stay connected with your child's education at ${school}. I can provide updates on academic progress, upcoming events, and answer questions about school activities. How can I assist you?`,
      visitor: `Hello! I'm the AI assistant for ${school}. I can provide general information about our programs, facilities, admission process, and upcoming events. What would you like to know about our school?`
    };

    return welcomeMessages[role as keyof typeof welcomeMessages] || welcomeMessages.visitor;
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.post('/ai/chat', {
        message: text,
        context: defaultContext,
        conversation_id: `chat_${user?.id}_${Date.now()}`,
        user_role: user?.role,
        school_id: user?.school?.id
      });

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: response.data.response,
        isUser: false,
        timestamp: new Date(),
        type: 'text',
        suggestions: response.data.suggestions
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.',
        isUser: false,
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVoiceState(prev => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error('Error starting voice recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceState.isRecording) {
      mediaRecorderRef.current.stop();
      setVoiceState(prev => ({ ...prev, isRecording: false, isProcessing: true }));
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('user_role', user?.role || 'student');

      const response = await apiService.post('/ai/voice-to-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const transcript = response.data.transcript;
      setVoiceState(prev => ({ ...prev, transcript, isProcessing: false }));
      
      if (transcript) {
        await handleSendMessage(transcript);
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
      alert('Error processing voice input. Please try again.');
    }
  };

  const handleVoiceClick = () => {
    if (voiceState.isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const clearConversation = () => {
    setMessages([{
      id: Date.now().toString(),
      content: getWelcomeMessage(),
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    }]);
  };

  const downloadConversation = () => {
    const conversation = messages.map(msg => 
      `${msg.isUser ? 'You' : 'AI'} (${msg.timestamp.toLocaleTimeString()}): ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          {showDownload && (
            <button
              onClick={downloadConversation}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download conversation"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={clearConversation}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.isUser ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isUser 
                  ? 'bg-blue-600 text-white' 
                  : message.type === 'error' 
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`rounded-2xl px-4 py-2 ${
                message.isUser
                  ? 'bg-blue-600 text-white'
                  : message.type === 'error'
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
              }`}>
                <div 
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  className="text-sm"
                />
                <div className="text-xs opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
                
                {/* AI Suggestions */}
                {!message.isUser && message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs opacity-75">Suggested actions:</p>
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left text-xs bg-white bg-opacity-50 hover:bg-opacity-75 rounded px-2 py-1 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex items-center space-x-1">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Status */}
      {(voiceState.isRecording || voiceState.isProcessing) && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center space-x-2">
            {voiceState.isRecording ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700">Recording...</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">Processing voice...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || voiceState.isRecording || voiceState.isProcessing}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          {allowVoice && (
            <button
              onClick={handleVoiceClick}
              disabled={isLoading || voiceState.isProcessing}
              className={`p-3 rounded-lg transition-all ${
                voiceState.isRecording
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {voiceState.isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};