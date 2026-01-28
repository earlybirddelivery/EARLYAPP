import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, CheckCircle, X, Eye, ThumbsUp, Filter, TrendingUp } from 'lucide-react';

/**
 * AdminProductRequestDashboard.jsx - Admin request management interface
 * Displays product requests, handles approvals/rejections, shows statistics
 */
const AdminProductRequestDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'PENDING',
    sortBy: 'votes'
  });
  const [stats, setStats] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null); // 'approve' or 'reject'
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const STATUS_COLORS = {
    PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    APPROVED: 'bg-green-50 border-green-200 text-green-900',
    REJECTED: 'bg-red-50 border-red-200 text-red-900',
    IN_PROGRESS: 'bg-blue-50 border-blue-200 text-blue-900'
  };

  const STATUS_BADGES = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800'
  };

  const REJECTION_REASONS = [
    'Product not available in market',
    'Supplier not found',
    'Price not viable',
    'Low demand',
    'Out of scope',
    'Quality concerns',
    'Other'
  ];

  useEffect(() => {
    fetchRequests();
    fetchStatistics();
  }, [filters]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        status: filters.status,
        sort_by: filters.sortBy,
        limit: 50
      });

      const response = await fetch(`/api/product-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/product-requests/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data.statistics);
    } catch (err) {
      console.error('Statistics fetch error:', err);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/product-requests/${selectedRequest._id}/approve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            admin_notes: actionNotes
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      setActionModal(null);
      setActionNotes('');
      fetchRequests();
      fetchStatistics();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      setError('Please select a rejection reason');
      return;
    }

    setActionLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/product-requests/${selectedRequest._id}/reject`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            rejection_reason: rejectionReason,
            admin_notes: actionNotes
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      setActionModal(null);
      setActionNotes('');
      setRejectionReason('');
      fetchRequests();
      fetchStatistics();
      setShowDetailModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setActionModal(null);
    setActionNotes('');
    setRejectionReason('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Requests</h1>
          <p className="text-gray-600">Manage and approve customer product requests</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <StatCard
              title="Total"
              value={stats.total_requests}
              icon="📋"
              color="bg-gray-50"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              icon="⏳"
              color="bg-yellow-50"
            />
            <StatCard
              title="Approved"
              value={stats.approved}
              icon="✅"
              color="bg-green-50"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon="❌"
              color="bg-red-50"
            />
            <StatCard
              title="Approval Rate"
              value={`${Math.round(stats.approval_rate || 0)}%`}
              icon="📊"
              color="bg-blue-50"
            />
          </div>
        )}

        {/* Top Requested Products */}
        {stats && stats.top_requested && stats.top_requested.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Requested Products
            </h2>
            <div className="space-y-2">
              {stats.top_requested.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-gray-900">{item.product}</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {item.votes}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="votes">Most Voted</option>
              <option value="created_at">Newest</option>
              <option value="urgency">Urgency</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Votes</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Urgency</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(request => (
                    <tr key={request._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{request.product_name}</div>
                        <p className="text-sm text-gray-500">{request.category || 'Uncategorized'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <ThumbsUp className="w-4 h-4" />
                          {request.votes}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          request.urgency === 'high' ? 'bg-red-100 text-red-800' :
                          request.urgency === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1) || 'Normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[request.status]}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedRequest.product_name}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium text-gray-900">{selectedRequest.category || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Price</p>
                    <p className="font-medium text-gray-900">
                      {selectedRequest.estimated_price ? `₹${selectedRequest.estimated_price}` : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Votes</p>
                    <p className="font-medium text-gray-900 flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {selectedRequest.votes}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold inline-block ${STATUS_BADGES[selectedRequest.status]}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900">{selectedRequest.description}</p>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="border-b border-gray-200 pb-4">
                  <p className="text-sm text-gray-600 mb-2">Customer Notes</p>
                  <p className="text-gray-900">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <div className="border-b border-gray-200 pb-4 bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-700 font-semibold">Admin Notes</p>
                  <p className="text-blue-900">{selectedRequest.admin_notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedRequest.rejection_reason && (
                <div className="border-b border-gray-200 pb-4 bg-red-50 p-3 rounded">
                  <p className="text-sm text-red-700 font-semibold">Rejection Reason</p>
                  <p className="text-red-900">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-sm text-gray-600 font-semibold mb-3">Timeline</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">📅 Created: {formatDate(selectedRequest.created_at)}</p>
                  {selectedRequest.approved_at && (
                    <p className="text-green-700">✅ Approved: {formatDate(selectedRequest.approved_at)}</p>
                  )}
                  {selectedRequest.rejected_at && (
                    <p className="text-red-700">❌ Rejected: {formatDate(selectedRequest.rejected_at)}</p>
                  )}
                </div>
              </div>

              {/* Action Modal */}
              {actionModal && (
                <div className="border-t border-gray-200 pt-4 space-y-4 bg-gray-50 -mx-6 -mb-6 px-6 py-4">
                  {actionModal === 'approve' ? (
                    <>
                      <h4 className="font-semibold text-gray-900">Approve Request</h4>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Add approval notes (optional)..."
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleApprove}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                        >
                          {actionLoading ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setActionModal(null)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 disabled:bg-gray-400 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-gray-900">Reject Request</h4>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Rejection Reason *
                        </label>
                        <select
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Select a reason...</option>
                          {REJECTION_REASONS.map(reason => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Add additional notes (optional)..."
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleReject}
                          disabled={actionLoading || !rejectionReason}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                        >
                          {actionLoading ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Reject
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setActionModal(null)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 disabled:bg-gray-400 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!actionModal && selectedRequest.status === 'PENDING' && (
                <div className="border-t border-gray-200 pt-4 flex gap-3">
                  <button
                    onClick={() => setActionModal('approve')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Request
                  </button>
                  <button
                    onClick={() => setActionModal('reject')}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Reject Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-lg border border-gray-200 p-4`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

export default AdminProductRequestDashboard;
