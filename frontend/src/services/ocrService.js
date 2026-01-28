/**
 * OCR Service - Frontend API Client
 * Handles image upload, OCR processing, and product matching
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class OCRService {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/ocr`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add JWT token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Upload receipt image and process OCR
   * @param {File} file - Image file to upload
   * @param {string} scanType - Type of scan ('receipt', 'bill', 'invoice', 'menu')
   * @returns {Promise<Object>} - Extraction results
   */
  async uploadReceipt(file, scanType = 'receipt') {
    try {
      // Compress image before upload
      const compressedFile = await this._compressImage(file);

      // Prepare FormData
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('scan_type', scanType);

      // Upload with progress tracking
      const response = await this.client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // Emit progress event if needed
          document.dispatchEvent(
            new CustomEvent('ocr-upload-progress', { detail: { progress: percentCompleted } })
          );
        }
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: this._getErrorMessage(error)
      };
    }
  }

  /**
   * Get extraction results for a scan
   * @param {string} scanId - ID of the scan
   * @returns {Promise<Object>} - Scan details and extraction
   */
  async getExtraction(scanId) {
    try {
      const response = await this.client.get(`/${scanId}`);
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('Fetch error:', error);
      return {
        success: false,
        error: this._getErrorMessage(error)
      };
    }
  }

  /**
   * Update product matches for a scan
   * @param {string} scanId - ID of the scan
   * @param {Array} matches - Updated product matches
   * @returns {Promise<Object>} - Update confirmation
   */
  async updateProductMatch(scanId, matches) {
    try {
      const response = await this.client.put(`/${scanId}/match`, {
        matches
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('Match update error:', error);
      return {
        success: false,
        error: this._getErrorMessage(error)
      };
    }
  }

  /**
   * Get user's scan history
   * @param {string} userId - User ID
   * @param {number} limit - Max scans to return
   * @param {number} skip - Pagination offset
   * @returns {Promise<Object>} - List of scans
   */
  async getScanHistory(userId, limit = 50, skip = 0) {
    try {
      const response = await this.client.get(`/history/${userId}`, {
        params: { limit, skip }
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('History fetch error:', error);
      return {
        success: false,
        error: this._getErrorMessage(error)
      };
    }
  }

  /**
   * Delete a scan from history
   * @param {string} scanId - ID of the scan to delete
   * @returns {Promise<Object>} - Delete confirmation
   */
  async deleteScan(scanId) {
    try {
      const response = await this.client.delete(`/${scanId}`);

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: this._getErrorMessage(error)
      };
    }
  }

  /**
   * Batch upload multiple receipt images
   * @param {FileList|Array} files - Multiple image files
   * @param {string} scanType - Type of scan
   * @returns {Promise<Object>} - Batch processing results
   */
  async batchUpload(files, scanType = 'receipt') {
    try {
      const formData = new FormData();

      // Add files
      for (let i = 0; i < files.length; i++) {
        const compressedFile = await this._compressImage(files[i]);
        formData.append('files', compressedFile);
      }

      formData.append('scan_type', scanType);

      const response = await this.client.post('/batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('Batch upload error:', error);
      return {
        success: false,
        error: this._getErrorMessage(error)
      };
    }
  }

  /**
   * Check service health
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Service unavailable'
      };
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Compress image before upload
   * @param {File} file - Original image file
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<File>} - Compressed file
   */
  async _compressImage(file, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Resize if too large
          if (width > 2048 || height > 2048) {
            const scale = Math.min(2048 / width, 2048 / height);
            width = width * scale;
            height = height * scale;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File(
                [blob],
                `compressed_${file.name}`,
                { type: 'image/jpeg' }
              );
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
      };
    });
  }

  /**
   * Extract error message from axios error
   * @param {Error} error - Axios error
   * @returns {string} - User-friendly error message
   */
  _getErrorMessage(error) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    if (error.message === 'Network Error') {
      return 'Network error. Please check your connection.';
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }

    return error.message || 'An error occurred';
  }

  /**
   * Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if file is valid image
   * @param {File} file - File to check
   * @returns {Object} - Validation result
   */
  validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed: JPG, PNG, WebP, GIF`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum ${this.formatFileSize(maxSize)} allowed`
      };
    }

    return { valid: true };
  }

  /**
   * Create FormData object with multiple files
   * @param {Array<File>} files - Files to add
   * @param {Object} additionalData - Additional form data
   * @returns {FormData} - Prepared FormData
   */
  createFormData(files, additionalData = {}) {
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return formData;
  }
}

// Export singleton instance
export default new OCRService();
