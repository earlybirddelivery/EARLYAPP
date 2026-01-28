/**
 * PHASE 4B.4: Inventory Dashboard - Main Component
 * Complete inventory monitoring dashboard with real-time updates
 */

import React, { useState, useEffect } from 'react';
import styles from './InventoryDashboard.module.css';
import inventoryService from '../../services/inventoryService';
import StockLevelCard from './StockLevelCard';
import AlertsPanel from './AlertsPanel';
import ReorderManager from './ReorderManager';
import ForecastingPanel from './ForecastingPanel';
import AnalyticsPanel from './AnalyticsPanel';

const InventoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardRes, analyticsRes] = await Promise.all([
          inventoryService.getDashboardSummary(),
          inventoryService.getAnalytics(),
        ]);

        setDashboardData(dashboardRes.data);
        setAnalytics(analyticsRes.analytics);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching inventory data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>📦 Inventory Monitoring</h1>
          <p className={styles.subtitle}>Real-time stock tracking, alerts, and forecasting</p>
        </div>
        <div className={styles.refreshControl}>
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className={styles.refreshSelect}
          >
            <option value={10000}>Auto-refresh: 10s</option>
            <option value={30000}>Auto-refresh: 30s</option>
            <option value={60000}>Auto-refresh: 1m</option>
            <option value={300000}>Auto-refresh: 5m</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={styles.errorAlert}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Quick Stats */}
      {analytics && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analytics.total_products}</div>
            <div className={styles.statLabel}>Total Products</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>₹{(analytics.total_stock_value / 100000).toFixed(1)}L</div>
            <div className={styles.statLabel}>Stock Value</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analytics.out_of_stock_products}</div>
            <div className={styles.statLabel}>Out of Stock</div>
            <div className={styles.statSubtext}>Critical</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analytics.low_stock_products}</div>
            <div className={styles.statLabel}>Low Stock</div>
            <div className={styles.statSubtext}>Needs reorder</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analytics.total_active_alerts}</div>
            <div className={styles.statLabel}>Active Alerts</div>
            <div className={styles.statSubtext}>{analytics.pending_reorders} pending</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'alerts' ? styles.active : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            🚨 Alerts ({dashboardData?.active_alerts?.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'reorders' ? styles.active : ''}`}
            onClick={() => setActiveTab('reorders')}
          >
            📦 Reorders ({dashboardData?.pending_reorders?.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'forecast' ? styles.active : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            📈 Forecast
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📉 Analytics
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className={styles.contentArea}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2>Low Stock Products</h2>
              <div className={styles.cardsGrid}>
                {dashboardData?.low_stock_products?.slice(0, 6).map((product) => (
                  <StockLevelCard key={product._id} product={product} />
                ))}
              </div>
              {dashboardData?.low_stock_products?.length === 0 && (
                <div className={styles.emptyState}>
                  <p>✅ All products have healthy stock levels</p>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h2>Recent Stock Movements</h2>
              <div className={styles.activityLog}>
                <div className={styles.activityItem}>
                  <span className={styles.activityTime}>Today, 2:45 PM</span>
                  <span className={styles.activityText}>Stock updated for Tomatoes (+100kg)</span>
                </div>
                <div className={styles.activityItem}>
                  <span className={styles.activityTime}>Today, 1:20 PM</span>
                  <span className={styles.activityText}>Order #OR-001 received and processed</span>
                </div>
                <div className={styles.activityItem}>
                  <span className={styles.activityTime}>Today, 11:00 AM</span>
                  <span className={styles.activityText}>Low stock alert triggered for Onions</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className={styles.tabContent}>
            <AlertsPanel alerts={dashboardData?.active_alerts || []} />
          </div>
        )}

        {/* Reorders Tab */}
        {activeTab === 'reorders' && (
          <div className={styles.tabContent}>
            <ReorderManager reorders={dashboardData?.pending_reorders || []} />
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className={styles.tabContent}>
            <ForecastingPanel />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className={styles.tabContent}>
            <AnalyticsPanel analytics={analytics} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboard;
