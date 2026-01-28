import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCustomerDisputes } from '../services/disputeService';
import { getReasonLabel, STATUS_COLORS } from '../constants/disputeConstants';

/**
 * DisputeList.jsx - List of customer's disputes
 */
const DisputeList = ({ customerId }) => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDisputes();
    const interval = setInterval(fetchDisputes, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [customerId]);

  const fetchDisputes = async () => {
    try {
      const data = await getCustomerDisputes(customerId);
      setDisputes(data.disputes || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    return filterStatus === 'all' || dispute.status === filterStatus;
  });

  const getStatusBadgeColor = (status) => {
    const colors = {
      'OPEN': 'bg-blue-100 text-blue-800',
      'INVESTIGATING': 'bg-yellow-100 text-yellow-800',
      'RESOLVED': 'bg-green-100 text-green-800',
      'REFUNDED': 'bg-purple-100 text-purple-800',
      'REJECTED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading disputes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Disputes</h2>
          <p className="text-gray-600 text-sm">Total: {disputes.length}</p>
        </div>
        <button
          onClick={() => navigate('/disputes/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          File Dispute
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {disputes.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No disputes yet</p>
          <button
            onClick={() => navigate('/disputes/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            File Your First Dispute
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REFUNDED">Refunded</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredDisputes.map(dispute => (
              <div
                key={dispute.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{dispute.id}</p>
                    <p className="text-sm text-gray-600">Order: {dispute.order_id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(dispute.status)}`}>
                    {dispute.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-600">Reason</p>
                    <p className="font-medium text-gray-900">{getReasonLabel(dispute.reason)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Amount</p>
                    <p className="font-medium text-gray-900">₹{dispute.amount}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{dispute.description}</p>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => navigate(`/disputes/${dispute.id}`)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-900 font-medium text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DisputeList;
