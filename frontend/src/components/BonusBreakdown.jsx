/**
 * BonusBreakdown.jsx - Bonus & Deduction Breakdown Component
 * ===========================================================
 * 
 * Displays bonus calculations and deductions with explanations.
 * 
 * Features:
 * - Bonus types breakdown
 * - Deduction breakdown
 * - Eligibility status
 * - Tips for earning more
 * 
 * Author: AI Agent
 * Date: January 27, 2026
 */

import React, { useState, useEffect } from 'react';
import styles from './StaffWallet.module.css';

function BonusBreakdown({ staffId, currentEarnings }) {
  // ==================== State ====================
  
  const [bonuses, setBonuses] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ==================== API Calls ====================
  
  const fetchBonuses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/bonuses/${staffId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch bonuses');
      
      const data = await response.json();
      if (data.success) {
        setBonuses(data.data || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDeductions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/staff/wallet/deductions/${staffId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch deductions');
      
      const data = await response.json();
      if (data.success) {
        setDeductions(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching deductions:', err);
    }
  };
  
  useEffect(() => {
    if (staffId) {
      fetchBonuses();
      fetchDeductions();
    }
  }, [staffId]);
  
  // ==================== Calculations ====================
  
  const bonusStats = {
    ON_TIME: bonuses.filter(b => b.bonus_type === 'ON_TIME').length,
    RATING: bonuses.filter(b => b.bonus_type === 'RATING').length,
    COMPLETION: bonuses.filter(b => b.bonus_type === 'COMPLETION').length,
    PERFORMANCE: bonuses.filter(b => b.bonus_type === 'PERFORMANCE').length
  };
  
  const bonusTotals = {
    ON_TIME: bonuses
      .filter(b => b.bonus_type === 'ON_TIME')
      .reduce((sum, b) => sum + (b.amount || 0), 0),
    RATING: bonuses
      .filter(b => b.bonus_type === 'RATING')
      .reduce((sum, b) => sum + (b.amount || 0), 0),
    COMPLETION: bonuses
      .filter(b => b.bonus_type === 'COMPLETION')
      .reduce((sum, b) => sum + (b.amount || 0), 0),
    PERFORMANCE: bonuses
      .filter(b => b.bonus_type === 'PERFORMANCE')
      .reduce((sum, b) => sum + (b.amount || 0), 0)
  };
  
  const totalBonuses = Object.values(bonusTotals).reduce((a, b) => a + b, 0);
  
  // ==================== Rendering ====================
  
  return (
    <div className={styles.bonusTab}>
      {loading ? (
        <div className={styles.loading}>Loading bonus data...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          {/* Bonus Overview */}
          <div className={styles.bonusOverview}>
            <h2>Bonus Breakdown</h2>
            <div className={styles.bonusSummary}>
              <div className={styles.bonusCard}>
                <h3>Total Bonuses Earned</h3>
                <div className={styles.bonusAmount}>₹{totalBonuses.toFixed(2)}</div>
                <p>{bonuses.length} bonus entries</p>
              </div>
            </div>
          </div>
          
          {/* Bonus Types */}
          <div className={styles.bonusTypes}>
            {/* On-Time Bonus */}
            <div className={styles.bonusTypeCard}>
              <div className={styles.typeHeader}>
                <h3>⏱️ On-Time Delivery Bonus</h3>
                <span className={styles.amount}>
                  +₹{bonusTotals.ON_TIME.toFixed(2)}
                </span>
              </div>
              <div className={styles.typeDetails}>
                <p className={styles.description}>
                  Earn 5% of daily earnings when you maintain {'>'} 95% on-time delivery rate
                </p>
                <div className={styles.stats}>
                  <span>{bonusStats.ON_TIME} times earned</span>
                </div>
              </div>
              <div className={styles.tipBox}>
                <p>💡 <strong>Tip:</strong> Check delivery schedules early and plan routes efficiently</p>
              </div>
            </div>
            
            {/* Rating Bonus */}
            <div className={styles.bonusTypeCard}>
              <div className={styles.typeHeader}>
                <h3>⭐ Rating Bonus</h3>
                <span className={styles.amount}>
                  +₹{bonusTotals.RATING.toFixed(2)}
                </span>
              </div>
              <div className={styles.typeDetails}>
                <p className={styles.description}>
                  Earn ₹10 for each star above 4.5 rating. Maximum rating-based bonus per delivery
                </p>
                <div className={styles.stats}>
                  <span>{bonusStats.RATING} times earned</span>
                </div>
              </div>
              <div className={styles.tipBox}>
                <p>💡 <strong>Tip:</strong> Be professional, deliver on time, and handle packages carefully</p>
              </div>
            </div>
            
            {/* Completion Bonus */}
            <div className={styles.bonusTypeCard}>
              <div className={styles.typeHeader}>
                <h3>✅ Completion Bonus</h3>
                <span className={styles.amount}>
                  +₹{bonusTotals.COMPLETION.toFixed(2)}
                </span>
              </div>
              <div className={styles.typeDetails}>
                <p className={styles.description}>
                  Earn 10% of daily earnings with zero complaints and {'>'} 10 deliveries
                </p>
                <div className={styles.stats}>
                  <span>{bonusStats.COMPLETION} times earned</span>
                </div>
              </div>
              <div className={styles.tipBox}>
                <p>💡 <strong>Tip:</strong> Maintain high quality standards to avoid complaints</p>
              </div>
            </div>
            
            {/* Performance Bonus */}
            <div className={styles.bonusTypeCard}>
              <div className={styles.typeHeader}>
                <h3>🏆 Performance Bonus</h3>
                <span className={styles.amount}>
                  +₹{bonusTotals.PERFORMANCE.toFixed(2)}
                </span>
              </div>
              <div className={styles.typeDetails}>
                <p className={styles.description}>
                  Bonus for exceptional performance, awarded by management
                </p>
                <div className={styles.stats}>
                  <span>{bonusStats.PERFORMANCE} times earned</span>
                </div>
              </div>
              <div className={styles.tipBox}>
                <p>💡 <strong>Tip:</strong> Excel in your daily tasks and earn recognition from managers</p>
              </div>
            </div>
          </div>
          
          {/* Deductions */}
          {deductions.length > 0 && (
            <div className={styles.deductionsSection}>
              <h2>Deductions</h2>
              
              <div className={styles.deductionsList}>
                {deductions.map(deduction => (
                  <div key={deduction.id} className={styles.deductionItem}>
                    <div className={styles.deductionInfo}>
                      <span className={styles.type}>
                        {deduction.deduction_type.replace(/_/g, ' ')}
                      </span>
                      <span className={styles.reason}>
                        {deduction.reason}
                      </span>
                    </div>
                    <span className={styles.amount}>
                      -₹{deduction.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className={styles.deductionTips}>
                <h3>How to Avoid Deductions</h3>
                <ul>
                  <li><strong>Complaints (-₹50):</strong> Ensure timely, careful delivery of items</li>
                  <li><strong>Damage (-₹200):</strong> Handle packages with care, avoid dropping items</li>
                  <li><strong>Late Returns (-₹100):</strong> Return containers/insulated boxes on time</li>
                  <li><strong>Disciplinary (-₹{'{amount}}'}):</strong> Follow company policies and guidelines</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Current Day Bonus Info */}
          {currentEarnings && (
            <div className={styles.todayBonusInfo}>
              <h2>Today's Bonus Status</h2>
              <div className={styles.currentStatus}>
                {currentEarnings.on_time_percentage >= 95 ? (
                  <div className={styles.statusItem}>
                    <span className={styles.check}>✓</span>
                    <span>On-time bonus eligible</span>
                    <span className={styles.percent}>{currentEarnings.on_time_percentage.toFixed(1)}%</span>
                  </div>
                ) : (
                  <div className={styles.statusItem}>
                    <span className={styles.cross}>✕</span>
                    <span>Need {(95 - currentEarnings.on_time_percentage).toFixed(1)}% more on-time deliveries</span>
                  </div>
                )}
                
                {currentEarnings.rating >= 4.5 ? (
                  <div className={styles.statusItem}>
                    <span className={styles.check}>✓</span>
                    <span>Rating bonus eligible</span>
                    <span className={styles.rating}>{currentEarnings.rating.toFixed(1)}⭐</span>
                  </div>
                ) : (
                  <div className={styles.statusItem}>
                    <span className={styles.cross}>✕</span>
                    <span>Need {(4.5 - currentEarnings.rating).toFixed(1)} more rating</span>
                  </div>
                )}
                
                {currentEarnings.complaints === 0 && currentEarnings.deliveries_completed > 10 ? (
                  <div className={styles.statusItem}>
                    <span className={styles.check}>✓</span>
                    <span>Completion bonus eligible</span>
                    <span className={styles.count}>{currentEarnings.deliveries_completed} deliveries</span>
                  </div>
                ) : (
                  <div className={styles.statusItem}>
                    <span className={styles.cross}>✕</span>
                    <span>
                      {currentEarnings.complaints > 0 
                        ? `${currentEarnings.complaints} complaint(s) - need zero`
                        : `Need ${11 - currentEarnings.deliveries_completed} more deliveries`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BonusBreakdown;
