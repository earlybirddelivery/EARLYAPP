import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, RefreshCw, Calendar, TrendingUp, Users, Truck, Package } from 'lucide-react';

/**
 * AnalyticsDashboard.jsx - Comprehensive analytics and reporting
 * Displays revenue, customer, delivery, and inventory metrics
 */
const AnalyticsDashboard = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('revenue');
  const [data, setData] = useState({
    revenue: null,
    customers: null,
    delivery: null,
    inventory: null,
    summary: null
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      // Fetch all analytics data in parallel
      const [dashboardRes, summaryRes] = await Promise.all([
        fetch(`/api/analytics/dashboard?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analytics/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!dashboardRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const dashboardData = await dashboardRes.json();
      const summaryData = await summaryRes.json();

      setData({
        revenue: dashboardData.data?.revenue,
        customers: dashboardData.data?.customers,
        delivery: dashboardData.data?.delivery,
        inventory: dashboardData.data?.inventory,
        summary: summaryData.summary
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (section, format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      const response = await fetch(
        `/api/analytics/export/${section}/${format}?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Export failed');

      const result = await response.json();

      // Handle file download based on format
      if (format === 'json' || format === 'csv' || format === 'html') {
        const element = document.createElement('a');
        element.setAttribute(
          'href',
          `data:text/plain;charset=utf-8,${encodeURIComponent(result.data)}`
        );
        element.setAttribute('download', `${section}_report.${format}`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive business metrics and insights</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Date Range & Controls */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              title="Total Revenue"
              value={`₹${data.summary.total_revenue?.toLocaleString()}`}
              icon={<TrendingUp className="w-6 h-6" />}
              color="bg-blue-50"
            />
            <SummaryCard
              title="Total Customers"
              value={data.summary.total_customers}
              icon={<Users className="w-6 h-6" />}
              color="bg-green-50"
            />
            <SummaryCard
              title="Deliveries (On-Time %)"
              value={`${data.summary.on_time_delivery?.toFixed(1)}%`}
              icon={<Truck className="w-6 h-6" />}
              color="bg-purple-50"
            />
            <SummaryCard
              title="Avg Order Value"
              value={`₹${data.summary.average_order_value?.toFixed(0)}`}
              icon={<Package className="w-6 h-6" />}
              color="bg-orange-50"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="flex border-b border-gray-200">
            {['revenue', 'customers', 'delivery', 'inventory'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 font-semibold transition ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Analytics
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'revenue' && (
              <RevenueAnalytics data={data.revenue} onExport={handleExport} />
            )}
            {activeTab === 'customers' && (
              <CustomerAnalytics data={data.customers} onExport={handleExport} />
            )}
            {activeTab === 'delivery' && (
              <DeliveryAnalytics data={data.delivery} onExport={handleExport} />
            )}
            {activeTab === 'inventory' && (
              <InventoryAnalytics data={data.inventory} onExport={handleExport} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-lg border border-gray-200 p-6`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      </div>
      <div className="text-gray-400">{icon}</div>
    </div>
  </div>
);

// Revenue Analytics Component
const RevenueAnalytics = ({ data, onExport }) => {
  if (!data) return <div>Loading revenue data...</div>;

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex gap-2 flex-wrap">
        {['csv', 'json', 'html'].map(format => (
          <button
            key={format}
            onClick={() => onExport('revenue', format)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export {format.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBox title="Total Revenue" value={`₹${data.total_revenue?.toLocaleString()}`} />
        <MetricBox title="Total Orders" value={data.total_orders} />
        <MetricBox title="Average Order Value" value={`₹${data.average_order_value?.toFixed(0)}`} />
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.daily_revenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `₹${value}`} />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Orders Chart */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Orders</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.daily_orders}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#10b981" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
          <div className="space-y-3">
            {data.top_products?.map((product, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-gray-700">{product.product}</span>
                <span className="font-semibold text-gray-900">₹{product.revenue?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.payment_methods}
                dataKey="revenue"
                nameKey="method"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.payment_methods?.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Customer Analytics Component
const CustomerAnalytics = ({ data, onExport }) => {
  if (!data) return <div>Loading customer data...</div>;

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex gap-2 flex-wrap">
        {['csv', 'json'].map(format => (
          <button
            key={format}
            onClick={() => onExport('customers', format)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export {format.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBox title="Total Customers" value={data.total_customers} />
        <MetricBox title="New Customers" value={data.new_customers} />
        <MetricBox title="Repeat Customers" value={data.repeat_customers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBox title="Retention Rate" value={`${data.customer_retention}%`} />
        <MetricBox title="Avg. Customer LTV" value={`₹${data.average_customer_ltv?.toLocaleString()}`} />
        <MetricBox title="Avg. Order Frequency" value={data.average_order_frequency?.toFixed(2)} />
      </div>

      {/* Customer Segments */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Customer Segments</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.customer_segments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="segment" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Top Customers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Customer ID</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Spending</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.top_customers?.map((customer, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-white">
                  <td className="py-2 px-4 text-gray-700">{customer.customer_id?.substring(0, 12)}...</td>
                  <td className="py-2 px-4 text-gray-900 font-semibold">₹{customer.spending?.toLocaleString()}</td>
                  <td className="py-2 px-4 text-gray-700">{customer.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Delivery Analytics Component
const DeliveryAnalytics = ({ data, onExport }) => {
  if (!data) return <div>Loading delivery data...</div>;

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex gap-2 flex-wrap">
        {['json', 'html'].map(format => (
          <button
            key={format}
            onClick={() => onExport('delivery', format)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export {format.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricBox title="Total Deliveries" value={data.total_deliveries} />
        <MetricBox title="Delivered" value={data.delivered} />
        <MetricBox title="Failed" value={data.failed} />
        <MetricBox title="Pending" value={data.pending} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricBox title="On-Time Rate" value={`${data.on_time_delivery_percentage}%`} />
        <MetricBox title="Avg. Delivery Time" value={`${data.average_delivery_time_hours}h`} />
      </div>

      {/* Status Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Delivery Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.delivery_status_breakdown}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.delivery_status_breakdown?.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Delivery Boy Performance */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Top Delivery Boys</h3>
        <div className="space-y-3">
          {data.delivery_boys_performance?.slice(0, 5).map((boy, idx) => (
            <div key={idx} className="p-3 bg-white rounded border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{boy.name}</p>
                  <p className="text-sm text-gray-600">{boy.deliveries} deliveries</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-yellow-600">★ {boy.rating?.toFixed(1)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Inventory Analytics Component
const InventoryAnalytics = ({ data, onExport }) => {
  if (!data) return <div>Loading inventory data...</div>;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricBox title="Total Products" value={data.total_products} />
        <MetricBox title="Total Stock Value" value={`₹${data.total_stock_value?.toLocaleString()}`} />
      </div>

      {/* Low Stock Items */}
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <h3 className="font-semibold text-red-900 mb-4">⚠️ Low Stock Items ({data.low_stock_items?.length})</h3>
        <div className="space-y-2">
          {data.low_stock_items?.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-red-100">
              <span className="text-gray-700">{item.product_name}</span>
              <span className="font-semibold text-red-600">Stock: {item.stock}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stockout Risk */}
      {data.stockout_risk?.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 className="font-semibold text-orange-900 mb-4">🚨 Stockout Risk ({data.stockout_risk?.length})</h3>
          <div className="space-y-2">
            {data.stockout_risk?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-orange-100">
                <div>
                  <p className="text-gray-700">{item.product}</p>
                  <p className="text-sm text-gray-600">{item.daily_sales} units/day</p>
                </div>
                <span className="font-semibold text-orange-600">{item.days_to_stockout} days</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bestsellers vs Slow Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-4">🏆 Bestsellers</h3>
          <div className="space-y-2">
            {data.bestsellers?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-gray-700">{item.product}</span>
                <span className="font-semibold text-green-600">{item.units_sold} sold</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">🐢 Slow Movers</h3>
          <div className="space-y-2">
            {data.slow_movers?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-gray-700">{item.product}</span>
                <span className="font-semibold text-gray-600">{item.units_sold} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Box Component
const MetricBox = ({ title, value }) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <p className="text-sm font-semibold text-gray-600">{title}</p>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default AnalyticsDashboard;
