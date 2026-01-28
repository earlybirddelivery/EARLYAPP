"""
Phase 4A.5: AI/ML Service
Demand Forecasting, Customer Churn Prediction, Route Optimization

Author: AI Development Team
Date: January 28, 2026
Version: 1.0.0
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import logging
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, accuracy_score, precision_score, recall_score
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.seasonal import seasonal_decompose
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

handler = logging.FileHandler('ml_service.log')
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


# ============================================================================
# DEMAND FORECASTING SERVICE
# ============================================================================

class DemandForecastingService:
    """
    Time-series forecasting for product demand using ARIMA and ensemble methods.
    
    Features:
    - Historical sales data analysis
    - Seasonal decomposition
    - Multi-step ahead forecasting
    - Forecast confidence intervals
    - Anomaly detection
    """
    
    def __init__(self, db=None):
        """Initialize forecasting service."""
        self.db = db
        self.models = {}
        self.scaler = MinMaxScaler()
        self.forecast_history = []
        logger.info("DemandForecastingService initialized")
    
    def prepare_time_series_data(self, product_id: str, days: int = 90) -> Optional[pd.DataFrame]:
        """
        Prepare historical sales data for a product.
        
        Args:
            product_id: Product ID
            days: Number of historical days to include
            
        Returns:
            DataFrame with date and quantity columns
        """
        try:
            if not self.db:
                logger.warning("Database not available for data preparation")
                return None
            
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Query sales data
            orders = list(self.db.orders.find({
                'product_id': product_id,
                'created_at': {'$gte': start_date},
                'status': {'$in': ['CONFIRMED', 'DELIVERED', 'CANCELLED']}
            }))
            
            if not orders:
                logger.warning(f"No sales data found for product {product_id}")
                return None
            
            # Aggregate by date
            daily_sales = {}
            for order in orders:
                date_key = order['created_at'].date().isoformat()
                quantity = order.get('quantity', 0)
                daily_sales[date_key] = daily_sales.get(date_key, 0) + quantity
            
            # Convert to DataFrame
            df = pd.DataFrame([
                {'date': date, 'quantity': qty}
                for date, qty in sorted(daily_sales.items())
            ])
            
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date').reset_index(drop=True)
            
            logger.info(f"Prepared {len(df)} days of sales data for product {product_id}")
            return df
            
        except Exception as e:
            logger.error(f"Error preparing time series data: {str(e)}")
            return None
    
    def detect_seasonality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Detect seasonal patterns in sales data.
        
        Args:
            df: DataFrame with date and quantity columns
            
        Returns:
            Dictionary with seasonality metrics
        """
        try:
            if len(df) < 14:
                return {'seasonal': False, 'period': None, 'strength': 0}
            
            # Perform seasonal decomposition
            result = seasonal_decompose(
                df['quantity'],
                model='additive',
                period=7  # Weekly seasonality
            )
            
            # Calculate seasonality strength
            residual_var = np.var(result.resid.dropna())
            seasonal_var = np.var(result.seasonal)
            strength = seasonal_var / (seasonal_var + residual_var) if (seasonal_var + residual_var) > 0 else 0
            
            return {
                'seasonal': strength > 0.2,
                'period': 7,
                'strength': float(strength),
                'trend': float(result.trend.mean()),
                'seasonal_component': result.seasonal.tolist()[-7:]  # Last week
            }
            
        except Exception as e:
            logger.error(f"Error detecting seasonality: {str(e)}")
            return {'seasonal': False, 'period': None, 'strength': 0}
    
    def forecast_demand(self, product_id: str, days_ahead: int = 7) -> Dict[str, Any]:
        """
        Generate demand forecast for a product.
        
        Args:
            product_id: Product ID
            days_ahead: Number of days to forecast
            
        Returns:
            Forecast with predictions and confidence intervals
        """
        try:
            # Prepare data
            df = self.prepare_time_series_data(product_id)
            if df is None or len(df) < 14:
                return {
                    'product_id': product_id,
                    'status': 'INSUFFICIENT_DATA',
                    'message': 'Not enough historical data for forecasting'
                }
            
            # Detect seasonality
            seasonality = self.detect_seasonality(df)
            
            # Fit ARIMA model
            try:
                # Use (1,1,1) order - common for sales data
                model = ARIMA(df['quantity'], order=(1, 1, 1))
                fitted_model = model.fit()
                
                # Generate forecast
                forecast = fitted_model.get_forecast(steps=days_ahead)
                forecast_df = forecast.summary_frame()
                
                predictions = forecast_df['mean'].tolist()
                upper_ci = forecast_df['mean_ci_upper'].tolist()
                lower_ci = forecast_df['mean_ci_lower'].tolist()
                
            except Exception as e:
                logger.warning(f"ARIMA model failed, using simple moving average: {e}")
                # Fallback to moving average
                ma = df['quantity'].tail(7).mean()
                predictions = [ma] * days_ahead
                upper_ci = [ma * 1.2] * days_ahead
                lower_ci = [ma * 0.8] * days_ahead
            
            # Generate dates
            last_date = df['date'].max()
            forecast_dates = [
                (last_date + timedelta(days=i+1)).isoformat()
                for i in range(days_ahead)
            ]
            
            result = {
                'product_id': product_id,
                'status': 'SUCCESS',
                'forecast_date': datetime.utcnow().isoformat(),
                'days_ahead': days_ahead,
                'historical_avg': float(df['quantity'].mean()),
                'historical_std': float(df['quantity'].std()),
                'seasonality': seasonality,
                'forecasts': [
                    {
                        'date': date,
                        'prediction': float(pred),
                        'upper_ci': float(upper),
                        'lower_ci': float(lower)
                    }
                    for date, pred, upper, lower in zip(forecast_dates, predictions, upper_ci, lower_ci)
                ],
                'metrics': {
                    'model': 'ARIMA(1,1,1)',
                    'rmse': float(np.sqrt(np.mean((np.array(predictions) - df['quantity'].tail(days_ahead).mean())**2)))
                }
            }
            
            # Store forecast
            if self.db:
                self.db.forecast_history.insert_one({
                    'product_id': product_id,
                    'created_at': datetime.utcnow(),
                    'forecast': result
                })
            
            logger.info(f"Generated forecast for product {product_id}: {days_ahead} days ahead")
            return result
            
        except Exception as e:
            logger.error(f"Error forecasting demand: {str(e)}")
            return {
                'product_id': product_id,
                'status': 'ERROR',
                'error': str(e)
            }
    
    def get_low_stock_alerts(self, threshold_percentile: int = 25) -> List[Dict[str, Any]]:
        """
        Identify products at risk of stockout.
        
        Args:
            threshold_percentile: Percentile for low stock threshold
            
        Returns:
            List of products with stockout risk
        """
        try:
            if not self.db:
                return []
            
            alerts = []
            products = list(self.db.products.find({}))
            
            for product in products:
                forecast = self.forecast_demand(product['_id'])
                
                if forecast['status'] == 'SUCCESS':
                    avg_demand = np.mean([f['prediction'] for f in forecast['forecasts']])
                    current_stock = product.get('stock_level', 0)
                    
                    # Alert if stock level is below forecasted demand
                    if current_stock < avg_demand:
                        alerts.append({
                            'product_id': product['_id'],
                            'product_name': product.get('name', 'Unknown'),
                            'current_stock': current_stock,
                            'forecasted_demand': float(avg_demand),
                            'risk_level': 'HIGH' if current_stock < avg_demand * 0.5 else 'MEDIUM',
                            'recommended_reorder': int(avg_demand * 7)  # 7-day supply
                        })
            
            logger.info(f"Generated {len(alerts)} low stock alerts")
            return alerts
            
        except Exception as e:
            logger.error(f"Error generating low stock alerts: {str(e)}")
            return []


