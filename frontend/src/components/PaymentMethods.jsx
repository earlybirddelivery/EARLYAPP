import React, { useState, useEffect } from 'react';
import styles from './PaymentMethods.module.css';

/**
 * Payment Methods Component
 * Manages payment method selection and saved payment options
 * Supports: Cards, UPI, Wallets, Google Pay, Apple Pay, PayPal
 */

const PaymentMethods = ({
  onMethodSelect,
  onSaveCard,
  selectedMethod,
  savedMethods = [],
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('saved');
  const [showNewMethod, setShowNewMethod] = useState(false);
  const [savedPayments, setSavedPayments] = useState(savedMethods);

  // ==================== SAVED PAYMENT METHODS ====================

  const SavedMethodsList = () => {
    if (savedPayments.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No saved payment methods</p>
          <button
            className={styles.addNewBtn}
            onClick={() => setShowNewMethod(true)}
          >
            + Add New Payment Method
          </button>
        </div>
      );
    }

    return (
      <div className={styles.savedMethodsList}>
        {savedPayments.map((method) => (
          <div
            key={method.id}
            className={`${styles.methodCard} ${
              selectedMethod?.id === method.id ? styles.selected : ''
            }`}
            onClick={() => onMethodSelect(method)}
          >
            <div className={styles.methodIcon}>
              {getMethodIcon(method.type)}
            </div>
            <div className={styles.methodDetails}>
              <div className={styles.methodName}>
                {getMethodLabel(method.type)}
              </div>
              <div className={styles.methodLast4}>
                {method.type === 'upi' ? method.upi_id : `****${method.last4}`}
              </div>
            </div>
            {method.is_default && (
              <span className={styles.defaultBadge}>Default</span>
            )}
          </div>
        ))}

        <button
          className={styles.addNewBtn}
          onClick={() => setShowNewMethod(true)}
        >
          + Add New Payment Method
        </button>
      </div>
    );
  };

  // ==================== NEW PAYMENT METHOD ====================

  const NewMethodForm = () => {
    const [methodType, setMethodType] = useState('card');
    const [cardData, setCardData] = useState({
      cardNumber: '',
      cardholderName: '',
      expiry: '',
      cvv: '',
      saveCard: false
    });
    const [upiData, setUpiData] = useState({
      upiId: '',
      saveUpi: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleCardChange = (e) => {
      const { name, value } = e.target;
      let formatted = value;

      if (name === 'cardNumber') {
        formatted = value
          .replace(/\s/g, '')
          .replace(/(\d{4})/g, '$1 ')
          .trim();
      } else if (name === 'expiry') {
        formatted = value
          .replace(/\D/g, '')
          .replace(/(\d{2})/, '$1/')
          .substring(0, 5);
      }

      setCardData({ ...cardData, [name]: formatted });
      setError('');
    };

    const validateCard = () => {
      if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
        setError('Invalid card number');
        return false;
      }
      if (!cardData.cardholderName.trim()) {
        setError('Cardholder name required');
        return false;
      }
      if (!cardData.expiry || cardData.expiry.length < 5) {
        setError('Invalid expiry date');
        return false;
      }
      if (!cardData.cvv || cardData.cvv.length < 3) {
        setError('Invalid CVV');
        return false;
      }
      return true;
    };

    const validateUpi = () => {
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (!upiRegex.test(upiData.upiId)) {
        setError('Invalid UPI ID format');
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      try {
        setSubmitting(true);
        setError('');

        if (methodType === 'card') {
          if (!validateCard()) return;
          
          const [month, year] = cardData.expiry.split('/');
          const payload = {
            type: 'card',
            cardNumber: cardData.cardNumber.replace(/\s/g, ''),
            cardholderName: cardData.cardholderName,
            expiryMonth: month,
            expiryYear: year,
            cvv: cardData.cvv,
            saveCard: cardData.saveCard
          };
          
          await onSaveCard(payload);
        } else if (methodType === 'upi') {
          if (!validateUpi()) return;
          
          const payload = {
            type: 'upi',
            upiId: upiData.upiId,
            saveUpi: upiData.saveUpi
          };
          
          await onSaveCard(payload);
        }

        setShowNewMethod(false);
      } catch (err) {
        setError(err.message || 'Failed to save payment method');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className={styles.formContainer}>
        <h3>Add New Payment Method</h3>

        {/* Method Type Selector */}
        <div className={styles.methodTypeSelector}>
          {['card', 'upi', 'wallet'].map((type) => (
            <button
              key={type}
              className={`${styles.typeBtn} ${
                methodType === type ? styles.active : ''
              }`}
              onClick={() => setMethodType(type)}
            >
              {getMethodLabel(type)}
            </button>
          ))}
        </div>

        {/* Card Form */}
        {methodType === 'card' && (
          <div className={styles.cardForm}>
            <div className={styles.formGroup}>
              <label>Cardholder Name</label>
              <input
                type="text"
                name="cardholderName"
                placeholder="John Doe"
                value={cardData.cardholderName}
                onChange={handleCardChange}
                maxLength="50"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Card Number</label>
              <input
                type="text"
                name="cardNumber"
                placeholder="4532 1234 5678 9010"
                value={cardData.cardNumber}
                onChange={handleCardChange}
                maxLength="19"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Expiry Date</label>
                <input
                  type="text"
                  name="expiry"
                  placeholder="MM/YY"
                  value={cardData.expiry}
                  onChange={handleCardChange}
                  maxLength="5"
                />
              </div>
              <div className={styles.formGroup}>
                <label>CVV</label>
                <input
                  type="password"
                  name="cvv"
                  placeholder="123"
                  value={cardData.cvv}
                  onChange={handleCardChange}
                  maxLength="4"
                />
              </div>
            </div>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={cardData.saveCard}
                onChange={(e) =>
                  setCardData({ ...cardData, saveCard: e.target.checked })
                }
              />
              Save this card for future payments
            </label>
          </div>
        )}

        {/* UPI Form */}
        {methodType === 'upi' && (
          <div className={styles.upiForm}>
            <div className={styles.formGroup}>
              <label>UPI ID</label>
              <input
                type="text"
                placeholder="yourname@bankname"
                value={upiData.upiId}
                onChange={(e) => setUpiData({ ...upiData, upiId: e.target.value })}
              />
            </div>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={upiData.saveUpi}
                onChange={(e) =>
                  setUpiData({ ...upiData, saveUpi: e.target.checked })
                }
              />
              Save this UPI ID for future payments
            </label>
          </div>
        )}

        {/* Wallet Info */}
        {methodType === 'wallet' && (
          <div className={styles.walletInfo}>
            <p>Select from your linked digital wallets:</p>
            <div className={styles.walletOptions}>
              {['Google Pay', 'Apple Pay', 'PhonePe'].map((wallet) => (
                <button
                  key={wallet}
                  className={styles.walletBtn}
                  onClick={() => onMethodSelect({ type: 'wallet', name: wallet })}
                >
                  {wallet}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Action Buttons */}
        <div className={styles.formActions}>
          <button
            className={styles.cancelBtn}
            onClick={() => setShowNewMethod(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || loading}
          >
            {submitting ? 'Saving...' : 'Add Payment Method'}
          </button>
        </div>
      </div>
    );
  };

  // ==================== QUICK PAYMENT OPTIONS ====================

  const QuickPaymentOptions = () => {
    const quickMethods = [
      {
        id: 'googlepay',
        name: 'Google Pay',
        icon: '🔵',
        type: 'wallet',
        available: navigator.userAgent.includes('Android')
      },
      {
        id: 'applepay',
        name: 'Apple Pay',
        icon: '⚫',
        type: 'wallet',
        available: navigator.userAgent.includes('iPhone')
      },
      {
        id: 'netbanking',
        name: 'Net Banking',
        icon: '🏦',
        type: 'netbanking'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        icon: '🔗',
        type: 'paypal'
      }
    ];

    return (
      <div className={styles.quickOptions}>
        <h4>Other Payment Methods</h4>
        <div className={styles.optionsGrid}>
          {quickMethods.map((method) => (
            <button
              key={method.id}
              className={`${styles.quickOption} ${
                !method.available ? styles.unavailable : ''
              }`}
              onClick={() => onMethodSelect(method)}
              disabled={!method.available}
              title={!method.available ? 'Not available on your device' : ''}
            >
              <span className={styles.icon}>{method.icon}</span>
              <span className={styles.name}>{method.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ==================== UTILITY FUNCTIONS ====================

  const getMethodIcon = (type) => {
    const icons = {
      card: '💳',
      upi: '💵',
      wallet: '👛',
      googlepay: '🔵',
      applepay: '⚫',
      netbanking: '🏦',
      paypal: '🔗'
    };
    return icons[type] || '💳';
  };

  const getMethodLabel = (type) => {
    const labels = {
      card: 'Credit/Debit Card',
      upi: 'UPI',
      wallet: 'Digital Wallet',
      googlepay: 'Google Pay',
      applepay: 'Apple Pay',
      netbanking: 'Net Banking',
      paypal: 'PayPal'
    };
    return labels[type] || type;
  };

  // ==================== RENDER ====================

  if (showNewMethod) {
    return <NewMethodForm />;
  }

  return (
    <div className={styles.paymentMethodsContainer}>
      <div className={styles.header}>
        <h3>Select Payment Method</h3>
      </div>

      <div className={styles.content}>
        {savedPayments.length > 0 && (
          <div className={styles.savedSection}>
            <h4>Saved Methods</h4>
            <SavedMethodsList />
          </div>
        )}

        <QuickPaymentOptions />
      </div>

      {/* Security Info */}
      <div className={styles.securityInfo}>
        <span className={styles.lockIcon}>🔒</span>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );
};

export default PaymentMethods;
