/**
 * StaffWallet.jsx - Staff Earnings & Wallet Dashboard
 * =====================================================
 * 
 * Main dashboard for delivery staff to track earnings, bonuses, 
 * deductions, and manage payout requests.
 * 
 * Features:
 * - Daily & monthly earnings view
 * - Bonus breakdown
 * - Payout request management
 * - Wallet summary
 * - Payment history
 * 
 * Author: AI Agent
 * Date: January 27, 2026
 */

import React, { useState, useEffect } from 'react';
import EarningsHistory from './EarningsHistory';
import PayoutRequest from './PayoutRequest';
import BonusBreakdown from './BonusBreakdown';
import styles from './StaffWallet.module.css';

/**
 * StaffWallet Component
 * 
 * Displays comprehensive earnings dashboard with tabs for different views
 */
function StaffWallet({ staffId, currentUser }) {
  // ==================== State ====================
  
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Wallet Summary Data
  const [summary, setSummary] = useState({
    staff_id: '',
    name: '',
    phone: '',
    today_earnings: 0,
    month_earnings: 0,
    pending_payout: 0,
    lifetime_earnings: 0,
    average_rating: 0,
    on_time_percentage: 0,
    total_deliveries: 0,
    pending_requests: 0,
    last_payout_date: null
  });
  
  // Earnings Data
  const [todayEarnings, setTodayEarnings] = useState(null);
  const [monthStatements, setMonthStatements] = useState([]);
  
  // Payout Data
  const [payouts, setPayouts] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  
  // ==================== API Calls ====================
  
  /**
   * Fetch wallet summary
   */
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/summary/${staffId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Fetch today's earnings
   */
  const fetchTodayEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/earnings/today/${staffId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch earnings');
      
      const data = await response.json();
      if (data.success) {
        setTodayEarnings(data.data);
      }
    } catch (err) {
      console.error('Error fetching today earnings:', err);
    }
  };
  
  /**
   * Fetch monthly statements
   */
  const fetchMonthStatements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/statements/${staffId}?limit=12`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch statements');
      
      const data = await response.json();
      if (data.success) {
        setMonthStatements(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching statements:', err);
    }
  };
  
  /**
   * Fetch payout history
   */
  const fetchPayouts = async () => {
    try {
      setPayoutLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/payouts/${staffId}?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch payouts');
      
      const data = await response.json();
      if (data.success) {
        setPayouts(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setPayoutLoading(false);
    }
  };
  
  /**
   * Load initial data
   */
  useEffect(() => {
    if (staffId) {
      fetchSummary();
      fetchTodayEarnings();
      fetchMonthStatements();
      fetchPayouts();
      
      // Refresh every 5 minutes
      const interval = setInterval(() => {
        fetchSummary();
        fetchTodayEarnings();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [staffId]);
  
  // ==================== Rendering ====================
  
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading wallet...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.staffInfo}>
          <h1>{summary.name}</h1>
          <p>{summary.phone}</p>
        </div>
        <div className={styles.lastPayout}>
          <small>Last Payout</small>
          <p>{summary.last_payout_date || 'No payouts yet'}</p>
        </div>
      </div>
      
      {/* Main Stats Cards */}
      <div className={styles.statsGrid}>
        {/* Today Earnings */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <h3>Today's Earnings</h3>
            <span className={styles.icon}>📊</span>
          </div>
          <div className={styles.amount}>
            ₹{summary.today_earnings.toFixed(2)}
          </div>
          <div className={styles.cardFooter}>
            <small>{todayEarnings?.deliveries_completed || 0} deliveries</small>
          </div>
        </div>
        
        {/* Monthly Earnings */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <h3>This Month</h3>
            <span className={styles.icon}>📈</span>
          </div>
          <div className={styles.amount}>
            ₹{summary.month_earnings.toFixed(2)}
          </div>
          <div className={styles.cardFooter}>
            <small>{summary.total_deliveries} total deliveries</small>
          </div>
        </div>
        
        {/* Pending Payout */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <h3>Pending Payout</h3>
            <span className={styles.icon}>⏳</span>
          </div>
          <div className={styles.amount}>
            ₹{summary.pending_payout.toFixed(2)}
          </div>
          <div className={styles.cardFooter}>
            <small>{summary.pending_requests} requests</small>
          </div>
        </div>
        
        {/* Lifetime Earnings */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <h3>Lifetime Earnings</h3>
            <span className={styles.icon}>💰</span>
          </div>
          <div className={styles.amount}>
            ₹{summary.lifetime_earnings.toFixed(2)}
          </div>
          <div className={styles.cardFooter}>
            <small>Total earned</small>
          </div>
        </div>
      </div>
      
      {/* Performance Stats */}
      <div className={styles.performanceGrid}>
        <div className={styles.performanceCard}>
          <div className={styles.stat}>
            <span className={styles.label}>Average Rating</span>
            <span className={styles.value}>
              {summary.average_rating.toFixed(1)} ⭐
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progress}
              style={{width: `${(summary.average_rating / 5) * 100}%`}}
            />
          </div>
        </div>
        
        <div className={styles.performanceCard}>
          <div className={styles.stat}>
            <span className={styles.label}>On-Time Rate</span>
            <span className={styles.value}>
              {summary.on_time_percentage.toFixed(1)}%
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progress}
              style={{width: `${summary.on_time_percentage}%`}}
            />
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'summary' ? styles.active : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'earnings' ? styles.active : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            Earnings
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'bonuses' ? styles.active : ''}`}
            onClick={() => setActiveTab('bonuses')}
          >
            Bonuses
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'payouts' ? styles.active : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            Payouts
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'summary' && (
          <div className={styles.summaryTab}>
            <h2>Monthly Breakdown</h2>
            {monthStatements.length > 0 ? (
              <div className={styles.monthlyTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Deliveries</th>
                      <th>Base Earnings</th>
                      <th>Bonuses</th>
                      <th>Deductions</th>
                      <th>Net Earnings</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthStatements.map(stmt => (
                      <tr key={stmt.id}>
                        <td>{stmt.month}</td>
                        <td>{stmt.total_deliveries}</td>
                        <td>₹{stmt.base_earnings.toFixed(2)}</td>
                        <td className={styles.bonus}>
                          +₹{stmt.total_bonuses.toFixed(2)}
                        </td>
                        <td className={styles.deduction}>
                          -₹{stmt.total_deductions.toFixed(2)}
                        </td>
                        <td className={styles.net}>
                          ₹{stmt.net_earnings.toFixed(2)}
                        </td>
                        <td>{stmt.average_rating.toFixed(1)} ⭐</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.noData}>No earnings data yet</p>
            )}
          </div>
        )}
        
        {activeTab === 'earnings' && (
          <EarningsHistory staffId={staffId} />
        )}
        
        {activeTab === 'bonuses' && (
          <BonusBreakdown staffId={staffId} currentEarnings={todayEarnings} />
        )}
        
        {activeTab === 'payouts' && (
          <div className={styles.payoutsTab}>
            <div className={styles.payoutHeader}>
              <h2>Payout History</h2>
              <PayoutRequest 
                staffId={staffId} 
                availableBalance={summary.month_earnings - summary.pending_payout}
                onPayoutCreated={fetchPayouts}
              />
            </div>
            
            {payoutLoading ? (
              <div className={styles.loading}>Loading payouts...</div>
            ) : payouts.length > 0 ? (
              <div className={styles.payoutsList}>
                {payouts.map(payout => (
                  <div key={payout.id} className={styles.payoutItem}>
                    <div className={styles.payoutInfo}>
                      <div className={styles.amount}>
                        ₹{payout.amount.toFixed(2)}
                      </div>
                      <div className={styles.details}>
                        <span className={styles.method}>
                          {payout.payment_method}
                        </span>
                        <span className={styles.date}>
                          {new Date(payout.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.status}>
                      <span className={`${styles.badge} ${styles[payout.status]}`}>
                        {payout.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noData}>No payout requests yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffWallet;
