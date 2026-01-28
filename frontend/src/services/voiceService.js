/**
 * PHASE 4B.7: Voice Integration - API Client Service
 * ==================================================
 * 
 * Singleton service for voice-related API communication.
 * Handles audio upload, transcription, command execution, and settings.
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class VoiceService {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/voice`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add JWT token to all requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Handle response errors
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error.response?.data?.error || error.message);
        throw error;
      }
    );
  }
  
  /**
   * Upload audio file for transcription
   * @param {Blob} audioFile - Audio blob
   * @param {Object} options - Upload options
   * @returns {Promise} Transcription result
   */
  async uploadReceipt(audioFile, options = {}) {
    const formData = new FormData();
    formData.append('file', audioFile, 'recording.wav');
    formData.append('customer_id', options.customer_id || '');
    formData.append('duration_ms', options.duration_ms || 0);
    formData.append('language', options.language || 'en');
    
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options.onProgress,
    };
    
    return this.client.post('/upload', formData, config);
  }
  
  /**
   * Get voice log details
   * @param {string} voiceLogId - Voice log ID
   * @returns {Promise} Voice log details
   */
  async getVoiceLog(voiceLogId) {
    return this.client.get(`/${voiceLogId}`);
  }
  
  /**
   * Parse and execute voice command
   * @param {string} voiceLogId - Voice log ID
   * @param {Object} options - Execution options
   * @returns {Promise} Command execution result
   */
  async parseAndExecuteCommand(voiceLogId, options = {}) {
    const payload = {
      customer_id: options.customer_id || '',
      auto_execute: options.auto_execute !== false,
    };
    
    return this.client.post(`/${voiceLogId}/parse`, payload);
  }
  
  /**
   * Get supported voice commands
   * @returns {Promise} List of commands
   */
  async getCommandsList() {
    return this.client.get('/commands/list');
  }
  
  /**
   * Get user's voice history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise} Voice history
   */
  async getVoiceHistory(userId, options = {}) {
    const params = {
      limit: options.limit || 20,
      skip: options.skip || 0,
    };
    
    return this.client.get(`/history/${userId}`, { params });
  }
  
  /**
   * Get accessibility preferences
   * @param {string} userId - User ID
   * @returns {Promise} Accessibility settings
   */
  async getAccessibilitySettings(userId) {
    return this.client.get(`/accessibility/${userId}`);
  }
  
  /**
   * Update accessibility preferences
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Promise} Update result
   */
  async updateAccessibilitySettings(userId, settings) {
    return this.client.put(`/accessibility/${userId}`, settings);
  }
  
  /**
   * Check voice service health
   * @returns {Promise} Health status
   */
  async healthCheck() {
    return this.client.get('/health');
  }
}

// Export singleton instance
const voiceService = new VoiceService();
export default voiceService;
