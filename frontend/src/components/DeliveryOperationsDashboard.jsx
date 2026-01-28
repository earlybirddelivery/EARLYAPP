import React, { useState, useEffect } from 'react';
import { MapPin, Clock, AlertCircle, Phone, CheckCircle, Loader } from 'lucide-react';

/**
 * DeliveryOperationsDashboard.jsx - Real-time delivery operations dashboard
 * Shows all active deliveries, their status, ETA, and allows operations team to manage tracking
 */

const DeliveryOperationsDashboard = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch active deliveries
  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/gps/deliveries/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          setDeliveries(result.data || []);
        } else {
          setError('Failed to load active deliveries');
        }
      } catch (err) {
        setError('Error fetching deliveries');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter deliveries based on status
  const filteredDeliveries = deliveries.filter(delivery => {
    if (filterStatus !== 'all' && delivery.status !== filterStatus) return false;
    return true;
  });

  // Calculate summary stats
  const stats = {
    total: deliveries.length,
    active: deliveries.filter(d => d.status === 'in_transit').length,
    completed: deliveries.filter(d => d.status === 'completed').length,
    delayed: deliveries.filter(d => d.estimated_arrival_time && new Date(d.estimated_arrival_time) < new Date()).length,
  };

  const handleStartTracking = async (deliveryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/gps/tracking/start/${deliveryId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Refresh deliveries
        const result = await fetch('/api/gps/deliveries/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await result.json();
        setDeliveries(data.data || []);
      }
    } catch (err) {
      console.error('Error starting tracking:', err);
    }
  };

  const handleEndTracking = async (deliveryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/gps/tracking/end/${deliveryId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Refresh deliveries
        const result = await fetch('/api/gps/deliveries/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await result.json();
        setDeliveries(data.data || []);
      }
    } catch (err) {
      console.error('Error ending tracking:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading operations dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Operations</h1>
          <p className="text-gray-600">Real-time delivery tracking and management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Deliveries</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Deliveries</p>
                <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <Loader className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Delayed</p>
                <p className="text-3xl font-bold text-red-600">{stats.delayed}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              Export Report
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Deliveries Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Delivery Boy</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Distance</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ETA</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Speed</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Update</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDeliveries.length > 0 ? (
                  filteredDeliveries.map((delivery) => {
                    const isDelayed = delivery.estimated_arrival_time && 
                      new Date(delivery.estimated_arrival_time) < new Date();
                    
                    return (
                      <tr 
                        key={delivery.delivery_id}
                        className={`hover:bg-gray-50 cursor-pointer ${isDelayed ? 'bg-red-50' : ''}`}
                        onClick={() => setSelectedDelivery(delivery)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {delivery.order_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {delivery.delivery_boy_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                            delivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                            delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {delivery.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {delivery.distance_remaining_km} km
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className={isDelayed ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                            {delivery.estimated_arrival_time ?
                              new Date(delivery.estimated_arrival_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }) : 'N/A'}
                          </div>
                          {isDelayed && (
                            <p className="text-xs text-red-600">Delayed</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {delivery.speed_kmh ? `${delivery.speed_kmh} km/h` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {delivery.last_updated ?
                            new Date(delivery.last_updated).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {delivery.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartTracking(delivery.delivery_id);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                Start
                              </button>
                            )}
                            {delivery.status === 'in_transit' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEndTracking(delivery.delivery_id);
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Complete
                              </button>
                            )}
                            <a
                              href={`/tracking/${delivery.delivery_id}`}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Map
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <p className="text-gray-600">No deliveries found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Delivery Details */}
        {selectedDelivery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Delivery Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-sm">Order ID</p>
                    <p className="text-gray-900 font-semibold">{selectedDelivery.order_id}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 text-sm">Delivery Boy</p>
                    <p className="text-gray-900 font-semibold">{selectedDelivery.delivery_boy_name}</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Current Position</p>
                      <p className="text-gray-900 font-semibold text-sm">
                        {selectedDelivery.current_latitude}, {selectedDelivery.current_longitude}
                      </p>
                    </div>
                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Call
                    </button>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 text-sm">Distance Remaining</p>
                    <p className="text-gray-900 font-semibold">{selectedDelivery.distance_remaining_km} km</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 text-sm">Estimated Arrival</p>
                    <p className="text-gray-900 font-semibold">
                      {selectedDelivery.estimated_arrival_time ?
                        new Date(selectedDelivery.estimated_arrival_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2">
                  <a
                    href={`/tracking/${selectedDelivery.delivery_id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700 font-semibold"
                  >
                    View Map
                  </a>
                  <button
                    onClick={() => setSelectedDelivery(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryOperationsDashboard;