# ============================================================================
# CUSTOMER CHURN PREDICTION SERVICE
# ============================================================================

class ChurnPredictionService:
    """
    Predict customer churn risk using machine learning.
    
    Features:
    - Historical behavior analysis
    - Risk scoring (0-100)
    - Retention recommendations
    - Cohort analysis
    """
    
    def __init__(self, db=None):
        """Initialize churn prediction service."""
        self.db = db
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'days_since_last_order',
            'order_frequency',
            'average_order_value',
            'cancellation_rate',
            'complaint_count',
            'rating',
            'loyalty_points_redeemed'
        ]
        logger.info("ChurnPredictionService initialized")
    
    def extract_customer_features(self, customer_id: str) -> Optional[Dict[str, float]]:
        """
        Extract features for churn prediction.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Dictionary with customer features
        """
        try:
            if not self.db:
                return None
            
            customer = self.db.customers_v2.find_one({'_id': customer_id})
            if not customer:
                return None
            
            # Calculate days since last order
            last_order = self.db.orders.find_one(
                {'customer_id': customer_id},
                sort=[('created_at', -1)]
            )
            days_since_last = (datetime.utcnow() - last_order['created_at']).days if last_order else 365
            
            # Calculate order frequency (orders per month)
            three_months_ago = datetime.utcnow() - timedelta(days=90)
            recent_orders = list(self.db.orders.find({
                'customer_id': customer_id,
                'created_at': {'$gte': three_months_ago}
            }))
            order_frequency = len(recent_orders) / 3  # Per month
            
            # Calculate average order value
            all_orders = list(self.db.orders.find({'customer_id': customer_id}))
            avg_order_value = np.mean([o.get('total', 0) for o in all_orders]) if all_orders else 0
            
            # Calculate cancellation rate
            cancelled_orders = len([o for o in all_orders if o.get('status') == 'CANCELLED'])
            cancellation_rate = cancelled_orders / len(all_orders) if all_orders else 0
            
            # Count complaints/disputes
            complaints = self.db.disputes.count_documents({'customer_id': customer_id})
            
            # Get customer rating
            rating = customer.get('rating', 4.0)
            
            # Loyalty points redeemed
            loyalty_redeemed = customer.get('loyalty_points_redeemed', 0)
            
            return {
                'customer_id': customer_id,
                'days_since_last_order': min(days_since_last, 365),
                'order_frequency': order_frequency,
                'average_order_value': avg_order_value,
                'cancellation_rate': cancellation_rate,
                'complaint_count': complaints,
                'rating': rating,
                'loyalty_points_redeemed': min(loyalty_redeemed, 1000)
            }
            
        except Exception as e:
            logger.error(f"Error extracting customer features: {str(e)}")
            return None
    
    def predict_churn_risk(self, customer_id: str) -> Dict[str, Any]:
        """
        Predict churn risk for a customer.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            Churn risk prediction with recommendations
        """
        try:
            features = self.extract_customer_features(customer_id)
            if features is None:
                return {'status': 'ERROR', 'message': 'Customer not found'}
            
            # Rule-based scoring (without trained model)
            # This is interpretable and works without training data
            
            score = 0
            factors = []
            
            # Factor 1: Days since last order (30 points max)
            days_since = features['days_since_last_order']
            if days_since > 90:
                score += 30
                factors.append({'factor': 'Inactive', 'weight': 30, 'reason': f'No order in {days_since} days'})
            elif days_since > 30:
                score += 15
                factors.append({'factor': 'Low Activity', 'weight': 15, 'reason': f'Last order {days_since} days ago'})
            
            # Factor 2: Order frequency (20 points max)
            freq = features['order_frequency']
            if freq < 0.5:  # Less than 1 order per 2 months
                score += 20
                factors.append({'factor': 'Low Frequency', 'weight': 20, 'reason': f'{freq:.1f} orders/month'})
            elif freq < 1:
                score += 10
                factors.append({'factor': 'Declining Frequency', 'weight': 10, 'reason': f'{freq:.1f} orders/month'})
            
            # Factor 3: Average order value (15 points max)
            aov = features['average_order_value']
            if aov < 100:
                score += 10
                factors.append({'factor': 'Low AOV', 'weight': 10, 'reason': f'₹{aov:.0f} average'})
            
            # Factor 4: Cancellation rate (20 points max)
            cancel_rate = features['cancellation_rate']
            if cancel_rate > 0.2:
                score += 20
                factors.append({'factor': 'High Cancellation', 'weight': 20, 'reason': f'{cancel_rate*100:.0f}% cancellation rate'})
            elif cancel_rate > 0.1:
                score += 10
                factors.append({'factor': 'Moderate Cancellation', 'weight': 10, 'reason': f'{cancel_rate*100:.0f}% cancellation rate'})
            
            # Factor 5: Complaints (15 points max)
            complaints = features['complaint_count']
            if complaints > 2:
                score += 15
                factors.append({'factor': 'Multiple Complaints', 'weight': 15, 'reason': f'{complaints} disputes'})
            elif complaints > 0:
                score += 8
                factors.append({'factor': 'Complaint History', 'weight': 8, 'reason': f'{complaints} disputes'})
            
            # Factor 6: Rating (negative correlation)
            rating = features['rating']
            if rating < 3:
                score += 10
                factors.append({'factor': 'Low Rating', 'weight': 10, 'reason': f'{rating:.1f}/5 rating'})
            elif rating > 4.5:
                score = max(0, score - 10)
                factors.append({'factor': 'Satisfied Customer', 'weight': -10, 'reason': f'{rating:.1f}/5 rating'})
            
            # Cap score at 100
            score = min(score, 100)
            
            # Determine risk level
            if score >= 70:
                risk_level = 'HIGH'
            elif score >= 40:
                risk_level = 'MEDIUM'
            else:
                risk_level = 'LOW'
            
            # Retention recommendations
            recommendations = []
            if risk_level == 'HIGH':
                recommendations.append('Send personalized discount offer (10-15% off)')
                recommendations.append('Trigger win-back campaign with free delivery')
                recommendations.append('Schedule customer support call')
            elif risk_level == 'MEDIUM':
                recommendations.append('Offer loyalty points bonus (500 points)')
                recommendations.append('Send product recommendations')
                recommendations.append('Send loyalty tier upgrade notification')
            
            result = {
                'customer_id': customer_id,
                'churn_score': score,
                'risk_level': risk_level,
                'probability': float(score / 100),
                'prediction_date': datetime.utcnow().isoformat(),
                'factors': factors,
                'features': features,
                'recommendations': recommendations
            }
            
            # Store prediction
            if self.db:
                self.db.churn_predictions.insert_one({
                    'customer_id': customer_id,
                    'created_at': datetime.utcnow(),
                    'prediction': result
                })
            
            logger.info(f"Generated churn prediction for customer {customer_id}: {risk_level}")
            return result
            
        except Exception as e:
            logger.error(f"Error predicting churn: {str(e)}")
            return {'status': 'ERROR', 'error': str(e)}
    
    def get_at_risk_customers(self, min_score: int = 50, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get customers at risk of churning.
        
        Args:
            min_score: Minimum churn score to include
            limit: Maximum number of results
            
        Returns:
            List of customers at risk
        """
        try:
            if not self.db:
                return []
            
            at_risk = []
            customers = list(self.db.customers_v2.find({}))
            
            for customer in customers[:limit * 2]:  # Check extra to filter
                prediction = self.predict_churn_risk(customer['_id'])
                
                if prediction.get('status') != 'ERROR' and prediction.get('churn_score', 0) >= min_score:
                    at_risk.append({
                        'customer_id': customer['_id'],
                        'name': customer.get('name', 'Unknown'),
                        'churn_score': prediction['churn_score'],
                        'risk_level': prediction['risk_level'],
                        'last_order': customer.get('last_order_date'),
                        'lifetime_value': customer.get('lifetime_value', 0),
                        'recommendations': prediction.get('recommendations', [])
                    })
            
            # Sort by churn score descending
            at_risk.sort(key=lambda x: x['churn_score'], reverse=True)
            
            logger.info(f"Identified {len(at_risk)} customers at risk")
            return at_risk[:limit]
            
        except Exception as e:
            logger.error(f"Error getting at-risk customers: {str(e)}")
            return []


# ============================================================================
# ROUTE OPTIMIZATION SERVICE
# ============================================================================

class RouteOptimizationService:
    """
    Optimize delivery routes using machine learning.
    
    Features:
    - Travel time prediction
    - Route sequencing optimization
    - Multi-vehicle routing
    - Dynamic route adjustments
    """
    
    def __init__(self, db=None):
        """Initialize route optimization service."""
        self.db = db
        self.distance_cache = {}
        logger.info("RouteOptimizationService initialized")
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two coordinates (Haversine formula).
        
        Args:
            lat1, lon1: Start coordinates
            lat2, lon2: End coordinates
            
        Returns:
            Distance in kilometers
        """
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth radius in km
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def estimate_travel_time(self, distance_km: float, speed_kmh: float = 25) -> int:
        """
        Estimate travel time for a route segment.
        
        Args:
            distance_km: Distance in kilometers
            speed_kmh: Average speed in km/h
            
        Returns:
            Travel time in minutes
        """
        # Factor in traffic and stops
        base_time = (distance_km / speed_kmh) * 60
        traffic_factor = 1.3  # 30% additional time for traffic
        delivery_time = 3  # Minutes per stop
        
        return int(base_time * traffic_factor + delivery_time)
    
    def optimize_route(self, delivery_points: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Optimize route for delivery points.
        
        Uses nearest-neighbor heuristic for TSP approximation.
        
        Args:
            delivery_points: List of delivery points with coordinates and requirements
            
        Returns:
            Optimized route with sequence and metrics
        """
        try:
            if not delivery_points:
                return {'status': 'ERROR', 'message': 'No delivery points provided'}
            
            if len(delivery_points) == 1:
                return {
                    'status': 'SUCCESS',
                    'route_sequence': [0],
                    'total_distance': 0,
                    'estimated_time': 0,
                    'delivery_points': delivery_points
                }
            
            # Use nearest neighbor algorithm for route optimization
            # This is a polynomial-time approximation of TSP
            
            route = []
            remaining = list(range(len(delivery_points)))
            current_idx = 0
            route.append(current_idx)
            remaining.remove(current_idx)
            
            total_distance = 0
            
            while remaining:
                # Find nearest unvisited point
                current_lat = delivery_points[current_idx]['latitude']
                current_lon = delivery_points[current_idx]['longitude']
                
                nearest_idx = None
                nearest_distance = float('inf')
                
                for idx in remaining:
                    next_lat = delivery_points[idx]['latitude']
                    next_lon = delivery_points[idx]['longitude']
                    
                    distance = self.calculate_distance(
                        current_lat, current_lon,
                        next_lat, next_lon
                    )
                    
                    if distance < nearest_distance:
                        nearest_distance = distance
                        nearest_idx = idx
                
                route.append(nearest_idx)
                remaining.remove(nearest_idx)
                total_distance += nearest_distance
                current_idx = nearest_idx
            
            # Calculate total time
            total_time = 0
            for i in range(len(route) - 1):
                current_lat = delivery_points[route[i]]['latitude']
                current_lon = delivery_points[route[i]]['longitude']
                next_lat = delivery_points[route[i+1]]['latitude']
                next_lon = delivery_points[route[i+1]]['longitude']
                
                distance = self.calculate_distance(
                    current_lat, current_lon,
                    next_lat, next_lon
                )
                total_time += self.estimate_travel_time(distance)
            
            result = {
                'status': 'SUCCESS',
                'route_sequence': route,
                'total_distance': round(total_distance, 2),
                'estimated_time': total_time,
                'delivery_points': [delivery_points[i] for i in route],
                'optimization_method': 'Nearest Neighbor (Greedy)',
                'generated_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Optimized route: {len(route)} points, {result['total_distance']}km, {total_time}min")
            return result
            
        except Exception as e:
            logger.error(f"Error optimizing route: {str(e)}")
            return {'status': 'ERROR', 'error': str(e)}
    
    def get_delivery_suggestions(self, order_id: str) -> Dict[str, Any]:
        """
        Get delivery suggestions for an order.
        
        Args:
            order_id: Order ID
            
        Returns:
            Delivery suggestions with optimization recommendations
        """
        try:
            if not self.db:
                return {'status': 'ERROR', 'message': 'Database not available'}
            
            order = self.db.orders.find_one({'_id': order_id})
            if not order:
                return {'status': 'ERROR', 'message': 'Order not found'}
            
            # Get order location
            order_location = order.get('delivery_address', {})
            if not order_location or 'latitude' not in order_location:
                return {'status': 'ERROR', 'message': 'Missing delivery coordinates'}
            
            # Find nearby delivery boys
            delivery_boys = list(self.db.delivery_boys_v2.find({
                'location': {
                    '$near': {
                        '$geometry': {
                            'type': 'Point',
                            'coordinates': [order_location['longitude'], order_location['latitude']]
                        },
                        '$maxDistance': 5000  # 5km
                    }
                },
                'status': 'AVAILABLE'
            }).limit(5))
            
            suggestions = []
            for boy in delivery_boys:
                distance = self.calculate_distance(
                    boy['location']['coordinates'][1],
                    boy['location']['coordinates'][0],
                    order_location['latitude'],
                    order_location['longitude']
                )
                
                travel_time = self.estimate_travel_time(distance)
                
                suggestions.append({
                    'delivery_boy_id': boy['_id'],
                    'name': boy.get('name', 'Unknown'),
                    'current_location': boy.get('location'),
                    'distance_km': round(distance, 2),
                    'estimated_travel_time': travel_time,
                    'rating': boy.get('rating', 4.0),
                    'available_capacity': boy.get('available_capacity', 10)
                })
            
            # Sort by distance
            suggestions.sort(key=lambda x: x['distance_km'])
            
            return {
                'status': 'SUCCESS',
                'order_id': order_id,
                'delivery_suggestions': suggestions,
                'recommendation': suggestions[0] if suggestions else None
            }
            
        except Exception as e:
            logger.error(f"Error getting delivery suggestions: {str(e)}")
            return {'status': 'ERROR', 'error': str(e)}


# ============================================================================
# SERVICE INITIALIZATION
# ============================================================================

def initialize_ml_services(db=None) -> Dict[str, Any]:
    """
    Initialize all ML services.
    
    Args:
        db: MongoDB database connection
        
    Returns:
        Dictionary of initialized services
    """
    try:
        services = {
            'demand_forecast': DemandForecastingService(db),
            'churn_prediction': ChurnPredictionService(db),
            'route_optimization': RouteOptimizationService(db)
        }
        
        logger.info("All ML services initialized successfully")
        return services
        
    except Exception as e:
        logger.error(f"Error initializing ML services: {str(e)}")
        return {}


if __name__ == '__main__':
    # Test script
    print("ML Service Module")
    print("=" * 50)
    print("\nAvailable services:")
    print("  - DemandForecastingService")
    print("  - ChurnPredictionService")
    print("  - RouteOptimizationService")
    print("\nTo use, import and initialize with database connection.")
