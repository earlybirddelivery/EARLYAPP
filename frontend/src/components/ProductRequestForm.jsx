import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, CheckCircle, Send, ThumbsUp } from 'lucide-react';

/**
 * ProductRequestForm.jsx - Customer product request submission
 * Allows customers to request new products to be added
 */
const ProductRequestForm = ({ onSubmitSuccess, customerId }) => {
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    category: '',
    estimated_price: '',
    urgency: 'normal',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const CATEGORIES = [
    { value: 'dairy', label: 'Dairy & Milk' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'groceries', label: 'Groceries' },
    { value: 'snacks', label: 'Snacks & Beverages' },
    { value: 'personal_care', label: 'Personal Care' },
    { value: 'household', label: 'Household Items' },
    { value: 'other', label: 'Other' }
  ];

  const URGENCY_LEVELS = [
    { value: 'low', label: 'Low (whenever available)' },
    { value: 'normal', label: 'Normal (soon)' },
    { value: 'high', label: 'High (urgent)' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.product_name.trim()) {
      setError('Product name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (formData.description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/product-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_name: formData.product_name.trim(),
          description: formData.description.trim(),
          category: formData.category || undefined,
          estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : undefined,
          urgency: formData.urgency,
          notes: formData.notes.trim() || undefined
        })
      });

      if (!response.ok) {
        const error_data = await response.json();
        throw new Error(error_data.detail || 'Failed to submit request');
      }

      setSuccess(true);
      setFormData({
        product_name: '',
        description: '',
        category: '',
        estimated_price: '',
        urgency: 'normal',
        notes: ''
      });

      if (onSubmitSuccess) {
        setTimeout(onSubmitSuccess, 2000);
      }
    } catch (err) {
      setError(err.message || 'Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-green-900">Request Submitted!</h2>
        </div>
        <p className="text-green-700 mb-4">
          Thank you for your request! We've added "{formData.product_name}" to our queue and will review it soon.
        </p>
        <p className="text-sm text-green-600">
          Redirecting in 2 seconds...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Product</h1>
        <p className="text-gray-600">Can't find what you're looking for? Tell us what product you'd like us to add!</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            name="product_name"
            value={formData.product_name}
            onChange={handleInputChange}
            placeholder="e.g., Organic Milk (1L)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Be specific with size/variant</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Category (Optional)</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Tell us more about this product..."
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {formData.description.length}/500 characters
          </p>
        </div>

        {/* Estimated Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Estimated Price (₹)
          </label>
          <input
            type="number"
            name="estimated_price"
            value={formData.estimated_price}
            onChange={handleInputChange}
            placeholder="e.g., 120"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">Optional - helps us find suppliers</p>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            How Urgent is This?
          </label>
          <div className="space-y-2">
            {URGENCY_LEVELS.map(level => (
              <label key={level.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value={level.value}
                  checked={formData.urgency === level.value}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">{level.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Additional Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any other details? e.g., 'need it for daily use'"
            rows="2"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Request
              </>
            )}
          </button>
        </div>

        <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
          💡 Pro Tip: Your request will be visible to other customers. They can upvote it to show interest!
        </div>
      </form>
    </div>
  );
};

export default ProductRequestForm;
