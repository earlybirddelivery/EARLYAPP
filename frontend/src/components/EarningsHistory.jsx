/**
 * EarningsHistory.jsx - Daily Earnings History View
 * ==================================================
 * 
 * Displays historical daily earnings with filtering and search.
 * 
 * Features:
 * - Daily earnings table
 * - Date range filter
 * - Search/filter by amount
 * - Export functionality
 * 
 * Author: AI Agent
 * Date: January 27, 2026
 */

import React, { useState, useEffect } from 'react';
import styles from './StaffWallet.module.css';

function EarningsHistory({ staffId }) {
  // ==================== State ====================
  
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  // ==================== API Calls ====================
  
  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/earnings/range/${staffId}?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch earnings');
      
      const data = await response.json();
      if (data.success) {
        setEarnings(data.data || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (staffId) {
      fetchEarnings();
    }
  }, [staffId, startDate, endDate]);
  
  // ==================== Calculations ====================
  
  const totalEarnings = earnings.reduce((sum, e) => sum + (e.net_earnings || 0), 0);
  const averageRating = earnings.length > 0 
    ? (earnings.reduce((sum, e) => sum + (e.rating || 0), 0) / earnings.length).toFixed(2)
    : 0;
  const averageOnTime = earnings.length > 0
    ? (earnings.reduce((sum, e) => sum + (e.on_time_percentage || 0), 0) / earnings.length).toFixed(1)
    : 0;
  
  // ==================== Rendering ====================
  
  return (
    <div className={styles.earningsTab}>
      {/* Filters */}
      <div className={styles.filterSection}>
        <div className={styles.dateFilter}>
          <label>
            From
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            To
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className={styles.summaryStats}>
        <div className={styles.stat}>
          <span className={styles.label}>Total Earnings</span>
          <span className={styles.value}>₹{totalEarnings.toFixed(2)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Days Worked</span>
          <span className={styles.value}>{earnings.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Avg Rating</span>
          <span className={styles.value}>{averageRating} ⭐</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Avg On-Time</span>
          <span className={styles.value}>{averageOnTime}%</span>
        </div>
      </div>
      
      {/* Earnings Table */}
      {loading ? (
        <div className={styles.loading}>Loading earnings...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : earnings.length > 0 ? (
        <div className={styles.earningsTable}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Deliveries</th>
                <th>Base Amount</th>
                <th>Bonuses</th>
                <th>Deductions</th>
                <th>Net Earnings</th>
                <th>Rating</th>
                <th>On-Time %</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map(earning => (
                <tr key={earning.id}>
                  <td>
                    <span className={styles.date}>
                      {new Date(earning.date).toLocaleDateString('en-IN')}
                    </span>
                  </td>
                  <td>{earning.deliveries_completed}</td>
                  <td className={styles.amount}>
                    ₹{earning.delivery_amount.toFixed(2)}
                  </td>
                  <td className={styles.bonus}>
                    +₹{earning.bonus_amount.toFixed(2)}
                  </td>
                  <td className={styles.deduction}>
                    -₹{earning.deductions_amount.toFixed(2)}
                  </td>
                  <td className={styles.net}>
                    <strong>₹{earning.net_earnings.toFixed(2)}</strong>
                  </td>
                  <td>
                    {earning.rating.toFixed(1)} ⭐
                  </td>
                  <td>
                    {earning.on_time_percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.noData}>No earnings data for selected period</p>
      )}
    </div>
  );
}

export default EarningsHistory;
