import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, TrendingUp, Wallet, Award, AlertCircle, ChevronRight } from 'lucide-react';

export const StaffEarningsDashboard = () => {
  const [timeRange, setTimeRange] = useState('month'); // day, week, month
  const [earnings, setEarnings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  // Fetch earnings data
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (timeRange === 'day') {
          const today = new Date().toISOString().split('T')[0];
          const res = await fetch(`/api/earnings/my-daily/${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          setEarnings(data.data);
        } else if (timeRange === 'week') {
          // Get Monday of current week
          const today = new Date();
          const monday = new Date(today);
          monday.setDate(today.getDate() - today.getDay() + 1);
          const weekStart = monday.toISOString().split('T')[0];
          
          const res = await fetch(`/api/earnings/my-weekly/${weekStart}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          setEarnings(data.data);
        } else {
          // Month
          const today = new Date();
          const res = await fetch(
            `/api/earnings/my-monthly/${today.getFullYear()}/${today.getMonth() + 1}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const data = await res.json();
          setEarnings(data.data);
        }
      } catch (err) {
        setError('Failed to fetch earnings data');
        console.error(err);
      }
    };

    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/earnings/my-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSummary(data.data);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      }
    };

    fetchEarnings();
    fetchSummary();
    setLoading(false);
  }, [timeRange]);

  const handleRequestPayout = async () => {
    if (!payoutAmount || payoutAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/earnings/payout/request?amount=${payoutAmount}&payment_method=bank_transfer`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await res.json();
      
      if (data.success) {
        setPayoutRequests([...payoutRequests, data.data]);
        setPayoutAmount('');
        setShowPayoutModal(false);
      } else {
        setError(data.detail);
      }
    } catch (err) {
      setError('Failed to request payout');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Earnings Dashboard</h1>
        <p className="text-gray-600">Track your earnings, bonuses, and payouts</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Current Month Earnings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Current Month</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{summary.current_month.total_earnings}</p>
            <p className="text-xs text-gray-500 mt-2">{summary.current_month.total_deliveries} deliveries</p>
          </div>

          {/* Last 30 Days Average */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Last 30 Days Avg</h3>
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{summary.last_30_days.earnings.average_daily}</p>
            <p className="text-xs text-gray-500 mt-2">per day</p>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Your Rating</h3>
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">★ {summary.rating}</p>
            <p className="text-xs text-gray-500 mt-2">from {summary.total_orders} orders</p>
          </div>

          {/* Pending Payout */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Pending</h3>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹{summary.payment_pending || 0}</p>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-2"
            >
              Request Payout →
            </button>
          </div>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        {['day', 'week', 'month'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        {['overview', 'breakdown', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              selectedTab === tab
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Left */}
        <div className="lg:col-span-2">
          {selectedTab === 'overview' && earnings && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Trend</h3>
              
              {timeRange === 'month' && earnings.daily_breakdown && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={earnings.daily_breakdown.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Legend />
                    <Bar dataKey="net_earnings" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {timeRange === 'week' && earnings.daily_breakdown && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earnings.daily_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Legend />
                    <Line type="monotone" dataKey="net_earnings" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {selectedTab === 'breakdown' && earnings && (
            <div className="space-y-4">
              {/* Earnings Components */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-600">Base Earnings</span>
                    <span className="font-semibold text-gray-900">₹{earnings.base_earnings}</span>
                  </div>
                  
                  {earnings.bonuses && Object.entries(earnings.bonuses).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-green-600">+₹{value}</span>
                    </div>
                  ))}
                  
                  {earnings.deductions && Object.entries(earnings.deductions).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between items-center pb-3 border-b">
                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-red-600">-₹{value}</span>
                      </div>
                    )
                  ))}
                  
                  <div className="flex justify-between items-center pt-3 font-bold text-lg">
                    <span className="text-gray-900">Total Earnings</span>
                    <span className="text-green-600">₹{earnings.net_earnings}</span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              {earnings.summary && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">On-Time Rate</p>
                      <p className="text-2xl font-bold text-green-600">{earnings.summary.on_time_rate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Rating</p>
                      <p className="text-2xl font-bold text-yellow-600">★ {earnings.summary.rating}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Complaints</p>
                      <p className="text-2xl font-bold text-orange-600">{earnings.summary.complaints}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Deliveries</p>
                      <p className="text-2xl font-bold text-blue-600">{earnings.deliveries_completed}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Right */}
        <div className="space-y-6">
          {/* Payout Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center mb-3"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Request Payout
            </button>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Statement
            </button>
          </div>

          {/* Recent Payout Requests */}
          {payoutRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
              <div className="space-y-2">
                {payoutRequests.slice(0, 3).map((request) => (
                  <div key={request.reference_id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">₹{request.amount}</p>
                      <p className="text-xs text-gray-500">{request.status}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">How Earnings Work</h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ ₹50 base + ₹0.50/km</li>
              <li>✓ 50% bonus for night shifts</li>
              <li>✓ 5% bonus at 95%+ on-time</li>
              <li>✓ ₹10 bonus for 4.5+ rating</li>
              <li>✗ -₹20 per complaint</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Request Payout</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  min="100"
                />
                {summary && (
                  <p className="text-xs text-gray-500 mt-2">
                    Available: ₹{summary.current_month.total_earnings}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent">
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Wallet</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffEarningsDashboard;
