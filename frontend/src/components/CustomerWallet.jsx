/**
 * Customer Wallet Main Component
 * Integrates all wallet sub-components
 */

import React, { useState } from 'react';
import WalletDashboard from './WalletDashboard';
import TransactionHistory from './TransactionHistory';
import LoyaltyRewards from './LoyaltyRewards';
import AddCredits from './AddCredits';
import styles from './CustomerWallet.module.css';

const CustomerWallet = ({ customerId = 'current_user' }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddCreditsSuccess = () => {
    setShowAddCredits(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className={styles.walletContainer}>
      {/* Tabs Navigation */}
      <div className={styles.tabsNav}>
        <button
          className={`${styles.tab} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className={styles.tabIcon}>💳</span>
          Dashboard
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className={styles.tabIcon}>📋</span>
          History
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'rewards' ? styles.active : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          <span className={styles.tabIcon}>🎁</span>
          Rewards
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabsContent}>
        {activeTab === 'dashboard' && (
          <WalletDashboard
            key={refreshTrigger}
            customerId={customerId}
            onAddCredits={() => setShowAddCredits(true)}
            onUseCredits={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'history' && (
          <TransactionHistory key={refreshTrigger} customerId={customerId} />
        )}

        {activeTab === 'rewards' && (
          <LoyaltyRewards
            key={refreshTrigger}
            customerId={customerId}
            onRewardClaimed={handleAddCreditsSuccess}
          />
        )}
      </div>

      {/* Add Credits Modal */}
      {showAddCredits && (
        <AddCredits
          customerId={customerId}
          onSuccess={handleAddCreditsSuccess}
          onCancel={() => setShowAddCredits(false)}
        />
      )}
    </div>
  );
};

export default CustomerWallet;
