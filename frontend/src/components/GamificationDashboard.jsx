/**
 * Gamification Dashboard Component
 * File: frontend/src/components/GamificationDashboard.jsx
 * Purpose: Main gamification interface with points, leaderboards, and achievements
 * Lines: 700+
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from 'recharts';
import styles from './GamificationDashboard.module.css';

const GamificationDashboard = ({ customerId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    overview: null,
    leaderboard: null,
    achievements: null,
    history: null
  });
  const [error, setError] = useState(null);

  const COLORS = {
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#E5E4E2',
    DIAMOND: '#B9F2FF'
  };

  const tier_emojis = {
    BRONZE: '🥉',
    SILVER: '🥈',
    GOLD: '🥇',
    PLATINUM: '💍',
    DIAMOND: '👑'
  };

  const achievement_categories = {
    order: '📦',
    points: '💰',
    referral: '👥',
    quality: '⭐',
    speed: '⚡',
    social: '🌐',
    tier: '📈'
  };

  // Fetch data on component mount and tab change
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Customer-Id': customerId
      };

      const [overviewRes, leaderboardRes, achievementsRes, historyRes] = await Promise.all([
        fetch('/api/gamification/dashboard/overview', { headers }),
        fetch('/api/gamification/leaderboard/global?limit=10&offset=0', { headers }),
        fetch('/api/gamification/achievements', { headers }),
        fetch('/api/gamification/points/history?limit=20', { headers })
      ]);

      const [overview, leaderboard, achievements, history] = await Promise.all([
        overviewRes.json(),
        leaderboardRes.json(),
        achievementsRes.json(),
        historyRes.json()
      ]);

      setData({
        overview: overview.data || null,
        leaderboard: leaderboard.data || null,
        achievements: achievements.data || null,
        history: history.data || null
      });
      setError(null);
    } catch (err) {
      setError('Failed to load gamification data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading gamification dashboard...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>🎮 Gamification Hub</h1>
        <p>Earn points, unlock achievements, and climb the leaderboard!</p>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'points' ? styles.active : ''}`}
          onClick={() => setActiveTab('points')}
        >
          💰 Points & Tiers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'leaderboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'achievements' ? styles.active : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏅 Achievements
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && data.overview && (
          <div className={styles.tabPane}>
            <div className={styles.overviewGrid}>
              
              {/* Points Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>💎 Current Points</div>
                <div className={styles.bigNumber}>{data.overview.points?.total_points || 0}</div>
                <div className={styles.cardSubtext}>
                  {data.overview.points?.available_points || 0} available to redeem
                </div>
                <button className={styles.primaryButton}>Redeem Points</button>
              </div>

              {/* Tier Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>🎖️ Current Tier</div>
                <div className={styles.tierDisplay}>
                  <span className={styles.tierEmoji}>{tier_emojis[data.overview.points?.tier]}</span>
                  <span className={styles.tierName}>{data.overview.points?.tier}</span>
                </div>
                <div className={styles.tierProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(data.overview.points?.tier_progress || 0) * 100}%` }}
                    />
                  </div>
                  <div className={styles.progressText}>
                    {data.overview.points?.points_to_next_tier} points to next tier
                  </div>
                </div>
              </div>

              {/* Rank Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>🏅 Your Rank</div>
                <div className={styles.bigNumber}>#{data.overview.rank?.rank || 'N/A'}</div>
                <div className={styles.cardSubtext}>
                  Top {((data.overview.rank?.total_participants - data.overview.rank?.rank + 1) / data.overview.rank?.total_participants * 100).toFixed(1)}%
                  {' '}of {data.overview.rank?.total_participants || 0} customers
                </div>
              </div>

              {/* Achievements Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>🏆 Achievements</div>
                <div className={styles.bigNumber}>{data.overview.achievements?.unlocked_count || 0}/{data.overview.achievements?.total}</div>
                <div className={styles.cardSubtext}>
                  {data.overview.achievements?.badge_points || 0} badge points earned
                </div>
                <div className={styles.achievementPreviews}>
                  {data.overview.achievements?.recently_unlocked?.slice(0, 5).map((ach) => (
                    <span key={ach.achievement_id} className={styles.achievementBadge} title={ach.name}>
                      {ach.icon}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className={styles.section}>
              <h3>📈 Quick Stats</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Lifetime Points</span>
                  <span className={styles.statValue}>{data.overview.points?.lifetime_points || 0}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Tier Multiplier</span>
                  <span className={styles.statValue}>{getTierMultiplier(data.overview.points?.tier)}x</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Member Since</span>
                  <span className={styles.statValue}>Last 30 days</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POINTS & TIERS TAB */}
        {activeTab === 'points' && (
          <div className={styles.tabPane}>
            <div className={styles.section}>
              <h3>💰 Loyalty Point System</h3>
              <p className={styles.description}>
                Earn points on every purchase and redeem them for discounts!
              </p>
              
              <div className={styles.pointsGrid}>
                <div className={styles.pointsCard}>
                  <h4>How to Earn</h4>
                  <ul>
                    <li>✓ 1 point per ₹1 spent</li>
                    <li>✓ 150 points for first order</li>
                    <li>✓ 100 points for referral</li>
                    <li>✓ 25 points for review</li>
                    <li>✓ Bonus multiplier by tier</li>
                  </ul>
                </div>
                
                <div className={styles.pointsCard}>
                  <h4>Redemption</h4>
                  <ul>
                    <li>✓ 1 point = ₹0.50 discount</li>
                    <li>✓ Minimum 100 points</li>
                    <li>✓ Instant voucher code</li>
                    <li>✓ Valid for 30 days</li>
                    <li>✓ Combine with other offers</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tier Breakdown */}
            <div className={styles.section}>
              <h3>🎖️ Tier Benefits</h3>
              <div className={styles.tierBreakdown}>
                {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].map((tier) => (
                  <div key={tier} className={styles.tierCard}>
                    <div className={styles.tierCardHeader} style={{ borderColor: COLORS[tier] }}>
                      <span className={styles.tierIcon}>{tier_emojis[tier]}</span>
                      <span className={styles.tierCardTitle}>{tier}</span>
                    </div>
                    <div className={styles.tierCardContent}>
                      <div className={styles.multiplier}>
                        {getTierMultiplier(tier)}x multiplier
                      </div>
                      <ul className={styles.tierBenefits}>
                        {getTierBenefits(tier).map((benefit, idx) => (
                          <li key={idx}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && data.leaderboard && (
          <div className={styles.tabPane}>
            <div className={styles.section}>
              <h3>🏆 Global Leaderboard</h3>
              <p className={styles.description}>Top customers by loyalty points</p>
              
              <div className={styles.leaderboard}>
                {data.leaderboard.leaderboard?.map((entry, idx) => (
                  <div key={entry.customer_id} className={styles.leaderboardEntry}>
                    <div className={styles.rank}>
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && `#${entry.rank}`}
                    </div>
                    <div className={styles.entryInfo}>
                      <div className={styles.customerName}>{entry.name}</div>
                      <div className={styles.tierBadge}>{entry.tier_emoji} {entry.tier}</div>
                    </div>
                    <div className={styles.entryPoints}>
                      {entry.points.toLocaleString()} pts
                    </div>
                    <div className={styles.badges}>
                      {entry.badge_count > 0 && (
                        <span className={styles.badgeCount}>🏅 {entry.badge_count}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && data.achievements && (
          <div className={styles.tabPane}>
            <div className={styles.section}>
              <h3>🏅 Achievements & Badges</h3>
              <div className={styles.achievementStats}>
                <span>{data.achievements.unlocked_count}/{data.achievements.total_achievements} Unlocked</span>
                <span>{data.achievements.total_badge_points} Badge Points</span>
              </div>

              {/* Unlocked Achievements */}
              <h4>🎖️ Unlocked</h4>
              <div className={styles.achievementsGrid}>
                {data.achievements.unlocked?.map((ach) => (
                  <div key={ach.achievement_id} className={`${styles.achievement} ${styles.unlocked}`}>
                    <div className={styles.achievementIcon}>{ach.icon}</div>
                    <div className={styles.achievementName}>{ach.name}</div>
                    <div className={styles.achievementDescription}>{ach.description}</div>
                    <div className={styles.achievementPoints}>+{ach.points} pts</div>
                  </div>
                ))}
              </div>

              {/* Locked Achievements */}
              <h4>🔒 Locked</h4>
              <div className={styles.achievementsGrid}>
                {data.achievements.locked?.map((ach) => (
                  <div key={ach.achievement_id} className={`${styles.achievement} ${styles.locked}`}>
                    <div className={styles.achievementIcon}>{ach.icon}</div>
                    <div className={styles.achievementName}>{ach.name}</div>
                    <div className={styles.achievementDescription}>{ach.description}</div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${ach.progress_percentage}%` }}
                      />
                    </div>
                    <div className={styles.progressText}>
                      {ach.progress}/{ach.threshold}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && data.history && (
          <div className={styles.tabPane}>
            <div className={styles.section}>
              <h3>📜 Points History</h3>
              
              <div className={styles.historyTable}>
                <div className={styles.historyHeader}>
                  <div className={styles.historyColumn}>Date</div>
                  <div className={styles.historyColumn}>Reason</div>
                  <div className={styles.historyColumn}>Points</div>
                </div>
                
                {data.history.transactions?.map((tx) => (
                  <div key={tx.transaction_id} className={styles.historyRow}>
                    <div className={styles.historyColumn}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                    <div className={styles.historyColumn}>
                      {capitalizeReason(tx.reason)}
                    </div>
                    <div className={`${styles.historyColumn} ${styles.points}`}>
                      +{tx.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Functions
function getTierMultiplier(tier) {
  const multipliers = {
    BRONZE: 1.0,
    SILVER: 1.1,
    GOLD: 1.2,
    PLATINUM: 1.3,
    DIAMOND: 1.5
  };
  return multipliers[tier] || 1.0;
}

function getTierBenefits(tier) {
  const benefits = {
    BRONZE: ['1 point per ₹1 spent', 'Access to basic deals', 'Monthly newsletter'],
    SILVER: ['1.1x points multiplier', 'Early access to sales', 'Priority support', '₹50 birthday bonus'],
    GOLD: ['1.2x points multiplier', 'Exclusive GOLD deals', '24/7 support', '₹100 birthday bonus', 'Free shipping select'],
    PLATINUM: ['1.3x points multiplier', 'Exclusive events', 'Account manager', '₹200 birthday bonus', 'Free shipping all', 'Early products'],
    DIAMOND: ['1.5x points multiplier', 'VIP events', 'Concierge service', '₹500 birthday bonus', 'Express delivery', 'Annual gala', 'Premium samples']
  };
  return benefits[tier] || [];
}

function capitalizeReason(reason) {
  return reason
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default GamificationDashboard;
