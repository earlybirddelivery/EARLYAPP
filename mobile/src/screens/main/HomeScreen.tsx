// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import './HomeScreen.css';

export default function HomeScreen() {
  const { fetchProducts, products, isLoading } = useStore();
  const [categories] = useState(['All', 'Vegetables', 'Fruits', 'Dairy', 'Grains']);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchProducts(1, selectedCategory === 'All' ? undefined : selectedCategory);
  }, [selectedCategory, fetchProducts]);

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>🛍️ Shop Fresh</h1>
        <p>Best prices in your neighborhood</p>
      </div>

      <div className="categories">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="banners">
        <div className="banner banner-1">
          <h3>Free Delivery</h3>
          <p>On orders above ₹200</p>
        </div>
        <div className="banner banner-2">
          <h3>Loyalty Points</h3>
          <p>Earn on every purchase</p>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-info">
                <h4>{product.name}</h4>
                <p className="price">₹{product.price}</p>
                <button className="btn-add">Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
