/**
 * EarlyBird Demand Forecasting & Auto-Ordering System
 * Aggregates customer demand by supplier and date
 * Shows stock shortages and enables one-click order generation
 * 
 * Features:
 * - Aggregate demand by supplier (what's needed, how much, by when)
 * - Stock shortage alerts (RED for insufficient inventory)
 * - Forecast visualization (7, 14, 30-day views)
 * - One-click order generation
 * - Supplier confirmation workflow
 * - Historical accuracy tracking
 * 
 * @author EarlyBird Team
 * @version 2.0
 * @date January 2026
 */

class EarlyBirdDemandForecast {
  constructor() {
    this.storageKey = 'EARLYBIRD_DEMAND_FORECAST';
    
    this.state = {
      forecasts: {},        // { supplierId: [{ date, items: [...], totalQty, status }] }
      stockLevels: {},      // { supplierId: { productId: currentStock } }
      autoOrders: [],       // Generated purchase orders
      accuracy: {}          // Historical forecast accuracy tracking
    };
    
    this.loadState();
  }

  loadState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.state = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load demand forecast state:', e);
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save demand forecast state:', e);
    }
  }

  /**
   * AGGREGATION & FORECASTING
   */

  /**
   * Aggregate customer demand by supplier
   * @param {array} orders - Array of customer orders
   * @param {number} daysAhead - Forecast horizon (7, 14, or 30)
   * @returns {object} Aggregated demand by supplier
   */
  aggregateDemand(orders, daysAhead = 7) {
    const forecast = {};
    const now = new Date();

    orders.forEach(order => {
      const orderDate = new Date(order.date);
      const daysFromNow = Math.floor((orderDate - now) / (24 * 60 * 60 * 1000));

      if (daysFromNow >= 0 && daysFromNow <= daysAhead) {
        order.items.forEach(item => {
          const supplierId = item.supplierId || 'DEFAULT';
          const dateKey = this.formatDateKey(orderDate);

          if (!forecast[supplierId]) {
            forecast[supplierId] = {};
          }
          if (!forecast[supplierId][dateKey]) {
            forecast[supplierId][dateKey] = {
              date: dateKey,
              items: [],
              totalQty: 0,
              status: 'pending'
            };
          }

          // Check if item already in forecast
          const existingItem = forecast[supplierId][dateKey].items.find(
            i => i.productId === item.productId
          );

          if (existingItem) {
            existingItem.totalQty += item.quantity;
            existingItem.customerOrders.push(order.id);
          } else {
            forecast[supplierId][dateKey].items.push({
              productId: item.productId,
              name: item.name,
              brand: item.brand,
              unit: item.unit,
              totalQty: item.quantity,
              customerOrders: [order.id]
            });
          }

          forecast[supplierId][dateKey].totalQty += item.quantity;
        });
      }
    });

    // Convert to array format for easier display
    const result = {};
    Object.entries(forecast).forEach(([supplierId, dateData]) => {
      result[supplierId] = Object.values(dateData).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
    });

    return result;
  }

  /**
   * Generate forecast for specific period
   * @param {string} supplierId - Supplier ID
   * @param {array} orders - Customer orders
   * @param {number} days - Days to forecast (7, 14, 30)
   * @returns {object} Forecast with insights
   */
  generateForecast(supplierId, orders, days = 7) {
    const aggregated = this.aggregateDemand(orders, days);
    const supplierForecast = aggregated[supplierId] || [];

    const forecast = {
      supplierId,
      generatedAt: new Date().toISOString(),
      forecastDays: days,
      totalItems: 0,
      totalQty: 0,
      byDate: supplierForecast,
      insights: this.generateForecastInsights(supplierForecast),
      stockStatus: this.checkStockStatus(supplierId, supplierForecast)
    };

    // Calculate totals
    supplierForecast.forEach(dailyForecast => {
      forecast.totalItems += dailyForecast.items.length;
      forecast.totalQty += dailyForecast.totalQty;
    });

    // Store forecast
    if (!this.state.forecasts[supplierId]) {
      this.state.forecasts[supplierId] = [];
    }
    this.state.forecasts[supplierId].push(forecast);
    this.saveState();

    return forecast;
  }

  /**
   * Generate forecast insights
   * @param {array} dailyForecasts - Daily forecast data
   * @returns {object} Insights and trends
   */
  generateForecastInsights(dailyForecasts) {
    const insights = {
      peakDays: [],
      slowDays: [],
      averageDailyQty: 0,
      trend: 'stable' // increasing, decreasing, stable
    };

    if (dailyForecasts.length === 0) {
      return insights;
    }

    const quantities = dailyForecasts.map(d => d.totalQty);
    const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    insights.averageDailyQty = Math.round(avgQty);

    // Find peak and slow days
    const maxQty = Math.max(...quantities);
    const minQty = Math.min(...quantities);

    dailyForecasts.forEach(forecast => {
      if (forecast.totalQty >= maxQty * 0.8) {
        insights.peakDays.push(forecast.date);
      }
      if (forecast.totalQty <= minQty * 1.2) {
        insights.slowDays.push(forecast.date);
      }
    });

    // Determine trend
    if (dailyForecasts.length >= 2) {
      const firstHalf = dailyForecasts.slice(0, Math.ceil(dailyForecasts.length / 2));
      const secondHalf = dailyForecasts.slice(Math.ceil(dailyForecasts.length / 2));

      const firstAvg = firstHalf.reduce((a, d) => a + d.totalQty, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, d) => a + d.totalQty, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.15) {
        insights.trend = 'increasing';
      } else if (secondAvg < firstAvg * 0.85) {
        insights.trend = 'decreasing';
      }
    }

    return insights;
  }

  /**
   * STOCK MANAGEMENT
   */

  /**
   * Set current stock level for supplier
   * @param {string} supplierId - Supplier ID
   * @param {object} stock - { productId: quantity }
   */
  setStockLevels(supplierId, stock) {
    this.state.stockLevels[supplierId] = stock;
    this.saveState();
  }

  /**
   * Get stock level for product
   * @param {string} supplierId - Supplier ID
   * @param {string} productId - Product ID
   * @returns {number} Current stock quantity
   */
  getStockLevel(supplierId, productId) {
    return this.state.stockLevels[supplierId]?.[productId] || 0;
  }

  /**
   * Check stock status for forecast
   * @param {string} supplierId - Supplier ID
   * @param {array} forecast - Daily forecast items
   * @returns {object} Stock status with alerts
   */
  checkStockStatus(supplierId, forecast) {
    const status = {
      sufficient: [],
      warning: [],        // 50-80% of needed
      critical: [],       // <50% of needed
      stockOut: []        // 0% available
    };

    const cumulativeDemand = {};

    forecast.forEach(dailyForecast => {
      dailyForecast.items.forEach(item => {
        if (!cumulativeDemand[item.productId]) {
          cumulativeDemand[item.productId] = {
            ...item,
            demand: 0
          };
        }
        cumulativeDemand[item.productId].demand += item.totalQty;
      });
    });

    Object.values(cumulativeDemand).forEach(item => {
      const available = this.getStockLevel(supplierId, item.productId);
      const percentage = available > 0 ? (available / item.demand) * 100 : 0;

      const stockItem = {
        productId: item.productId,
        name: item.name,
        available,
        needed: item.demand,
        shortage: Math.max(0, item.demand - available),
        percentage: Math.round(percentage)
      };

      if (available === 0) {
        status.stockOut.push(stockItem);
      } else if (percentage < 50) {
        status.critical.push(stockItem);
      } else if (percentage < 80) {
        status.warning.push(stockItem);
      } else {
        status.sufficient.push(stockItem);
      }
    });

    return status;
  }

  /**
   * AUTO-ORDER GENERATION
   */

  /**
   * Generate purchase order from forecast
   * @param {string} supplierId - Supplier ID
   * @param {array} forecast - Forecast to convert to order
   * @param {object} options - { quantity: 'forecast' | 'stock_adjusted' | 'safety_stock' }
   * @returns {object} Generated purchase order
   */
  generatePurchaseOrder(supplierId, forecast, options = {}) {
    const { quantity = 'stock_adjusted', safetyStockDays = 2 } = options;

    const poItems = [];
    let totalAmount = 0;

    forecast.forEach(dailyForecast => {
      dailyForecast.items.forEach(item => {
        let orderQty = item.totalQty;

        if (quantity === 'stock_adjusted') {
          const available = this.getStockLevel(supplierId, item.productId);
          orderQty = Math.max(0, item.totalQty - available);
        } else if (quantity === 'safety_stock') {
          const available = this.getStockLevel(supplierId, item.productId);
          const buffer = item.totalQty * safetyStockDays;
          orderQty = Math.max(0, (item.totalQty + buffer) - available);
        }

        if (orderQty > 0) {
          const existingItem = poItems.find(i => i.productId === item.productId);

          if (existingItem) {
            existingItem.orderQty += orderQty;
          } else {
            poItems.push({
              productId: item.productId,
              name: item.name,
              brand: item.brand,
              unit: item.unit,
              forecasted: item.totalQty,
              available: this.getStockLevel(supplierId, item.productId),
              orderQty,
              unitPrice: 100, // Placeholder - would come from supplier data
              totalPrice: orderQty * 100
            });

            totalAmount += orderQty * 100;
          }
        }
      });
    });

    const po = {
      poId: this.generateId(),
      supplierId,
      createdAt: new Date().toISOString(),
      items: poItems,
      totalQty: poItems.reduce((sum, i) => sum + i.orderQty, 0),
      totalAmount,
      status: 'draft', // draft, confirmed, shipped, delivered
      generatedFrom: 'forecast',
      approvalRequired: totalAmount > 10000, // Threshold for approval
      approvals: [],
      notes: ''
    };

    this.state.autoOrders.push(po);
    this.saveState();

    return po;
  }

  /**
   * Confirm purchase order
   * @param {string} poId - Purchase order ID
   * @param {string} supplierId - Supplier ID
   * @param {string} confirmedBy - User confirming
   */
  confirmOrder(poId, supplierId, confirmedBy) {
    const po = this.state.autoOrders.find(o => o.poId === poId);
    if (!po) return;

    po.status = 'confirmed';
    po.confirmedAt = new Date().toISOString();
    po.confirmedBy = confirmedBy;
    po.approvals.push({
      approvedBy: confirmedBy,
      approvedAt: new Date().toISOString(),
      role: 'supplier'
    });

    this.saveState();
  }

  /**
   * Get pending purchase orders
   * @param {string} supplierId - Optional filter by supplier
   * @returns {array} Pending orders
   */
  getPendingOrders(supplierId = null) {
    let orders = this.state.autoOrders.filter(o => o.status === 'draft' || o.status === 'pending');
    if (supplierId) {
      orders = orders.filter(o => o.supplierId === supplierId);
    }
    return orders;
  }

  /**
   * Get order history
   * @param {string} supplierId - Supplier ID
   * @param {number} days - Days to look back
   * @returns {array} Orders in period
   */
  getOrderHistory(supplierId, days = 30) {
    const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;
    return this.state.autoOrders.filter(o =>
      o.supplierId === supplierId &&
      new Date(o.createdAt).getTime() >= cutoff
    );
  }

  /**
   * ACCURACY TRACKING
   */

  /**
   * Record forecast accuracy
   * @param {string} forecastId - Forecast ID
   * @param {number} forecasted - Forecasted quantity
   * @param {number} actual - Actual quantity
   */
  recordForecastAccuracy(forecastId, forecasted, actual) {
    const accuracy = {
      forecastId,
      forecasted,
      actual,
      error: actual - forecasted,
      errorPercentage: forecasted > 0 ? ((actual - forecasted) / forecasted) * 100 : 0,
      recordedAt: new Date().toISOString()
    };

    if (!this.state.accuracy[forecastId]) {
      this.state.accuracy[forecastId] = [];
    }

    this.state.accuracy[forecastId].push(accuracy);
    this.saveState();

    return accuracy;
  }

  /**
   * Get forecast accuracy metrics
   * @returns {object} Accuracy statistics
   */
  getAccuracyMetrics() {
    const allAccuracy = Object.values(this.state.accuracy).flat();

    if (allAccuracy.length === 0) {
      return {
        totalForecasts: 0,
        averageError: 0,
        averageErrorPercentage: 0,
        accuracy: 0
      };
    }

    const avgError = allAccuracy.reduce((sum, a) => sum + Math.abs(a.error), 0) / allAccuracy.length;
    const avgErrorPct = allAccuracy.reduce((sum, a) => sum + Math.abs(a.errorPercentage), 0) / allAccuracy.length;

    return {
      totalForecasts: allAccuracy.length,
      averageError: Math.round(avgError),
      averageErrorPercentage: Math.round(avgErrorPct * 10) / 10,
      accuracy: Math.round((100 - avgErrorPct) * 10) / 10
    };
  }

  /**
   * DASHBOARD & ANALYTICS
   */

  /**
   * Get supplier dashboard
   * @param {string} supplierId - Supplier ID
   * @returns {object} Dashboard data
   */
  getSupplierDashboard(supplierId) {
    const forecasts = this.state.forecasts[supplierId] || [];
    const latestForecast = forecasts[forecasts.length - 1];
    const pendingOrders = this.getPendingOrders(supplierId);
    const recentOrders = this.getOrderHistory(supplierId, 30);

    return {
      supplierId,
      latestForecast: latestForecast ? {
        forecastDays: latestForecast.forecastDays,
        totalQty: latestForecast.totalQty,
        totalItems: latestForecast.totalItems,
        generatedAt: latestForecast.generatedAt,
        stockStatus: latestForecast.stockStatus,
        insights: latestForecast.insights
      } : null,
      pendingOrders: {
        count: pendingOrders.length,
        totalQty: pendingOrders.reduce((sum, o) => sum + o.totalQty, 0),
        totalAmount: pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0)
      },
      recentOrdersCount: recentOrders.length,
      stockLevels: this.state.stockLevels[supplierId] || {},
      accuracy: this.getAccuracyMetrics()
    };
  }

  /**
   * Get demand summary by product
   * @param {array} forecasts - Forecast data
   * @returns {array} Top products by demand
   */
  getDemandSummary(forecasts) {
    const productDemand = {};

    forecasts.forEach(dailyForecast => {
      dailyForecast.items.forEach(item => {
        if (!productDemand[item.productId]) {
          productDemand[item.productId] = {
            productId: item.productId,
            name: item.name,
            brand: item.brand,
            totalDemand: 0,
            occurrences: 0
          };
        }

        productDemand[item.productId].totalDemand += item.totalQty;
        productDemand[item.productId].occurrences++;
      });
    });

    return Object.values(productDemand)
      .sort((a, b) => b.totalDemand - a.totalDemand)
      .slice(0, 20); // Top 20
  }

  /**
   * UTILITY METHODS
   */

  formatDateKey(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  generateId() {
    return 'PO_' + Math.random().toString(36).substring(2, 15).toUpperCase();
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.EarlyBirdDemandForecast = EarlyBirdDemandForecast;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EarlyBirdDemandForecast;
}
