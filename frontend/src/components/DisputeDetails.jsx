import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, CheckCircle, RefreshCw } from 'lucide-react';
import MessageThread from './MessageThread';

/**
 * DisputeDetails.jsx - View dispute details and messages
 * Shows full dispute information, status, and message thread
 */
const DisputeDetails = ({ disputeId, isAdmin = false }) => {
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchDisputeDetails();
    const interval = setInterval(fetchDisputeDetails, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [disputeId]);

  const fetchDisputeDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/disputes/${disputeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dispute details');
      }

      const data = await response.json();
      setDispute(data.dispute);
      setMessages(data.messages || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/disputes/${disputeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          admin_notes: `Status changed to ${newStatus}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      fetchDisputeDetails();
    } catch (err) {
      setError('Error updating status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRefund = async (method = 'wallet') => {
    setRefundLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/disputes/${disputeId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          method: method,
          notes: 'Refund processed by admin'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      setShowRefundModal(false);
      fetchDisputeDetails();
    } catch (err) {
      setError('Error processing refund');
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading dispute details...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Dispute Not Found</h3>
        </div>
        <p className="text-red-700">Unable to load dispute details.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': 'bg-blue-100 text-blue-800 border-blue-300',
      'INVESTIGATING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'RESOLVED': 'bg-green-100 text-green-800 border-green-300',
      'REFUNDED': 'bg-purple-100 text-purple-800 border-purple-300',
      'REJECTED': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dispute #{dispute.id}</h1>
            <p className="text-gray-600">Order: {dispute.order_id}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg border-2 font-semibold ${getStatusColor(dispute.status)}`}>
            {dispute.status}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">Amount</p>
            <p className="text-lg font-semibold">₹{dispute.amount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Reason</p>
            <p className="text-lg font-semibold capitalize">{dispute.reason}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="text-lg font-semibold">
              {new Date(dispute.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Customer</p>
            <p className="text-lg font-semibold">{dispute.customer_id}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">Complaint Description</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{dispute.description}</p>

        {dispute.evidence && dispute.evidence.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-3">Evidence (Photos)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dispute.evidence.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-gray-300 overflow-hidden hover:shadow-lg transition"
                >
                  <img
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message Thread */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Messages</h2>
        <MessageThread
          disputeId={disputeId}
          messages={messages}
          onMessageAdded={fetchDisputeDetails}
          isCustomer={!isAdmin}
          disabled={dispute.status === 'REFUNDED' || dispute.status === 'REJECTED'}
        />
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Admin Actions</h2>

          <div className="space-y-4">
            {/* Status Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Status
              </label>
              <div className="flex gap-2 flex-wrap">
                {['INVESTIGATING', 'RESOLVED', 'REFUNDED', 'REJECTED'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusUpdating || dispute.status === status}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {statusUpdating ? (
                      <Loader className="w-4 h-4 animate-spin inline" />
                    ) : (
                      status
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Refund Button */}
            {dispute.status !== 'REFUNDED' && (
              <div>
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Process Refund
                </button>
              </div>
            )}

            {/* Admin Notes */}
            {dispute.admin_notes && (
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Admin Notes:</p>
                <p className="text-gray-900">{dispute.admin_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4">Process Refund</h3>
            <p className="text-gray-600 mb-6">Select refund method for ₹{dispute.amount}</p>

            <div className="space-y-3">
              {[
                { method: 'wallet', label: 'Credit to Wallet (Instant)' },
                { method: 'original_payment', label: 'Refund to Original Payment' },
                { method: 'manual', label: 'Manual Processing' }
              ].map(({ method, label }) => (
                <button
                  key={method}
                  onClick={() => handleRefund(method)}
                  disabled={refundLoading}
                  className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:bg-gray-100"
                >
                  {refundLoading ? (
                    <Loader className="w-4 h-4 animate-spin inline" />
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRefundModal(false)}
              disabled={refundLoading}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeDetails;
