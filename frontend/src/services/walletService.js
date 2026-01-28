/**
 * Wallet API Service - PHASE 4B.3
 * Client-side service for wallet operations
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WALLET_API = `${API_BASE_URL}/api/wallet`;

/**
 * Wallet Service for frontend communication with wallet APIs
 */
class WalletService {
  /**
   * Get authorization headers
   */
  static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      'X-User-Role': localStorage.getItem('user_role') || 'customer'
    };
  }

  // ===== WALLET OPERATIONS =====

  /**
   * Create new customer wallet
   * @param {string} customerId - Customer ID
   * @param {number} initialBalance - Initial balance (optional)
   * @returns {Promise<Object>} - Wallet data
   */
  static async createWallet(customerId, initialBalance = 0) {
    try {
      const response = await axios.post(
        `${WALLET_API}/create`,
        {
          customer_id: customerId,
          initial_balance: initialBalance
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get wallet details
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} - Wallet object
   */
  static async getWallet(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get wallet balance only
   * @param {string} customerId - Customer ID
   * @returns {Promise<number>} - Current balance
   */
  static async getBalance(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/balance`,
        { headers: this.getHeaders() }
      );
      return response.data.balance;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== CREDIT OPERATIONS =====

  /**
   * Add credits to wallet
   * @param {string} customerId - Customer ID
   * @param {number} amount - Amount to add (₹)
   * @param {string} reason - Reason for addition
   * @param {string} source - Source type
   * @param {number} expiryDays - Days until expiry (optional)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Transaction data
   */
  static async addCredits(
    customerId,
    amount,
    reason,
    source = 'manual',
    expiryDays = null,
    metadata = {}
  ) {
    try {
      const response = await axios.post(
        `${WALLET_API}/${customerId}/add-credits`,
        {
          amount,
          reason,
          source,
          expiry_days: expiryDays,
          metadata
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Deduct credits from wallet
   * @param {string} customerId - Customer ID
   * @param {number} amount - Amount to deduct (₹)
   * @param {string} reason - Reason for deduction
   * @param {string} orderId - Associated order ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Transaction data
   */
  static async deductCredits(
    customerId,
    amount,
    reason,
    orderId = null,
    metadata = {}
  ) {
    try {
      const response = await axios.post(
        `${WALLET_API}/${customerId}/deduct-credits`,
        {
          amount,
          reason,
          order_id: orderId,
          metadata
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Refund credits for order
   * @param {string} customerId - Customer ID
   * @param {number} amount - Refund amount
   * @param {string} orderId - Order ID
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} - Transaction data
   */
  static async refundCredits(customerId, amount, orderId, reason = 'Order refund') {
    try {
      const response = await axios.post(
        `${WALLET_API}/${customerId}/refund`,
        {
          amount,
          order_id: orderId,
          reason
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== TRANSACTION HISTORY =====

  /**
   * Get transaction history
   * @param {string} customerId - Customer ID
   * @param {number} limit - Records per page
   * @param {number} skip - Records to skip
   * @param {string} type - Filter by CREDIT/DEBIT/REFUND
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Object>} - Transactions with pagination
   */
  static async getTransactions(
    customerId,
    limit = 50,
    skip = 0,
    type = null,
    startDate = null,
    endDate = null
  ) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('skip', skip);
      if (type) params.append('type', type);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await axios.get(
        `${WALLET_API}/${customerId}/transactions?${params.toString()}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get transaction summary
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} - Summary statistics
   */
  static async getTransactionSummary(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/transaction-summary`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== LOYALTY REWARDS =====

  /**
   * Get available rewards
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} - List of available rewards
   */
  static async getAvailableRewards(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/rewards/available`,
        { headers: this.getHeaders() }
      );
      return response.data.rewards;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Apply loyalty reward
   * @param {string} customerId - Customer ID
   * @param {string} rewardId - Reward ID
   * @param {string} orderId - Associated order ID
   * @returns {Promise<Object>} - Transaction data
   */
  static async applyReward(customerId, rewardId, orderId = null) {
    try {
      const response = await axios.post(
        `${WALLET_API}/${customerId}/rewards/apply`,
        {
          reward_id: rewardId,
          order_id: orderId
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== CREDIT EXPIRY =====

  /**
   * Get expiring credits
   * @param {string} customerId - Customer ID
   * @param {number} daysAhead - Days to check ahead (default 30)
   * @returns {Promise<Array>} - List of expiring credits
   */
  static async getExpiringCredits(customerId, daysAhead = 30) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/expiring?days_ahead=${daysAhead}`,
        { headers: this.getHeaders() }
      );
      return response.data.expiring;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get expiry history
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} - List of expired credits
   */
  static async getExpiryHistory(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/expiry-history`,
        { headers: this.getHeaders() }
      );
      return response.data.history;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== REFERRAL SYSTEM =====

  /**
   * Get referral code
   * @param {string} customerId - Customer ID
   * @returns {Promise<string>} - Referral code
   */
  static async getReferralCode(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/referral-code`,
        { headers: this.getHeaders() }
      );
      return response.data.referral_code;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Apply referral bonus
   * @param {string} referrerId - Referrer customer ID
   * @param {string} referredId - Referred customer ID
   * @param {number} bonusAmount - Bonus amount (default 100)
   * @returns {Promise<Object>} - Referral transaction data
   */
  static async applyReferral(referrerId, referredId, bonusAmount = 100) {
    try {
      const response = await axios.post(
        `${WALLET_API}/referral/apply`,
        {
          referrer_id: referrerId,
          referred_id: referredId,
          bonus_amount: bonusAmount
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== TIER & BENEFITS =====

  /**
   * Get tier benefits
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} - Tier and benefits data
   */
  static async getTierBenefits(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/tier-benefits`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== STATISTICS =====

  /**
   * Get wallet statistics
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} - Comprehensive statistics
   */
  static async getStatistics(customerId) {
    try {
      const response = await axios.get(
        `${WALLET_API}/${customerId}/statistics`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Format currency
   * @param {number} amount - Amount in ₹
   * @returns {string} - Formatted currency string
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  /**
   * Calculate remaining days
   * @param {string} expiryDate - Expiry date (ISO format)
   * @returns {number} - Days remaining
   */
  static calculateDaysRemaining(expiryDate) {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if credits are expiring soon
   * @param {string} expiryDate - Expiry date
   * @param {number} daysThreshold - Days threshold (default 30)
   * @returns {boolean} - True if expiring soon
   */
  static isExpiringsoon(expiryDate, daysThreshold = 30) {
    const daysRemaining = this.calculateDaysRemaining(expiryDate);
    return daysRemaining > 0 && daysRemaining <= daysThreshold;
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @returns {Error} - Custom error
   */
  static handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data.error || data.message || 'An error occurred';
      
      const customError = new Error(message);
      customError.status = status;
      customError.data = data;
      return customError;
    } else if (error.request) {
      // Request made but no response
      return new Error('No response from server');
    } else {
      // Error in request setup
      return error;
    }
  }
}

export default WalletService;
