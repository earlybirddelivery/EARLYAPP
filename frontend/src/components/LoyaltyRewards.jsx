/**
 * Loyalty Rewards Component
 * Displays available rewards and allows claiming them
 */

import React, { useState, useEffect } from 'react';
import WalletService from '../../services/walletService';
import styles from './CustomerWallet.module.css';

const LoyaltyRewards = ({ customerId, onRewardClaimed }) => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimedRewardId, setClaimedRewardId] = useState(null);

  useEffect(() => {
    fetchRewards();
  }, [customerId]);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const data = await WalletService.getAvailableRewards(customerId);
      setRewards(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (rewardId) => {
    try {
      setClaimedRewardId(rewardId);
      const result = await WalletService.applyReward(customerId, rewardId);
      
      console.log('Reward claimed:', result);
      
      if (onRewardClaimed) {
        onRewardClaimed(result);
      }

      // Refresh rewards list
      setTimeout(() => {
        fetchRewards();
        setClaimedRewardId(null);
      }, 1500);

    } catch (err) {
      alert(`Error claiming reward: ${err.message}`);
      setClaimedRewardId(null);
    }
  };

  const getRewardIcon = (name) => {
    if (name.includes('Birthday')) return '🎂';
    if (name.includes('New Year')) return '🎆';
    if (name.includes('Anniversary')) return '🎉';
    if (name.includes('Cashback')) return '💰';
    if (name.includes('VIP')) return '👑';
    return '🎁';
  };

  return (
    <div className={styles.container}>
      <h2>Loyalty Rewards</h2>
      <p className={styles.subtitle}>
        Earn and claim exclusive rewards to get more credits!
      </p>

      {loading ? (
        <div className={styles.loading}>Loading rewards...</div>
      ) : error ? (
        <div className={styles.error}>Error: {error}</div>
      ) : rewards.length === 0 ? (
        <div className={styles.noData}>
          <p>No rewards available at the moment</p>
          <p className={styles.subText}>Check back soon for exclusive offers!</p>
        </div>
      ) : (
        <div className={styles.rewardsGrid}>
          {rewards.map(reward => (
            <div key={reward._id} className={styles.rewardCard}>
              <div className={styles.rewardIcon}>
                {getRewardIcon(reward.name)}
              </div>

              <h3 className={styles.rewardName}>{reward.name}</h3>

              <p className={styles.rewardDescription}>
                {reward.description}
              </p>

              <div className={styles.rewardAmount}>
                <span className={styles.creditAmount}>
                  +{WalletService.formatCurrency(reward.credit_amount)}
                </span>
                <span className={styles.credits}>Credits</span>
              </div>

              {reward.min_purchase_amount > 0 && (
                <div className={styles.rewardCondition}>
                  Minimum purchase: {WalletService.formatCurrency(reward.min_purchase_amount)}
                </div>
              )}

              <div className={styles.rewardValidity}>
                Valid until:{' '}
                {new Date(reward.valid_until).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>

              {reward.max_uses && (
                <div className={styles.rewardUsage}>
                  <div className={styles.usageBar}>
                    <div
                      className={styles.usageFill}
                      style={{
                        width: `${(reward.total_uses / reward.max_uses) * 100}%`
                      }}
                    />
                  </div>
                  <span className={styles.usageText}>
                    {reward.total_uses}/{reward.max_uses} claimed
                  </span>
                </div>
              )}

              <button
                className={styles.claimBtn}
                onClick={() => handleClaimReward(reward._id)}
                disabled={claimedRewardId === reward._id}
              >
                {claimedRewardId === reward._id ? (
                  <>
                    <span className={styles.spinner}>⏳</span> Claiming...
                  </>
                ) : (
                  'Claim Reward'
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* How It Works */}
      <div className={styles.infoSection}>
        <h3>How Loyalty Rewards Work</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoNumber}>1</span>
            <h4>Browse Rewards</h4>
            <p>Check out all available rewards</p>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoNumber}>2</span>
            <h4>Claim Reward</h4>
            <p>Click the claim button to redeem</p>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoNumber}>3</span>
            <h4>Get Credits</h4>
            <p>Credits added instantly to wallet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyRewards;
