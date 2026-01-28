/**
 * Phase 4A.5: AI/ML Dashboard Component
 * Demand Forecasting, Churn Prediction, Route Optimization Insights
 * 
 * @author AI Development Team
 * @date January 28, 2026
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import styles from './MLDashboard.module.css';

/**
 * ML Dashboard Component
 * 
 * Features:
 * - Demand forecasting visualization
 * - Churn prediction alerts
 * - Route optimization metrics
 * - Model performance monitoring
 * - Business insights & recommendations
 */
const MLDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [demandData, setDemandData] = useState([]);
  const [churnRisks, setChurnRisks] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState({});
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchMLData();
    const interval = setInterval(fetchMLData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchMLData = async () => {
    try {
      setLoading(true);
      
      // Fetch demand forecast
      const demandRes = await fetch('/api/ai-ml/forecast/low-stock', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const demandJson = await demandRes.json();
      setDemandData(demandJson.alerts || []);
      
      // Fetch churn predictions
      const churnRes = await fetch('/api/ai-ml/churn/at-risk?min_score=60&limit=10', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const churnJson = await churnRes.json();
      setChurnRisks(churnJson.customers || []);
      
      // Fetch business insights
      const insightsRes = await fetch('/api/ai-ml/analytics/insights', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const insightsJson = await insightsRes.json();
      setInsights(insightsJson.insights || []);
      
      // Mock route metrics
      setRouteMetrics({
        totalOptimized: 320,
        avgDistanceReduction: '18%',
        avgTimeSaved: '12 min',
        costSaved: '₹8,500'
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching ML data:', err);
      setError('Failed to load ML data');
    } finally {
      setLoading(false);
    }
  };

  // Mock forecast data for visualization
  const forecastChartData = [
    { date: 'Mon', actual: 120, forecast: 125, confidence: 90 },
    { date: 'Tue', actual: 135, forecast: 140, confidence: 88 },
    { date: 'Wed', actual: 110, forecast: 115, confidence: 92 },
    { date: 'Thu', actual: 150, forecast: 155, confidence: 85 },
    { date: 'Fri', actual: 180, forecast: 175, confidence: 87 },
    { date: 'Sat', actual: 200, forecast: 205, confidence: 91 },
    { date: 'Sun', actual: 220, forecast: 215, confidence: 86 }
  ];

  const churnRiskDistribution = [
    { name: 'Low Risk', value: 450, color: '#10b981' },
    { name: 'Medium Risk', value: 180, color: '#f59e0b' },
    { name: 'High Risk', value: 45, color: '#ef4444' }
  ];

  if (loading) {
    return <div className={styles.loading}>Loading ML insights...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🤖 AI/ML Analytics Dashboard</h1>
        <p>Real-time insights from demand forecasting, churn prediction, and route optimization</p>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'demand' ? styles.active : ''}`}
          onClick={() => setActiveTab('demand')}
        >
          📈 Demand Forecast
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'churn' ? styles.active : ''}`}
          onClick={() => setActiveTab('churn')}
        >
          ⚠️ Churn Risk
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'routes' ? styles.active : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          🛣️ Route Optimization
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          {/* Key Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <div className={styles.metricValue}>92%</div>
              <div className={styles.metricLabel}>Forecast Accuracy</div>
              <div className={styles.metricTrend}>↑ +2% this week</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>88%</div>
              <div className={styles.metricLabel}>Churn Model Accuracy</div>
              <div className={styles.metricTrend}>↑ +1% this week</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>18%</div>
              <div className={styles.metricLabel}>Avg Distance Reduction</div>
              <div className={styles.metricTrend}>↑ +0.5% this week</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>₹8.5K</div>
              <div className={styles.metricLabel}>Cost Saved (Weekly)</div>
              <div className={styles.metricTrend}>↑ +₹500 this week</div>
            </div>
          </div>

          {/* Business Insights */}
          <div className={styles.section}>
            <h2>🎯 Actionable Insights</h2>
            <div className={styles.insightsList}>
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`${styles.insight} ${styles[`severity-${insight.severity.toLowerCase()}`]}`}
                >
                  <div className={styles.insightHeader}>
                    <h3>{insight.title}</h3>
                    <span className={styles.severity}>{insight.severity}</span>
                  </div>
                  <p className={styles.insightCategory}>{insight.category}</p>
                  <p className={styles.insightAction}>
                    <strong>Action:</strong> {insight.action}
                  </p>
                  <p className={styles.insightImpact}>
                    <strong>Impact:</strong> {insight.impact}
                  </p>
                  <div className={styles.confidence}>
                    Confidence: {(insight.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demand Forecast Tab */}
      {activeTab === 'demand' && (
        <div className={styles.tabContent}>
          {/* Forecast Chart */}
          <div className={styles.section}>
            <h2>📈 Demand Forecast - 7 Day Ahead</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  name="Actual Sales"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#10b981"
                  name="Predicted Demand"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Low Stock Alerts */}
          <div className={styles.section}>
            <h2>⚠️ Low Stock Alerts ({demandData.length})</h2>
            <div className={styles.alertsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Forecast Demand</th>
                    <th>Risk Level</th>
                    <th>Reorder Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {demandData.slice(0, 5).map((alert) => (
                    <tr key={alert.product_id}>
                      <td>{alert.product_name}</td>
                      <td>{alert.current_stock}</td>
                      <td>{Math.round(alert.forecasted_demand)}</td>
                      <td>
                        <span className={styles[`risk-${alert.risk_level.toLowerCase()}`]}>
                          {alert.risk_level}
                        </span>
                      </td>
                      <td>{alert.recommended_reorder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Churn Risk Tab */}
      {activeTab === 'churn' && (
        <div className={styles.tabContent}>
          {/* Churn Distribution */}
          <div className={styles.section}>
            <h2>Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={churnRiskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {churnRiskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* At-Risk Customers */}
          <div className={styles.section}>
            <h2>🚨 High Risk Customers ({churnRisks.length})</h2>
            <div className={styles.riskList}>
              {churnRisks.map((customer) => (
                <div key={customer.customer_id} className={styles.riskCard}>
                  <div className={styles.riskCardHeader}>
                    <h3>{customer.name}</h3>
                    <span className={styles.riskScore}>{customer.churn_score}</span>
                  </div>
                  <p>Lifetime Value: ₹{customer.lifetime_value.toLocaleString('en-IN')}</p>
                  <div className={styles.recommendations}>
                    <strong>Recommended Actions:</strong>
                    <ul>
                      {customer.recommendations.slice(0, 2).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  <button className={styles.btn}>Create Campaign</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Route Optimization Tab */}
      {activeTab === 'routes' && (
        <div className={styles.tabContent}>
          {/* Route Metrics */}
          <div className={styles.section}>
            <h2>🛣️ Route Optimization Performance</h2>
            <div className={styles.metricsGrid}>
              <div className={`${styles.metric} ${styles.large}`}>
                <div className={styles.metricValue}>{routeMetrics.totalOptimized}</div>
                <div className={styles.metricLabel}>Routes Optimized (Weekly)</div>
              </div>
              <div className={`${styles.metric} ${styles.large}`}>
                <div className={styles.metricValue}>{routeMetrics.avgDistanceReduction}</div>
                <div className={styles.metricLabel}>Avg Distance Reduction</div>
              </div>
              <div className={`${styles.metric} ${styles.large}`}>
                <div className={styles.metricValue}>{routeMetrics.avgTimeSaved}</div>
                <div className={styles.metricLabel}>Time Saved Per Route</div>
              </div>
              <div className={`${styles.metric} ${styles.large}`}>
                <div className={styles.metricValue}>{routeMetrics.costSaved}</div>
                <div className={styles.metricLabel}>Cost Saved (Weekly)</div>
              </div>
            </div>
          </div>

          {/* Sample Route Visualization */}
          <div className={styles.section}>
            <h2>Sample Optimized Route</h2>
            <div className={styles.routeVisualization}>
              <div className={styles.routeMap}>
                <div className={styles.mapPlaceholder}>
                  Map integration with Google Maps API
                </div>
              </div>
              <div className={styles.routeStats}>
                <h3>Route Details</h3>
                <p><strong>Stops:</strong> 8</p>
                <p><strong>Total Distance:</strong> 12.5 km</p>
                <p><strong>Estimated Time:</strong> 1h 15m</p>
                <p><strong>Optimization Method:</strong> Nearest Neighbor Algorithm</p>
                <p><strong>Potential Savings:</strong>
                  <br />Distance: 2.3 km (-15.5%)
                  <br />Time: 12 min (-13.8%)
                  <br />Cost: ₹180 (-16%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className={styles.footer}>
        <button className={styles.refreshBtn} onClick={fetchMLData}>
          🔄 Refresh Data
        </button>
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default MLDashboard;
