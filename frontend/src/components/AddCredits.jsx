/**
 * Add Credits Component
 * Modal/Form to add credits through various methods
 */

import React, { useState } from 'react';
import WalletService from '../../services/walletService';
import styles from './CustomerWallet.module.css';

const AddCredits = ({ customerId, onSuccess, onCancel }) => {
  const [method, setMethod] = useState('direct');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const predefinedAmounts = [100, 250, 500, 1000, 2500, 5000];

  const handleAmountClick = (amt) => {
    setAmount(amt.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const reasonText = reason || `Credits added via ${method}`;

      // In real scenario, this would process payment first
      // For now, we'll simulate the credit addition
      await WalletService.addCredits(
        customerId,
        parseFloat(amount),
        reasonText,
        method === 'direct' ? 'manual' : method,
        365  // 1 year expiry
      );

      setSuccess(true);
      setAmount('');
      setReason('');

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (err) {
      setError(err.message);
      console.error('Error adding credits:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Add Credits</h2>
          <button className={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {success ? (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <h3>Credits Added Successfully!</h3>
            <p>₹{amount} has been added to your wallet</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Method Selection */}
            <div className={styles.formGroup}>
              <label>Select Payment Method:</label>
              <div className={styles.methodOptions}>
                <label className={styles.methodOption}>
                  <input
                    type="radio"
                    name="method"
                    value="direct"
                    checked={method === 'direct'}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                  <span>Direct Transfer</span>
                </label>
                <label className={styles.methodOption}>
                  <input
                    type="radio"
                    name="method"
                    value="card"
                    checked={method === 'card'}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                  <span>Credit/Debit Card</span>
                </label>
                <label className={styles.methodOption}>
                  <input
                    type="radio"
                    name="method"
                    value="upi"
                    checked={method === 'upi'}
                    onChange={(e) => setMethod(e.target.value)}
                  />
                  <span>UPI</span>
                </label>
              </div>
            </div>

            {/* Amount Input */}
            <div className={styles.formGroup}>
              <label htmlFor="amount">Amount (₹):</label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="10"
                className={styles.inputField}
              />
            </div>

            {/* Quick Amount Selection */}
            <div className={styles.quickAmounts}>
              <p>Quick select:</p>
              <div className={styles.amountButtons}>
                {predefinedAmounts.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className={`${styles.amountBtn} ${amount === amt.toString() ? styles.selected : ''}`}
                    onClick={() => handleAmountClick(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className={styles.formGroup}>
              <label htmlFor="reason">Note (Optional):</label>
              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Birthday bonus, Referral..."
                className={styles.inputField}
              />
            </div>

            {/* Benefits Info */}
            <div className={styles.infoBox}>
              <p>
                <strong>💡 Tip:</strong> Credits added today will expire in 365 days.
                Upgrade your wallet tier to extend credit validity!
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={loading || !amount}
              >
                {loading ? 'Processing...' : 'Add Credits'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddCredits;
