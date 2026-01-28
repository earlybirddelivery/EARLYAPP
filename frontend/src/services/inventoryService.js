/**
 * PHASE 4B.4: Inventory Monitoring - Frontend API Client
 * Service for communicating with inventory API endpoints
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/inventory';

/**
 * Inventory API Service
 * Handles all API calls to inventory endpoints
 */
class InventoryService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // =================================================================
  // 1. PRODUCT STOCK MANAGEMENT
  // =================================================================

  /**
   * Get current stock status for a product
   * @param {string} productId - Product ID
   * @returns {Promise} Product stock data
   */
  async getProductStock(productId) {
    try {
      const response = await this.client.get(`/products/${productId}/stock`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get stock: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Update product stock level
   * @param {string} productId - Product ID
   * @param {object} data - Stock update data
   * @returns {Promise} Update result
   */
  async updateProductStock(productId, data) {
    try {
      const response = await this.client.put(`/products/${productId}/stock`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get all products with low stock
   * @param {number} limit - Maximum results (default 100)
   * @returns {Promise} List of low stock products
   */
  async getLowStockProducts(limit = 100) {
    try {
      const response = await this.client.get('/products/low-stock', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get low stock products: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get all out-of-stock products
   * @returns {Promise} List of out of stock products
   */
  async getOutOfStockProducts() {
    try {
      const response = await this.client.get('/products/out-of-stock');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get out of stock products: ${error.response?.data?.error || error.message}`);
    }
  }

  // =================================================================
  // 2. ALERT MANAGEMENT
  // =================================================================

  /**
   * Get all active alerts
   * @returns {Promise} List of active alerts
   */
  async getActiveAlerts() {
    try {
      const response = await this.client.get('/alerts');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get alerts: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} comment - Optional comment
   * @returns {Promise} Acknowledgment result
   */
  async acknowledgeAlert(alertId, comment = null) {
    try {
      const response = await this.client.put(`/alerts/${alertId}/acknowledge`, {
        comment,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to acknowledge alert: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID
   * @param {string} actionTaken - Action taken to resolve
   * @returns {Promise} Resolution result
   */
  async resolveAlert(alertId, actionTaken) {
    try {
      const response = await this.client.put(`/alerts/${alertId}/resolve`, {
        action_taken: actionTaken,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to resolve alert: ${error.response?.data?.error || error.message}`);
    }
  }

  // =================================================================
  // 3. REORDER MANAGEMENT
  // =================================================================

  /**
   * Create a reorder rule for a product
   * @param {string} productId - Product ID
   * @param {object} ruleData - Reorder rule configuration
   * @returns {Promise} Created rule
   */
  async createReorderRule(productId, ruleData) {
    try {
      const response = await this.client.post(
        `/reorder-rules/${productId}`,
        ruleData
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create reorder rule: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Create a reorder request
   * @param {object} reorderData - Reorder request data
   * @returns {Promise} Created reorder request
   */
  async createReorderRequest(reorderData) {
    try {
      const response = await this.client.post('/reorder-requests', reorderData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create reorder: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get all pending reorder requests
   * @returns {Promise} List of pending reorders
   */
  async getPendingReorders() {
    try {
      const response = await this.client.get('/reorder-requests/pending');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get reorders: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Approve a reorder request
   * @param {string} reorderId - Reorder ID
   * @returns {Promise} Approval result
   */
  async approveReorder(reorderId) {
    try {
      const response = await this.client.put(
        `/reorder-requests/${reorderId}/approve`,
        {}
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to approve reorder: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Mark reorder as received
   * @param {string} reorderId - Reorder ID
   * @param {object} receiveData - Receive data (quantity_received, notes)
   * @returns {Promise} Receive result
   */
  async receiveReorder(reorderId, receiveData) {
    try {
      const response = await this.client.put(
        `/reorder-requests/${reorderId}/receive`,
        receiveData
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to receive reorder: ${error.response?.data?.error || error.message}`);
    }
  }

  // =================================================================
  // 4. FORECASTING & ANALYTICS
  // =================================================================

  /**
   * Get demand forecast for a product
   * @param {string} productId - Product ID
   * @returns {Promise} Forecast data
   */
  async getDemandForecast(productId) {
    try {
      const response = await this.client.get(`/forecast/${productId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get forecast: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Calculate demand forecast
   * @param {string} productId - Product ID
   * @param {number} historicalDays - Days of historical data to use
   * @returns {Promise} Calculated forecast
   */
  async calculateForecast(productId, historicalDays = 90) {
    try {
      const response = await this.client.post(
        `/forecast/${productId}/calculate`,
        { historical_days: historicalDays }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to calculate forecast: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get inventory analytics
   * @returns {Promise} Analytics data
   */
  async getAnalytics() {
    try {
      const response = await this.client.get('/analytics');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get stock by category
   * @returns {Promise} Stock breakdown by category
   */
  async getStockByCategory() {
    try {
      const response = await this.client.get('/by-category');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get stock by category: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get dashboard summary
   * @returns {Promise} Dashboard data
   */
  async getDashboardSummary() {
    try {
      const response = await this.client.get('/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get dashboard: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Health check
   * @returns {Promise} Service health status
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'unavailable', error: error.message };
    }
  }
}

// Export singleton instance
export default new InventoryService();
