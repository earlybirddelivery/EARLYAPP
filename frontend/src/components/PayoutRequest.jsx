/**
 * PayoutRequest.jsx - Payout Request Form Component
 * ==================================================
 * 
 * Modal form for creating payout requests with multiple payment methods.
 * 
 * Features:
 * - Payment method selection (Bank, UPI, Wallet, Cash)
 * - Dynamic form fields based on payment method
 * - Balance validation
 * - Form submission handling
 * 
 * Author: AI Agent
 * Date: January 27, 2026
 */

import React, { useState } from 'react';
import styles from './StaffWallet.module.css';

function PayoutRequest({ staffId, availableBalance, onPayoutCreated }) {
  // ==================== State ====================
  
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    bank_details: {
      account_number: '',
      ifsc_code: '',
      account_holder: ''
    },
    upi_id: '',
    notes: ''
  });
  
  // ==================== Handlers ====================
  
  const handleAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    if (amount <= availableBalance) {
      setFormData({
        ...formData,
        amount: e.target.value
      });
      setError(null);
    } else {
      setError(`Amount exceeds available balance of ₹${availableBalance.toFixed(2)}`);
    }
  };
  
  const handlePaymentMethodChange = (e) => {
    setFormData({
      ...formData,
      payment_method: e.target.value
    });
    setError(null);
  };
  
  const handleBankDetailsChange = (field, value) => {
    setFormData({
      ...formData,
      bank_details: {
        ...formData.bank_details,
        [field]: value
      }
    });
  };
  
  const handleUPIChange = (e) => {
    setFormData({
      ...formData,
      upi_id: e.target.value
    });
  };
  
  const handleNotesChange = (e) => {
    setFormData({
      ...formData,
      notes: e.target.value
    });
  };
  
  const validateForm = () => {
    // Check amount
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (parseFloat(formData.amount) > availableBalance) {
      setError('Amount exceeds available balance');
      return false;
    }
    
    // Check payment method details
    if (formData.payment_method === 'BANK_TRANSFER') {
      if (!formData.bank_details.account_number || 
          !formData.bank_details.ifsc_code || 
          !formData.bank_details.account_holder) {
        setError('Please fill all bank details');
        return false;
      }
      
      // Validate account number (10-18 digits)
      if (!/^\d{9,18}$/.test(formData.bank_details.account_number)) {
        setError('Invalid account number');
        return false;
      }
      
      // Validate IFSC code
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_details.ifsc_code)) {
        setError('Invalid IFSC code format');
        return false;
      }
    }
    
    if (formData.payment_method === 'UPI') {
      if (!formData.upi_id) {
        setError('Please enter UPI ID');
        return false;
      }
      
      if (!/^[a-zA-Z0-9.-]{2,}@[a-zA-Z]{2,}$/.test(formData.upi_id)) {
        setError('Invalid UPI ID format');
        return false;
      }
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const token = localStorage.getItem('token');
      const payload = {
        staff_id: staffId,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        bank_details: formData.payment_method === 'BANK_TRANSFER' ? formData.bank_details : null,
        upi_id: formData.payment_method === 'UPI' ? formData.upi_id : null,
        notes: formData.notes
      };
      
      const response = await fetch(
        '/api/staff/wallet/payout/request',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create payout request');
      }
      
      const data = await response.json();
      
      setSuccess(`Payout request created successfully! ID: ${data.payout_id}`);
      
      // Reset form
      setFormData({
        amount: '',
        payment_method: 'BANK_TRANSFER',
        bank_details: {
          account_number: '',
          ifsc_code: '',
          account_holder: ''
        },
        upi_id: '',
        notes: ''
      });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
        if (onPayoutCreated) {
          onPayoutCreated();
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== Rendering ====================
  
  return (
    <>
      <button 
        className={styles.requestButton}
        onClick={() => setShowModal(true)}
      >
        Request Payout
      </button>
      
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Request Payout</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}
              
              <form onSubmit={handleSubmit}>
                {/* Amount */}
                <div className={styles.formGroup}>
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    step="0.01"
                    min="0"
                  />
                  <small>Available: ₹{availableBalance.toFixed(2)}</small>
                </div>
                
                {/* Payment Method */}
                <div className={styles.formGroup}>
                  <label>Payment Method</label>
                  <select 
                    value={formData.payment_method}
                    onChange={handlePaymentMethodChange}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="WALLET">Wallet</option>
                    <option value="CASH">Cash on Pickup</option>
                  </select>
                </div>
                
                {/* Bank Transfer Details */}
                {formData.payment_method === 'BANK_TRANSFER' && (
                  <>
                    <div className={styles.formGroup}>
                      <label>Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={formData.bank_details.account_holder}
                        onChange={(e) => handleBankDetailsChange('account_holder', e.target.value)}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Account Number</label>
                      <input
                        type="text"
                        placeholder="Account number"
                        value={formData.bank_details.account_number}
                        onChange={(e) => handleBankDetailsChange('account_number', e.target.value)}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g., HDFC0001234"
                        value={formData.bank_details.ifsc_code}
                        onChange={(e) => handleBankDetailsChange('ifsc_code', e.target.value.toUpperCase())}
                      />
                    </div>
                  </>
                )}
                
                {/* UPI Details */}
                {formData.payment_method === 'UPI' && (
                  <div className={styles.formGroup}>
                    <label>UPI ID</label>
                    <input
                      type="text"
                      placeholder="yourname@bank"
                      value={formData.upi_id}
                      onChange={handleUPIChange}
                    />
                  </div>
                )}
                
                {/* Notes */}
                <div className={styles.formGroup}>
                  <label>Notes (Optional)</label>
                  <textarea
                    placeholder="Add any notes about this payout..."
                    value={formData.notes}
                    onChange={handleNotesChange}
                    rows="3"
                  />
                </div>
                
                {/* Submit Button */}
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading || !formData.amount}
                  >
                    {loading ? 'Processing...' : 'Request Payout'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PayoutRequest;
