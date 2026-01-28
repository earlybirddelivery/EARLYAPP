import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, BarChart3, TrendingUp, Clock, CheckCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * AdminDashboard.jsx - Admin dispute management dashboard
 * Shows overview of all disputes with filtering and quick actions
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const [dashboardRes, statsRes] = await Promise.all([
        fetch('/api/disputes/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/disputes/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!dashboardRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await dashboardRes.json();
      const statsData = await statsRes.json();

      setDashboard(dashboardData.dashboard);
      setStats(statsData.statistics);
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getAllDisputes = () => {
    if (!dashboard) return [];
    const disputes = [
      ...dashboard.open.disputes,
      ...dashboard.investigating.disputes,
      ...dashboard.resolved.disputes,
      ...dashboard.refunded.disputes
    ];
    return disputes.filter(d => {
      const matchStatus = filterStatus === 'all' || d.status === filterStatus;
      const matchSearch = searchTerm === '' || 
        d.id.includes(searchTerm) || 
        d.order_id.includes(searchTerm);
      return matchStatus && matchSearch;
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': 'bg-blue-50 border-blue-200 text-blue-700',
      'INVESTIGATING': 'bg-yellow-50 border-yellow-200 text-yellow-700',
      'RESOLVED': 'bg-green-50 border-green-200 text-green-700',
      'REFUNDED': 'bg-purple-50 border-purple-200 text-purple-700',
      'REJECTED': 'bg-red-50 border-red-200 text-red-700'
    };
    return colors[status] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard || !stats) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Dashboard Error</h3>
        </div>
        <p className="text-red-700">{error || 'Unable to load dashboard data.'}</p>
      </div>
    );
  }

  const disputes = getAllDisputes();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dispute Management Dashboard</h1>
          <p className="text-gray-600">Manage and resolve customer disputes</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Disputes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_disputes}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Open Disputes</p>
                <p className="text-3xl font-bold text-blue-600">{stats.open_disputes}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Resolution Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {(stats.resolution_rate * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Refunds</p>
                <p className="text-3xl font-bold text-purple-600">₹{stats.pending_amount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { key: 'open', label: 'Open', icon: 'circle' },
            { key: 'investigating', label: 'Investigating', icon: 'search' },
            { key: 'resolved', label: 'Resolved', icon: 'check' },
            { key: 'refunded', label: 'Refunded', icon: 'done' }
          ].map(({ key, label }) => {
            const data = dashboard[key];
            return (
              <div key={key} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">{label}</h3>
                <p className="text-4xl font-bold mb-2">{data.count}</p>
                <p className="text-sm text-gray-600">₹{data.amount || 0} disputed</p>
                {data.disputes && data.disputes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {data.disputes.slice(0, 2).map(dispute => (
                      <div key={dispute.id} className="text-sm p-2 bg-gray-50 rounded truncate">
                        {dispute.id}
                      </div>
                    ))}
                    {data.disputes.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{data.disputes.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disputes List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold mb-4">Recent Disputes</h2>

            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by dispute or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              </select>
            </div>
          </div>

          {disputes.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No disputes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Dispute ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map(dispute => (
                    <tr
                      key={dispute.id}
                      className={`border-b hover:bg-gray-50 transition ${getStatusColor(dispute.status)}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium">{dispute.id}</td>
                      <td className="px-6 py-4 text-sm">{dispute.order_id}</td>
                      <td className="px-6 py-4 text-sm capitalize">{dispute.reason}</td>
                      <td className="px-6 py-4 text-sm font-semibold">₹{dispute.amount}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(dispute.status)}`}>
                          {dispute.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/disputes/${dispute.id}`)}
                          className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-2 ml-auto"
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
    </div>
  );
};

export default AdminDashboard;
