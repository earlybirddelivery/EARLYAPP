import React, { useState } from 'react';
import ProductManagement from './ProductManagement';
import SupplierManagement from './SupplierManagement';
import './AdminInventoryPage.css';

/**
 * Admin Inventory Management Page
 * Combines Products and Suppliers management with tabs
 */
const AdminInventoryPage = () => {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="admin-inventory-page">
      {/* Tab Navigation */}
      <div className="inventory-tabs">
        <button
          className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 Products
        </button>
        <button
          className={`tab-button ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          🏭 Suppliers
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'suppliers' && <SupplierManagement />}
      </div>
    </div>
  );
};

export default AdminInventoryPage;
