// Frontend API client for wallet-payment integration
// Handles API communication with backend integration service

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const integrationService = {
  
  // ========== WALLET TOPUP METHODS ==========
  
  /**
   * Initiate wallet top-up payment
   * 
   * @param {string} customerId - Customer ID
   * @param {number} amount - Amount to add in ₹
   * @param {string} paymentMethod - Payment method (razorpay, paypal, google_pay, apple_pay, upi)
   * @returns {Promise} Payment order details with redirect URL
   */
  initiateWalletTopup: async (customerId, amount, paymentMethod = 'razorpay') => {
    try {
      const response = await axios.post(
        `${API_BASE}/integration/wallet/topup/initiate`,
        {
          customer_id: customerId,
          amount: amount,
          payment_method: paymentMethod
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error initiating wallet topup:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Verify wallet top-up payment after redirect
   * 
   * @param {string} paymentId - Payment ID from payment gateway
   * @param {string} orderId - Order ID from payment gateway
   * @param {string} signature - Payment signature
   * @returns {Promise} Verification result
   */
  verifyWalletTopup: async (paymentId, orderId, signature) => {
    try {
      const response = await axios.post(
        `${API_BASE}/integration/wallet/topup/verify`,
        {
          payment_id: paymentId,
          order_id: orderId,
          signature: signature
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error verifying wallet topup:', error);
      throw error.response?.data || error;
    }
  },

  // ========== ORDER PAYMENT WITH WALLET ==========

  /**
   * Pay for order using wallet credits
   * 
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   * @param {number} amount - Amount to pay from wallet
   * @returns {Promise} Payment result
   */
  payOrderWithWallet: async (orderId, customerId, amount) => {
    try {
      const response = await axios.post(
        `${API_BASE}/integration/order/pay-with-wallet`,
        {
          order_id: orderId,
          customer_id: customerId,
          amount: amount
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error paying order with wallet:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Refund order amount back to wallet
   * 
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Reason for refund
   * @returns {Promise} Refund result
   */
  refundOrderToWallet: async (orderId, customerId, amount, reason = 'Order cancelled') => {
    try {
      const response = await axios.post(
        `${API_BASE}/integration/order/refund-to-wallet`,
        {
          order_id: orderId,
          customer_id: customerId,
          amount: amount,
          reason: reason
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error refunding to wallet:', error);
      throw error.response?.data || error;
    }
  },

  // ========== STATUS & INFO ==========

  /**
   * Get integration status for customer
   * 
   * @param {string} customerId - Customer ID
   * @returns {Promise} Integration status with wallet info
   */
  getIntegrationStatus: async (customerId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/integration/status/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting integration status:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Health check for integration service
   * 
   * @returns {Promise} Service health status
   */
  healthCheck: async () => {
    try {
      const response = await axios.get(`${API_BASE}/integration/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking integration health:', error);
      throw error.response?.data || error;
    }
  }
};

export default integrationService;
