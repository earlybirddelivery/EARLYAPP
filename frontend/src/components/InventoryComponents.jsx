/**
 * PHASE 4B.4: Inventory Dashboard Components
 * Supporting components for inventory management UI
 */

import React, { useState } from 'react';
import styles from './InventoryDashboard.module.css';
import inventoryService from '../../services/inventoryService';

// ============================================================================
// STOCK LEVEL CARD COMPONENT
// ============================================================================

export const StockLevelCard = ({ product }) => {
  const stockPercentage = (product.current_stock / product.max_stock) * 100;
  const status = product.status || 'HEALTHY';
  
  const statusColors = {
    OUT_OF_STOCK: '#d32f2f',
    LOW_STOCK: '#f57c00',
    OVERSTOCK: '#fbc02d',
    HEALTHY: '#388e3c',
  };

  return (
    <div className={styles.stockCard}>
      <div className={styles.cardHeader}>
        <h3>{product.product_name}</h3>
        <span className={styles.sku}>{product.sku}</span>
      </div>
      
      <div className={styles.stockInfo}>
        <div className={styles.stockLevel}>
          <span className={styles.current}>{product.current_stock}</span>
          <span className={styles.unit}>{product.unit}</span>
        </div>
        <div className={styles.stockRange}>
          Min: {product.reorder_level} | Max: {product.max_stock}
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progress}
          style={{
            width: `${Math.min(100, stockPercentage)}%`,
            backgroundColor: statusColors[status],
          }}
        ></div>
      </div>

      <div className={styles.cardFooter}>
        <span 
          className={styles.badge}
          style={{ backgroundColor: statusColors[status] }}
        >
          {status.replace('_', ' ')}
        </span>
        <span className={styles.lastUpdate}>
          Updated: {new Date(product.updated_at).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// ALERTS PANEL COMPONENT
// ============================================================================

export const AlertsPanel = ({ alerts }) => {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [ackComment, setAckComment] = useState('');

  const handleAcknowledge = async (alertId) => {
    try {
      await inventoryService.acknowledgeAlert(alertId, ackComment);
      alert('Alert acknowledged');
      setSelectedAlert(null);
      setAckComment('');
    } catch (error) {
      alert('Error acknowledging alert: ' + error.message);
    }
  };

  const severityColors = {
    CRITICAL: '#d32f2f',
    HIGH: '#f57c00',
    MEDIUM: '#fbc02d',
    LOW: '#388e3c',
  };

  return (
    <div className={styles.alertsPanel}>
      {alerts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>✅ No active alerts</p>
        </div>
      ) : (
        <div className={styles.alertsList}>
          {alerts.map((alert) => (
            <div key={alert._id} className={styles.alertItem}>
              <div 
                className={styles.alertSeverity}
                style={{ backgroundColor: severityColors[alert.severity] }}
              ></div>
              
              <div className={styles.alertContent}>
                <h4>{alert.product_name}</h4>
                <p className={styles.alertType}>{alert.alert_type}</p>
                <p>Current: {alert.current_stock} | Threshold: {alert.threshold_level}</p>
                <p className={styles.timestamp}>
                  Triggered: {new Date(alert.triggered_at).toLocaleString()}
                </p>
              </div>

              <div className={styles.alertActions}>
                <button 
                  className={styles.btn}
                  onClick={() => setSelectedAlert(alert._id)}
                >
                  Acknowledge
                </button>
              </div>

              {selectedAlert === alert._id && (
                <div className={styles.acknowledgeForm}>
                  <textarea
                    placeholder="Enter comment..."
                    value={ackComment}
                    onChange={(e) => setAckComment(e.target.value)}
                  ></textarea>
                  <div className={styles.formActions}>
                    <button 
                      className={styles.btn}
                      onClick={() => handleAcknowledge(alert._id)}
                    >
                      Submit
                    </button>
                    <button 
                      className={styles.btnSecondary}
                      onClick={() => setSelectedAlert(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// REORDER MANAGER COMPONENT
// ============================================================================

export const ReorderManager = ({ reorders }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    trigger_reason: 'MANUAL',
  });

  const handleCreateReorder = async () => {
    try {
      if (!formData.product_id || !formData.quantity) {
        alert('Please fill all fields');
        return;
      }
      
      await inventoryService.createReorderRequest(formData);
      alert('Reorder created successfully');
      setShowCreateForm(false);
      setFormData({ product_id: '', quantity: '', trigger_reason: 'MANUAL' });
    } catch (error) {
      alert('Error creating reorder: ' + error.message);
    }
  };

  const statusColors = {
    PENDING: '#fbc02d',
    ORDERED: '#2196f3',
    RECEIVED: '#388e3c',
    CANCELLED: '#d32f2f',
  };

  return (
    <div className={styles.reorderPanel}>
      <div className={styles.panelHeader}>
        <h2>Reorder Management</h2>
        <button 
          className={styles.btn}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          + New Reorder
        </button>
      </div>

      {showCreateForm && (
        <div className={styles.form}>
          <input
            type="text"
            placeholder="Product ID"
            value={formData.product_id}
            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
          />
          <select
            value={formData.trigger_reason}
            onChange={(e) => setFormData({ ...formData, trigger_reason: e.target.value })}
          >
            <option value="MANUAL">Manual</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="SEASONAL">Seasonal</option>
          </select>
          <div className={styles.formActions}>
            <button className={styles.btn} onClick={handleCreateReorder}>
              Create
            </button>
            <button 
              className={styles.btnSecondary}
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {reorders.length === 0 ? (
        <div className={styles.emptyState}>
          <p>✅ No pending reorders</p>
        </div>
      ) : (
        <div className={styles.reordersList}>
          {reorders.map((reorder) => (
            <div key={reorder._id} className={styles.reorderItem}>
              <div className={styles.reorderHeader}>
                <h4>{reorder.product_name}</h4>
                <span 
                  className={styles.badge}
                  style={{ backgroundColor: statusColors[reorder.status] }}
                >
                  {reorder.status}
                </span>
              </div>
              
              <div className={styles.reorderDetails}>
                <p>Quantity: {reorder.quantity_ordered} units</p>
                <p>Cost: ₹{reorder.total_cost}</p>
                <p>Created: {new Date(reorder.created_at).toLocaleDateString()}</p>
                {reorder.expected_delivery && (
                  <p>Expected: {new Date(reorder.expected_delivery).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FORECASTING PANEL COMPONENT
// ============================================================================

export const ForecastingPanel = () => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGetForecast = async () => {
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }

    try {
      setLoading(true);
      const result = await inventoryService.getDemandForecast(selectedProduct);
      setForecast(result.forecast);
    } catch (error) {
      alert('Error getting forecast: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.forecastPanel}>
      <h2>Demand Forecasting</h2>
      
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Enter Product ID"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        />
        <button 
          className={styles.btn}
          onClick={handleGetForecast}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Get Forecast'}
        </button>
      </div>

      {forecast && (
        <div className={styles.forecastDetails}>
          <div className={styles.forecastItem}>
            <label>Predicted Demand (Weekly)</label>
            <div className={styles.value}>{forecast.predicted_demand} units</div>
          </div>
          
          <div className={styles.forecastItem}>
            <label>Trend</label>
            <div className={styles.value}>{forecast.trend}</div>
          </div>
          
          <div className={styles.forecastItem}>
            <label>Confidence Level</label>
            <div className={styles.value}>{(forecast.confidence_level * 100).toFixed(1)}%</div>
          </div>
          
          <div className={styles.forecastItem}>
            <label>Recommended Stock</label>
            <div className={styles.value}>{forecast.recommended_stock} units</div>
          </div>

          <div className={styles.forecastItem}>
            <label>Algorithm</label>
            <div className={styles.value}>{forecast.algorithm_used}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ANALYTICS PANEL COMPONENT
// ============================================================================

export const AnalyticsPanel = ({ analytics }) => {
  if (!analytics) {
    return <div className={styles.emptyState}><p>Loading analytics...</p></div>;
  }

  return (
    <div className={styles.analyticsPanel}>
      <div className={styles.analyticsGrid}>
        <div className={styles.analyticsCard}>
          <h3>Stock Turnover Ratio</h3>
          <div className={styles.analyticsValue}>{analytics.stock_turnover_ratio}x/year</div>
        </div>

        <div className={styles.analyticsCard}>
          <h3>Days Inventory Outstanding</h3>
          <div className={styles.analyticsValue}>{analytics.days_inventory_outstanding} days</div>
        </div>

        <div className={styles.analyticsCard}>
          <h3>Inventory Efficiency</h3>
          <div className={styles.analyticsValue}>{(analytics.inventory_efficiency * 100).toFixed(1)}%</div>
        </div>

        <div className={styles.analyticsCard}>
          <h3>Fill Rate</h3>
          <div className={styles.analyticsValue}>{(analytics.fill_rate * 100).toFixed(1)}%</div>
        </div>

        <div className={styles.analyticsCard}>
          <h3>Waste Percentage</h3>
          <div className={styles.analyticsValue}>{(analytics.waste_percentage * 100).toFixed(2)}%</div>
        </div>

        <div className={styles.analyticsCard}>
          <h3>Forecast Accuracy</h3>
          <div className={styles.analyticsValue}>{(analytics.demand_forecast_accuracy * 100).toFixed(1)}%</div>
        </div>
      </div>

      {analytics.top_5_best_sellers && (
        <div className={styles.section}>
          <h3>Top 5 Best Sellers</h3>
          <div className={styles.topSellersList}>
            {analytics.top_5_best_sellers.map((item, idx) => (
              <div key={idx} className={styles.topSellerItem}>
                <span className={styles.rank}>#{idx + 1}</span>
                <span className={styles.productId}>{item.product_id}</span>
                <span className={styles.quantity}>{item.quantity} units sold</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  StockLevelCard,
  AlertsPanel,
  ReorderManager,
  ForecastingPanel,
  AnalyticsPanel,
};
