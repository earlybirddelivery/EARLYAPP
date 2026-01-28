// @ts-nocheck
import React, { useEffect } from 'react';
import { useStore } from '../../context/StoreContext';

export default function OrdersScreen() {
  const { orders, fetchOrders, isLoading } = useStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <h2>📦 My Orders</h2>
      {isLoading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: '40px', color: '#999' }}>
          No orders yet
        </p>
      ) : (
        <div>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <h4>Order #{order.id}</h4>
              <p>Status: <strong>{order.status}</strong></p>
              <p>Total: ₹{order.total}</p>
              <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
