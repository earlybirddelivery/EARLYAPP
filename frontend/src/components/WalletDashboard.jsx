/**
 * Wallet Dashboard Component - Main Wallet Interface
 * Displays balance, tier, recent transactions, expiring credits
 */

import React, { useState, useEffect } from 'react';
import WalletService from '../../services/walletService';
import styles from './CustomerWallet.module.css';

const WalletDashboard = ({ customerId, onAddCredits, onUseCredits }) => {
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [expiringCredits, setExpiringCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWalletData();
  }, [customerId]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, statsData, expiringData] = await Promise.all([
        WalletService.getWallet(customerId),
        WalletService.getStatistics(customerId),
        WalletService.getExpiringCredits(customerId, 30)
      ]);

      setWallet(walletData);
      setStats(statsData);
      setExpiringCredits(expiringData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

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

  if (!wallet) {
    return (
      <div className={styles.container}>
        <div className={styles.noWallet}>Wallet not found</div>
      </div>
    );
  }

  const tierBenefits = {
    BRONZE: { icon: '🥉', color: '#CD7F32' },
    SILVER: { icon: '🥈', color: '#C0C0C0' },
    GOLD: { icon: '🥇', color: '#FFD700' },
    PLATINUM: { icon: '💎', color: '#E5E4E2' }
  };

  const tier = tierBenefits[wallet.tier] || tierBenefits.BRONZE;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>My Wallet</h1>
        <button className={styles.refreshBtn} onClick={fetchWalletData}>
          ⟳ Refresh
        </button>
      </div>

      {/* Balance Card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceContent}>
          <div className={styles.balanceMain}>
            <span className={styles.balanceLabel}>Available Balance</span>
            <span className={styles.balanceAmount}>
              {WalletService.formatCurrency(wallet.balance)}
            </span>
          </div>

          <div className={styles.tierBadge} style={{ borderColor: tier.color }}>
            <span className={styles.tierIcon}>{tier.icon}</span>
            <span className={styles.tierName}>{wallet.tier}</span>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.btnPrimary} onClick={onAddCredits}>
            + Add Credits
          </button>
          <button className={styles.btnSecondary} onClick={onUseCredits}>
            Use Credits
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {WalletService.formatCurrency(stats.total_earned)}
            </div>
            <div className={styles.statLabel}>Total Earned</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {WalletService.formatCurrency(stats.total_spent)}
            </div>
            <div className={styles.statLabel}>Total Spent</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {WalletService.formatCurrency(stats.total_refunded)}
            </div>
            <div className={styles.statLabel}>Refunded</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.transactions.credit_count || 0}</div>
            <div className={styles.statLabel}>Transactions</div>
          </div>
        </div>
      )}

      {/* Expiring Credits Alert */}
      {expiringCredits.length > 0 && (
        <div className={styles.alertCard}>
          <div className={styles.alertIcon}>⚠️</div>
          <div className={styles.alertContent}>
            <h3>Credits Expiring Soon</h3>
            <p>
              You have {expiringCredits.length} credit(s) expiring within 30 days
            </p>
            <ul className={styles.expiringList}>
              {expiringCredits.slice(0, 3).map((credit, idx) => (
                <li key={idx}>
                  <span>{WalletService.formatCurrency(credit.amount)}</span>
                  <span className={styles.expiryDays}>
                    {credit.days_remaining} days left
                  </span>
                </li>
              ))}
            </ul>
            {expiringCredits.length > 3 && (
              <p className={styles.viewMore}>
                +{expiringCredits.length - 3} more expiring
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tier Benefits Preview */}
      <div className={styles.tierInfoCard}>
        <h3>Your Tier Benefits</h3>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitItem}>
            <span className={styles.benefitIcon}>📅</span>
            <span className={styles.benefitText}>
              {stats?.tier_benefits?.credit_expiry_days || 365} day validity
            </span>
          </div>
          <div className={styles.benefitItem}>
            <span className={styles.benefitIcon}>🎁</span>
            <span className={styles.benefitText}>
              {(stats?.tier_benefits?.bonus_multiplier || 1) * 100}% bonus multiplier
            </span>
          </div>
        </div>
      </div>

      {/* Referral Code */}
      {stats?.referral_code && (
        <div className={styles.referralCard}>
          <h3>Share & Earn</h3>
          <div className={styles.referralCode}>
            <code>{stats.referral_code}</code>
            <button
              className={styles.copyBtn}
              onClick={() => {
                navigator.clipboard.writeText(stats.referral_code);
                alert('Referral code copied!');
              }}
            >
              Copy
            </button>
          </div>
          <p>Share this code with friends and earn ₹100 per successful referral!</p>
          <div className={styles.referralCount}>
            Successful referrals: <strong>{stats.referral_count}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;
