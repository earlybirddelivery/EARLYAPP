import React, { useState, useEffect, useCallback } from 'react';
import styles from './CheckoutFlow.module.css';

/**
 * Checkout Flow Component
 * Complete payment checkout interface with multiple payment methods
 * Supports: Cards, UPI, Google Pay, Apple Pay, Digital Wallets
 */

// ==================== PAYMENT METHOD COMPONENTS ====================

const CardPaymentForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    card_holder_name: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    saveCard: false
  });

  const [errors, setErrors] = useState({});

  const validateCardNumber = (cardNumber) => {
    // Remove spaces
    const cleaned = cardNumber.replace(/\s/g, '');
    
    // Luhn algorithm
    const digits = cleaned.split('').map(Number);
    let checksum = 0;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if ((digits.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      checksum += digit;
    }
    
    return checksum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.card_holder_name.trim()) {
      newErrors.card_holder_name = 'Cardholder name is required';
    }
    
    if (!validateCardNumber(formData.card_number)) {
      newErrors.card_number = 'Invalid card number';
    }
    
    if (!formData.expiry_month || formData.expiry_month < 1 || formData.expiry_month > 12) {
      newErrors.expiry_month = 'Invalid month';
    }
    
    if (!formData.expiry_year || formData.expiry_year < new Date().getFullYear()) {
      newErrors.expiry_year = 'Invalid year';
    }
    
    if (!formData.cvv || !/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = 'Invalid CVV';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        payment_method: 'card',
        card_details: {
          card_holder_name: formData.card_holder_name,
          card_number: formData.card_number.replace(/\s/g, ''),
          expiry_month: parseInt(formData.expiry_month),
          expiry_year: parseInt(formData.expiry_year),
          cvv: formData.cvv
        },
        save_card: formData.saveCard
      });
    }
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, '');
    
    // Add spaces every 4 digits
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    
    setFormData(prev => ({
      ...prev,
      card_number: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <h3>Credit/Debit Card</h3>
      
      <div className={styles.formGroup}>
        <label htmlFor="card_holder_name">Cardholder Name</label>
        <input
          id="card_holder_name"
          type="text"
          name="card_holder_name"
          value={formData.card_holder_name}
          onChange={handleChange}
          placeholder="John Doe"
          className={errors.card_holder_name ? styles.error : ''}
        />
        {errors.card_holder_name && (
          <span className={styles.errorMessage}>{errors.card_holder_name}</span>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="card_number">Card Number</label>
        <input
          id="card_number"
          type="text"
          name="card_number"
          value={formData.card_number}
          onChange={handleCardNumberChange}
          placeholder="4111 1111 1111 1111"
          maxLength="19"
          className={errors.card_number ? styles.error : ''}
        />
        {errors.card_number && (
          <span className={styles.errorMessage}>{errors.card_number}</span>
        )}
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="expiry_month">Month</label>
          <select
            id="expiry_month"
            name="expiry_month"
            value={formData.expiry_month}
            onChange={handleChange}
            className={errors.expiry_month ? styles.error : ''}
          >
            <option value="">MM</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
            ))}
          </select>
          {errors.expiry_month && (
            <span className={styles.errorMessage}>{errors.expiry_month}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="expiry_year">Year</label>
          <select
            id="expiry_year"
            name="expiry_year"
            value={formData.expiry_year}
            onChange={handleChange}
            className={errors.expiry_year ? styles.error : ''}
          >
            <option value="">YY</option>
            {[...Array(10)].map((_, i) => {
              const year = new Date().getFullYear() + i;
              return (
                <option key={i} value={year}>{year}</option>
              );
            })}
          </select>
          {errors.expiry_year && (
            <span className={styles.errorMessage}>{errors.expiry_year}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cvv">CVV</label>
          <input
            id="cvv"
            type="password"
            name="cvv"
            value={formData.cvv}
            onChange={handleChange}
            placeholder="123"
            maxLength="4"
            className={errors.cvv ? styles.error : ''}
          />
          {errors.cvv && (
            <span className={styles.errorMessage}>{errors.cvv}</span>
          )}
        </div>
      </div>

      <div className={styles.checkbox}>
        <input
          id="saveCard"
          type="checkbox"
          name="saveCard"
          checked={formData.saveCard}
          onChange={handleChange}
        />
        <label htmlFor="saveCard">Save card for future payments</label>
      </div>

      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

const UPIPaymentForm = ({ onSubmit, loading }) => {
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');

  const validateUPI = (id) => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateUPI(upiId)) {
      setError('Invalid UPI ID (format: username@bank)');
      return;
    }
    
    onSubmit({
      payment_method: 'upi',
      upi_id: upiId
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <h3>UPI Payment</h3>
      
      <p className={styles.upiInfo}>Enter your UPI ID or mobile number</p>
      
      <div className={styles.formGroup}>
        <label htmlFor="upi_id">UPI ID</label>
        <input
          id="upi_id"
          type="text"
          value={upiId}
          onChange={(e) => {
            setUpiId(e.target.value);
            setError('');
          }}
          placeholder="username@bankname"
          className={error ? styles.error : ''}
        />
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>

      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? 'Processing...' : 'Continue to UPI'}
      </button>
    </form>
  );
};

const GooglePayForm = ({ amount, onSubmit, loading }) => {
  return (
    <div className={styles.paymentForm}>
      <h3>Google Pay</h3>
      
      <button 
        onClick={() => onSubmit({ payment_method: 'google_pay' })}
        disabled={loading}
        className={styles.googlePayBtn}
      >
        <span className={styles.googlePayIcon}>🔵</span>
        Pay with Google Pay
      </button>
    </div>
  );
};

const ApplePayForm = ({ amount, onSubmit, loading }) => {
  return (
    <div className={styles.paymentForm}>
      <h3>Apple Pay</h3>
      
      <button 
        onClick={() => onSubmit({ payment_method: 'apple_pay' })}
        disabled={loading}
        className={styles.applePayBtn}
      >
        <span className={styles.applePayIcon}>🍎</span>
        Pay with Apple Pay
      </button>
    </div>
  );
};

// ==================== MAIN CHECKOUT COMPONENT ====================

export const CheckoutFlow = ({ 
  orderId, 
  customerId, 
  amount, 
  onSuccess, 
  onError 
}) => {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [step, setStep] = useState('method'); // method, form, processing, success

  // Fetch available payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/payments/methods');
        const data = await response.json();
        setPaymentMethods(data.data.methods);
      } catch (err) {
        console.error('Failed to fetch payment methods:', err);
      }
    };

    fetchPaymentMethods();
  }, []);

  // Fetch saved cards
  useEffect(() => {
    const fetchSavedCards = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/payments/saved-cards', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
          setSavedCards(data.data.cards || []);
        }
      } catch (err) {
        console.error('Failed to fetch saved cards:', err);
      }
    };

    if (selectedMethod === 'card') {
      fetchSavedCards();
    }
  }, [selectedMethod]);

  const initiatePayment = useCallback(async (paymentData) => {
    try {
      setLoading(true);
      setError('');
      setStep('processing');

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          order_id: orderId,
          amount: amount,
          currency: 'INR',
          customer_email: localStorage.getItem('user_email'),
          customer_phone: localStorage.getItem('user_phone'),
          ...paymentData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate payment');
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.message || 'Payment initiation failed');
      }

      const paymentResponse = data.data;

      // Open Razorpay checkout
      const options = {
        key: paymentResponse.razorpay_key_id,
        amount: paymentResponse.amount,
        currency: paymentResponse.currency,
        name: 'EarlyBird',
        description: `Order #${orderId}`,
        order_id: paymentResponse.razorpay_order_id,
        handler: async (razorpayResponse) => {
          await verifyPayment(razorpayResponse, paymentResponse);
        },
        prefill: {
          email: paymentResponse.customer_email,
          contact: paymentResponse.customer_phone
        },
        modal: {
          ondismiss: () => {
            setStep('form');
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      setError(err.message || 'Payment initiation failed');
      setStep('form');
      setLoading(false);
      if (onError) onError(err.message);
    }
  }, [customerId, orderId, amount]);

  const verifyPayment = async (razorpayResponse, paymentResponse) => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_signature: razorpayResponse.razorpay_signature
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setStep('success');
        if (onSuccess) {
          onSuccess({
            payment_id: razorpayResponse.razorpay_payment_id,
            order_id: orderId,
            amount: amount
          });
        }
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (err) {
      setError(err.message || 'Payment verification failed');
      setStep('form');
      setLoading(false);
      if (onError) onError(err.message);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    await initiatePayment(paymentData);
  };

  if (step === 'success') {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>✓</div>
        <h2>Payment Successful!</h2>
        <p>Your payment of ₹{amount.toFixed(2)} has been processed successfully.</p>
        <p className={styles.orderId}>Order ID: {orderId}</p>
      </div>
    );
  }

  return (
    <div className={styles.checkoutContainer}>
      <div className={styles.checkoutHeader}>
        <h2>Checkout</h2>
        <p className={styles.orderAmount}>₹{amount.toFixed(2)}</p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {step === 'method' && (
        <div className={styles.methodSelector}>
          <h3>Select Payment Method</h3>
          <div className={styles.methodGrid}>
            {paymentMethods.map(method => (
              <button
                key={method.id}
                className={`${styles.methodCard} ${selectedMethod === method.id ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedMethod(method.id);
                  setStep('form');
                  setError('');
                }}
              >
                <div className={styles.methodName}>{method.name}</div>
                <div className={styles.methodDescription}>{method.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className={styles.formContainer}>
          <button className={styles.backBtn} onClick={() => setStep('method')}>
            ← Change Payment Method
          </button>

          {selectedMethod === 'card' && (
            <>
              {savedCards.length > 0 && (
                <div className={styles.savedCardsSection}>
                  <h3>Saved Cards</h3>
                  <div className={styles.savedCardsList}>
                    {savedCards.map(card => (
                      <button
                        key={card.card_id}
                        className={`${styles.savedCardItem} ${selectedCard === card.card_id ? styles.selected : ''}`}
                        onClick={() => setSelectedCard(card.card_id)}
                      >
                        <div className={styles.cardBrand}>
                          {card.card_type.toUpperCase()}
                        </div>
                        <div className={styles.cardNumber}>****{card.last_four}</div>
                        <div className={styles.cardExpiry}>{card.expiry_month}/{card.expiry_year}</div>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => handlePaymentSubmit({
                      payment_method: 'card',
                      saved_card_id: selectedCard
                    })}
                    disabled={!selectedCard || loading}
                    className={styles.payBtn}
                  >
                    {loading ? 'Processing...' : `Pay ₹${amount.toFixed(2)}`}
                  </button>
                  <div className={styles.divider}>OR</div>
                </div>
              )}
              <CardPaymentForm onSubmit={handlePaymentSubmit} loading={loading} />
            </>
          )}

          {selectedMethod === 'upi' && (
            <UPIPaymentForm onSubmit={handlePaymentSubmit} loading={loading} />
          )}

          {selectedMethod === 'google_pay' && (
            <GooglePayForm amount={amount} onSubmit={handlePaymentSubmit} loading={loading} />
          )}

          {selectedMethod === 'apple_pay' && (
            <ApplePayForm amount={amount} onSubmit={handlePaymentSubmit} loading={loading} />
          )}
        </div>
      )}

      {step === 'processing' && (
        <div className={styles.processingContainer}>
          <div className={styles.spinner}></div>
          <p>Processing your payment...</p>
        </div>
      )}
    </div>
  );
};

export default CheckoutFlow;
