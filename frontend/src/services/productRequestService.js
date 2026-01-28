/**
 * productRequestService.js - Product request API service
 * Handles all API calls related to product requests
 */

const API_BASE = '/api/product-requests';

export const productRequestService = {
  /**
   * Create a new product request
   */
  async createRequest(requestData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create request');
    }

    return await response.json();
  },

  /**
   * Get customer's own product requests
   */
  async getMyRequests(limit = 20, skip = 0) {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ limit, skip });
    const response = await fetch(`${API_BASE}/my-requests?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch your requests');
    }

    return await response.json();
  },

  /**
   * Get specific request details
   */
  async getRequest(requestId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch request details');
    }

    return await response.json();
  },

  /**
   * Upvote a product request
   */
  async upvoteRequest(requestId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/${requestId}/upvote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upvote request');
    }

    return await response.json();
  },

  /**
   * Get all requests (admin only)
   */
  async getAllRequests(filters = {}) {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      status: filters.status || '',
      sort_by: filters.sortBy || 'votes',
      limit: filters.limit || 50,
      skip: filters.skip || 0
    });

    const response = await fetch(`${API_BASE}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch requests');
    }

    return await response.json();
  },

  /**
   * Approve a product request (admin only)
   */
  async approveRequest(requestId, adminNotes = '') {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/${requestId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        admin_notes: adminNotes
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to approve request');
    }

    return await response.json();
  },

  /**
   * Reject a product request (admin only)
   */
  async rejectRequest(requestId, rejectionReason, adminNotes = '') {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/${requestId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        rejection_reason: rejectionReason,
        admin_notes: adminNotes
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reject request');
    }

    return await response.json();
  },

  /**
   * Get request statistics (admin only)
   */
  async getStatistics() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/admin/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return await response.json();
  }
};

export default productRequestService;
