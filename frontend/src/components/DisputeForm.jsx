import React, { useState, useEffect } from 'react';
import { AlertCircle, Upload, CheckCircle, Loader } from 'lucide-react';

/**
 * DisputeForm.jsx - Create New Dispute Component
 * Allows customers to file disputes for orders
 */
const DisputeForm = ({ onSubmitSuccess, customerId }) => {
  const [formData, setFormData] = useState({
    order_id: '',
    reason: '',
    description: '',
    evidence: []
  });
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const DISPUTE_REASONS = [
    { value: 'damaged', label: 'Item Damaged/Broken' },
    { value: 'not_delivered', label: 'Order Not Delivered' },
    { value: 'wrong_item', label: 'Wrong Item Received' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'missing_items', label: 'Missing Items' },
    { value: 'other', label: 'Other' }
  ];

  // Fetch customer's orders on component load
  useEffect(() => {
    fetchOrders();
  }, [customerId]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/orders/customer/${customerId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingImages(true);

    try {
      const uploadedUrls = await Promise.all(
        files.map(file => uploadImage(file))
      );
      setFormData(prev => ({
        ...prev,
        evidence: [...prev.evidence, ...uploadedUrls]
      }));
    } catch (err) {
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.url;
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.order_id || !formData.reason || !formData.description) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/disputes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: formData.order_id,
          reason: formData.reason,
          description: formData.description,
          evidence: formData.evidence
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create dispute');
      }

      const data = await response.json();
      setSuccess(true);
      setFormData({
        order_id: '',
        reason: '',
        description: '',
        evidence: []
      });

      setTimeout(() => {
        onSubmitSuccess?.(data.dispute_id);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error creating dispute');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Dispute Created Successfully!</h3>
        </div>
        <p className="text-green-700 mb-4">
          Your dispute has been filed. Our support team will review it shortly.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          File Another Dispute
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">File a Dispute</h2>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Order *
          </label>
          <select
            name="order_id"
            value={formData.order_id}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose an order...</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.id} - ₹{order.amount} ({order.status})
              </option>
            ))}
          </select>
        </div>

        {/* Dispute Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Dispute *
          </label>
          <select
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a reason...</option>
            {DISPUTE_REASONS.map(reason => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Please provide details about the issue..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Evidence Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Evidence (Photos)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImages}
              className="hidden"
              id="evidence-upload"
            />
            <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {uploadingImages ? 'Uploading...' : 'Click to upload or drag and drop'}
              </span>
              <span className="text-xs text-gray-500">PNG, JPG up to 10MB each</span>
            </label>
          </div>

          {/* Uploaded Images Preview */}
          {formData.evidence.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {formData.evidence.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-24 object-cover rounded border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {loading ? 'Filing Dispute...' : 'File Dispute'}
          </button>
          <button
            type="button"
            onClick={() => setFormData({ order_id: '', reason: '', description: '', evidence: [] })}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default DisputeForm;
