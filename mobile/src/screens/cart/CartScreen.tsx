// @ts-nocheck
import React from 'react';
import { useStore } from '../../context/StoreContext';

export default function CartScreen() {
  const { cart, getCartTotal, getCartCount, removeFromCart, updateCartQuantity } = useStore();

  return (
    <div style={{ padding: '16px' }}>
      <h2>🛒 Cart ({getCartCount()})</h2>
      {cart.length === 0 ? (
        <p style={{ textAlign: 'center', marginTop: '40px', color: '#999' }}>
          Your cart is empty
        </p>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4>{item.name}</h4>
                  <p>₹{item.price} x {item.quantity}</p>
                </div>
                <div>
                  <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</button>
                  <span style={{ margin: '0 10px' }}>{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                  <button onClick={() => removeFromCart(item.id)} style={{ marginLeft: '10px' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: '#667eea',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p>Total: ₹{getCartTotal().toFixed(2)}</p>
            <button style={{ marginTop: '12px', width: '100%', padding: '10px' }}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
