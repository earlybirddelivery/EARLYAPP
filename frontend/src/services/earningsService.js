/**
 * earningsService.js - Staff Earnings API Wrapper
 * Handles all earnings-related API calls and data formatting
 */

const API_BASE = '/api/earnings';

class EarningsService {
  /**
   * Get personal daily earnings
   * @param {string} dateStr - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Daily earnings data
   */
  async getDailyEarnings(dateStr) {
    try {
      const response = await fetch(`${API_BASE}/my-daily/${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get daily earnings: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching daily earnings:', error);
      throw error;
    }
  }

  /**
   * Get personal weekly earnings
   * @param {string} weekStartDate - Monday of the week in YYYY-MM-DD format
   * @returns {Promise<Object>} Weekly earnings data
   */
  async getWeeklyEarnings(weekStartDate) {
    try {
      const response = await fetch(`${API_BASE}/my-weekly/${weekStartDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get weekly earnings: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching weekly earnings:', error);
      throw error;
    }
  }

  /**
   * Get personal monthly earnings
   * @param {number} year - Year (e.g., 2024)
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly earnings data
   */
  async getMonthlyEarnings(year, month) {
    try {
      const response = await fetch(`${API_BASE}/my-monthly/${year}/${month}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get monthly earnings: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching monthly earnings:', error);
      throw error;
    }
  }

  /**
   * Get earnings statement for date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Earnings statement
   */
  async getEarningsStatement(startDate, endDate) {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      const response = await fetch(`${API_BASE}/my-statement?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get earnings statement: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching earnings statement:', error);
      throw error;
    }
  }

  /**
   * Get personal earnings summary
   * @returns {Promise<Object>} Summary with current month, last 30 days, and lifetime stats
   */
  async getSummary() {
    try {
      const response = await fetch(`${API_BASE}/my-summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get earnings summary: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching earnings summary:', error);
      throw error;
    }
  }

  /**
   * Request payout
   * @param {number} amount - Amount in ₹
   * @param {string} paymentMethod - bank_transfer, wallet, or upi
   * @returns {Promise<Object>} Payout request details
   */
  async requestPayout(amount, paymentMethod = 'bank_transfer') {
    try {
      const params = new URLSearchParams({
        amount: amount.toString(),
        payment_method: paymentMethod
      });

      const response = await fetch(`${API_BASE}/payout/request?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to request payout: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
  }

  /**
   * Format currency
   * @param {number} amount - Amount in ₹
   * @returns {string} Formatted currency string
   */
  static formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
  }

  /**
   * Format date
   * @param {string} dateStr - Date string
   * @returns {string} Formatted date
   */
  static formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Calculate average
   * @param {number[]} values - Array of values
   * @returns {number} Average value
   */
  static calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get day name from date
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {string} Day name (Mon, Tue, etc.)
   */
  static getDayName(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  }

  /**
   * Get week start date (Monday)
   * @param {Date} date - Date object
   * @returns {string} Monday of the week in YYYY-MM-DD format
   */
  static getWeekStartDate(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  /**
   * Get month name
   * @param {number} month - Month number (1-12)
   * @returns {string} Month name
   */
  static getMonthName(month) {
    return new Date(2024, month - 1).toLocaleDateString('en-IN', { month: 'long' });
  }

  /**
   * Format time duration
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration
   */
  static formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Get performance level
   * @param {number} onTimeRate - On-time delivery percentage (0-100)
   * @returns {string} Performance level (Excellent, Good, Average, Poor)
   */
  static getPerformanceLevel(onTimeRate) {
    if (onTimeRate >= 95) return 'Excellent';
    if (onTimeRate >= 90) return 'Good';
    if (onTimeRate >= 80) return 'Average';
    return 'Poor';
  }

  /**
   * Calculate estimated payout date
   * @param {Date} requestDate - Date when payout was requested
   * @returns {Date} Estimated payout date (typically 2-3 business days)
   */
  static estimatePayoutDate(requestDate = new Date()) {
    const date = new Date(requestDate);
    let businessDays = 0;

    while (businessDays < 3) {
      date.setDate(date.getDate() + 1);
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        businessDays++;
      }
    }

    return date;
  }
}

export default EarningsService;
