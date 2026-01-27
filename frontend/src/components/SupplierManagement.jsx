import React, { useState, useEffect } from 'react';
import './SupplierManagement.css';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPayables, setShowPayables] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    status: 'active'
  });

  const [linkData, setLinkData] = useState({
    product_id: '',
    purchase_rate: '',
    agreed_daily_qty: '',
    delivery_cutoff_time: '05:00'
  });

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLinkChange = (e) => {
    const { name, value } = e.target;
    setLinkData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      alert('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : '/api/suppliers';

      const method = editingSupplier ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(editingSupplier ? 'Supplier updated!' : 'Supplier created!');
        resetForm();
        fetchSuppliers();
      } else {
        alert('Error saving supplier');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkProduct = async (e) => {
    e.preventDefault();

    if (!linkData.product_id || !linkData.purchase_rate) {
      alert('Please fill all fields');
      return;
    }

    if (!selectedSupplier) {
      alert('Please select a supplier');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/suppliers/${selectedSupplier.id}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(linkData)
      });

      if (response.ok) {
        alert('Product linked successfully!');
        setLinkData({
          product_id: '',
          purchase_rate: '',
          agreed_daily_qty: '',
          delivery_cutoff_time: '05:00'
        });
        fetchSuppliers();
      } else {
        alert('Error linking product');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error linking product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      status: supplier.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Supplier deleted!');
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      status: 'active'
    });
    setEditingSupplier(null);
    setShowForm(false);
  };

  return (
    <div className="supplier-management">
      <div className="sm-header">
        <h2>Supplier Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {/* Supplier Form */}
      {showForm && (
        <div className="sm-card form-card">
          <h3>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., ABC Dairy Farms"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="Contact person name"
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email address"
                />
              </div>

              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full address"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Saving...' : 'Save Supplier'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suppliers List */}
      <div className="sm-card">
        <h3>Suppliers ({suppliers.length})</h3>

        {loading ? (
          <p className="loading">Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <p className="empty-state">No suppliers yet. Add your first supplier!</p>
        ) : (
          <div className="suppliers-list">
            {suppliers.map(supplier => (
              <div key={supplier.id} className="supplier-item">
                <div className="supplier-info">
                  <div className="supplier-header">
                    <h4>{supplier.name}</h4>
                    <span className={`status-badge ${supplier.status}`}>
                      {supplier.status}
                    </span>
                  </div>
                  <p className="phone">📞 {supplier.phone}</p>
                  {supplier.email && <p className="email">✉️ {supplier.email}</p>}
                  {supplier.address && <p className="address">📍 {supplier.address}</p>}
                  <p className="products">Linked Products: <strong>{supplier.products?.length || 0}</strong></p>
                </div>

                <div className="supplier-actions">
                  <button
                    className="btn btn-small btn-info"
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setShowPayables(true);
                    }}
                  >
                    View Payables
                  </button>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleEdit(supplier)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(supplier.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link Product Form */}
      {selectedSupplier && !showPayables && (
        <div className="sm-card link-card">
          <h3>Link Product to {selectedSupplier.name}</h3>
          <form onSubmit={handleLinkProduct}>
            <div className="form-grid">
              <div className="form-group">
                <label>Product *</label>
                <select
                  name="product_id"
                  value={linkData.product_id}
                  onChange={handleLinkChange}
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Purchase Rate (₹/unit) *</label>
                <input
                  type="number"
                  name="purchase_rate"
                  value={linkData.purchase_rate}
                  onChange={handleLinkChange}
                  placeholder="Cost price"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Agreed Daily Qty</label>
                <input
                  type="number"
                  name="agreed_daily_qty"
                  value={linkData.agreed_daily_qty}
                  onChange={handleLinkChange}
                  placeholder="Quantity per day"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Delivery Cutoff Time</label>
                <input
                  type="time"
                  name="delivery_cutoff_time"
                  value={linkData.delivery_cutoff_time}
                  onChange={handleLinkChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Linking...' : 'Link Product'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedSupplier(null)}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payables View */}
      {selectedSupplier && showPayables && (
        <div className="sm-card payables-card">
          <h3>Payables for {selectedSupplier.name}</h3>
          
          <div className="payables-summary">
            <div className="payable-item">
              <span>Total Supplied Qty (Jan)</span>
              <strong>12,400 units</strong>
            </div>
            <div className="payable-item">
              <span>Gross Amount (₹)</span>
              <strong>₹2,97,600</strong>
            </div>
            <div className="payable-item">
              <span>Deductions (₹)</span>
              <strong>₹3,250</strong>
            </div>
            <div className="payable-item highlight">
              <span>Net Payable (₹)</span>
              <strong>₹2,94,350</strong>
            </div>
          </div>

          <h4>SLA Tracking</h4>
          <table className="sla-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Expected Qty</th>
                <th>Received Qty</th>
                <th>Time</th>
                <th>Delay (min)</th>
                <th>Penalty (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="delayed">
                <td>25-Jan-2026</td>
                <td>Milk 500ml</td>
                <td>500</td>
                <td>480</td>
                <td>05:18</td>
                <td>18</td>
                <td>₹90</td>
                <td><span className="badge danger">Delayed</span></td>
              </tr>
              <tr className="on-time">
                <td>24-Jan-2026</td>
                <td>Milk 500ml</td>
                <td>500</td>
                <td>500</td>
                <td>04:55</td>
                <td>0</td>
                <td>₹0</td>
                <td><span className="badge success">On Time</span></td>
              </tr>
            </tbody>
          </table>

          <div className="payables-actions">
            <button className="btn btn-success">Mark as Paid</button>
            <button className="btn btn-secondary" onClick={() => setShowPayables(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
