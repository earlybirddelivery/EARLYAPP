/**
 * analyticsService.js - API wrapper for analytics endpoints
 * Handles all communication with backend analytics routes
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// API Configuration
const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  }
};

/**
 * Fetch revenue analytics data
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Object>} Revenue data with daily breakdown, top products, payment methods
 */
export const getRevenueAnalytics = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/revenue?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch revenue analytics: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Revenue analytics error:', error);
    throw error;
  }
};

/**
 * Fetch customer analytics data
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Object>} Customer metrics with retention, LTV, segments
 */
export const getCustomerAnalytics = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/customers?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch customer analytics: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Customer analytics error:', error);
    throw error;
  }
};

/**
 * Fetch delivery analytics data
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Object>} Delivery metrics with on-time rate, driver performance
 */
export const getDeliveryAnalytics = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/delivery?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery analytics: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Delivery analytics error:', error);
    throw error;
  }
};

/**
 * Fetch inventory analytics data
 * @returns {Promise<Object>} Inventory insights with low stock, bestsellers, stockout risk
 */
export const getInventoryAnalytics = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/inventory`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory analytics: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Inventory analytics error:', error);
    throw error;
  }
};

/**
 * Fetch complete dashboard with all analytics
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Object>} All analytics data combined
 */
export const getDashboard = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/dashboard?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Dashboard error:', error);
    throw error;
  }
};

/**
 * Fetch quick summary with KPIs
 * @returns {Promise<Object>} Summary data with key metrics
 */
export const getSummary = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/summary`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.statusText}`);
    }

    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Summary error:', error);
    throw error;
  }
};

/**
 * Export revenue report in specified format
 * @param {string} format - 'csv', 'json', 'excel', 'pdf', 'html'
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Blob>} File data for download
 */
export const exportRevenueReport = async (format, startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/export/revenue/${format}?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to export revenue report: ${response.statusText}`);
    }

    if (format === 'pdf' || format === 'excel') {
      return await response.blob();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('Revenue export error:', error);
    throw error;
  }
};

/**
 * Export customer report in specified format
 * @param {string} format - 'csv', 'json', 'excel', 'pdf', 'html'
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Blob>} File data for download
 */
export const exportCustomerReport = async (format, startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/export/customers/${format}?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to export customer report: ${response.statusText}`);
    }

    if (format === 'pdf' || format === 'excel') {
      return await response.blob();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('Customer export error:', error);
    throw error;
  }
};

/**
 * Export delivery report in specified format
 * @param {string} format - 'csv', 'json', 'excel', 'pdf', 'html'
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Blob>} File data for download
 */
export const exportDeliveryReport = async (format, startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/export/delivery/${format}?${params}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to export delivery report: ${response.statusText}`);
    }

    if (format === 'pdf' || format === 'excel') {
      return await response.blob();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('Delivery export error:', error);
    throw error;
  }
};

/**
 * Export inventory report in specified format
 * @param {string} format - 'csv', 'json', 'excel', 'pdf', 'html'
 * @returns {Promise<Blob>} File data for download
 */
export const exportInventoryReport = async (format) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/analytics/export/inventory/${format}`,
      { headers: apiConfig.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to export inventory report: ${response.statusText}`);
    }

    if (format === 'pdf' || format === 'excel') {
      return await response.blob();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('Inventory export error:', error);
    throw error;
  }
};

/**
 * Download file from data
 * @param {Blob|string} data - File data
 * @param {string} filename - File name with extension
 * @param {string} type - MIME type
 */
export const downloadFile = (data, filename, type = 'text/plain') => {
  const element = document.createElement('a');
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  element.href = URL.createObjectURL(blob);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
};

export default {
  getRevenueAnalytics,
  getCustomerAnalytics,
  getDeliveryAnalytics,
  getInventoryAnalytics,
  getDashboard,
  getSummary,
  exportRevenueReport,
  exportCustomerReport,
  exportDeliveryReport,
  exportInventoryReport,
  downloadFile
};
