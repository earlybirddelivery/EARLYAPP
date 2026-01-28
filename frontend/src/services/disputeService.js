/**
 * disputeService.js - API service for dispute operations
 * Centralized API calls for all dispute-related endpoints
 */

const API_BASE = '/api';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
};

/**
 * Create a new dispute
 */
export const createDispute = async (formData) => {
  const response = await fetch(`${API_BASE}/disputes/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: formData.order_id,
      reason: formData.reason,
      description: formData.description,
      evidence: formData.evidence
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create dispute');
  }

  return response.json();
};

/**
 * Fetch dispute details
 */
export const getDisputeDetails = async (disputeId) => {
  const response = await fetch(`${API_BASE}/disputes/${disputeId}`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dispute details');
  }

  return response.json();
};

/**
 * Fetch customer disputes
 */
export const getCustomerDisputes = async (customerId) => {
  const response = await fetch(`${API_BASE}/disputes/customer/${customerId}`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customer disputes');
  }

  return response.json();
};

/**
 * Add message to dispute
 */
export const addDisputeMessage = async (disputeId, message, attachments = []) => {
  const response = await fetch(`${API_BASE}/disputes/${disputeId}/add-message`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message,
      attachments
    })
  });

  if (!response.ok) {
    throw new Error('Failed to add message');
  }

  return response.json();
};

/**
 * Update dispute status (admin only)
 */
export const updateDisputeStatus = async (disputeId, status, notes = '') => {
  const response = await fetch(`${API_BASE}/disputes/${disputeId}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status,
      admin_notes: notes
    })
  });

  if (!response.ok) {
    throw new Error('Failed to update dispute status');
  }

  return response.json();
};

/**
 * Process refund for dispute (admin only)
 */
export const processRefund = async (disputeId, method = 'wallet', amount = null, notes = '') => {
  const response = await fetch(`${API_BASE}/disputes/${disputeId}/refund`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      refund_method: method,
      amount: amount,
      admin_notes: notes
    })
  });

  if (!response.ok) {
    throw new Error('Failed to process refund');
  }

  return response.json();
};

/**
 * Fetch admin dashboard data
 */
export const getAdminDashboard = async () => {
  const response = await fetch(`${API_BASE}/disputes/admin/dashboard`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin dashboard');
  }

  return response.json();
};

/**
 * Fetch admin statistics
 */
export const getAdminStats = async () => {
  const response = await fetch(`${API_BASE}/disputes/admin/stats`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin statistics');
  }

  return response.json();
};

/**
 * Upload image/file
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  const data = await response.json();
  return data.url;
};

/**
 * Fetch customer orders (for dispute form)
 */
export const getCustomerOrders = async (customerId) => {
  const response = await fetch(`${API_BASE}/orders/customer/${customerId}`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customer orders');
  }

  return response.json();
};

export default {
  createDispute,
  getDisputeDetails,
  getCustomerDisputes,
  addDisputeMessage,
  updateDisputeStatus,
  processRefund,
  getAdminDashboard,
  getAdminStats,
  uploadFile,
  getCustomerOrders
};
