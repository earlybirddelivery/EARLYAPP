import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { delivery } from '../utils/api';
import { toast } from 'sonner';
import { MapPin, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const DeliveryDashboard = () => {
  const [todayRoute, setTodayRoute] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [routeRes, summaryRes] = await Promise.all([
        delivery.getTodayRoute().catch(() => ({ data: null })),
        delivery.getTodaySummary(),
      ]);
      setTodayRoute(routeRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const markDelivered = async (orderId) => {
    try {
      await delivery.updateDelivery({
        order_id: orderId,
        status: 'delivered',
      });
      toast.success('Delivery marked as completed');
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="delivery-dashboard">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Today's Deliveries</h1>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <MapPin className="h-8 w-8 text-blue-600 mb-2" />
                <div className="text-2xl font-bold">{summary.total_deliveries}</div>
                <p className="text-sm text-gray-600">Total Stops</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                <div className="text-2xl font-bold">{summary.delivered}</div>
                <p className="text-sm text-gray-600">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Clock className="h-8 w-8 text-orange-600 mb-2" />
                <div className="text-2xl font-bold">{summary.pending}</div>
                <p className="text-sm text-gray-600">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                <div className="text-2xl font-bold">₹{summary.cash_collected}</div>
                <p className="text-sm text-gray-600">Cash Collected</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && !todayRoute && (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Route Assigned</h3>
              <p className="text-gray-600">You don't have any deliveries assigned for today.</p>
            </CardContent>
          </Card>
        )}

        {todayRoute && (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Delivery Route</span>
                <div className="text-sm font-normal text-gray-600">
                  {todayRoute.total_distance_km} km • {todayRoute.estimated_duration_mins} mins
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayRoute.stops.map((stop, idx) => (
                  <div 
                    key={stop.order_id} 
                    className="flex items-start p-4 bg-gray-50 rounded-lg"
                    data-testid={`delivery-stop-${idx}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                      {stop.sequence}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{stop.customer_name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{stop.address}</p>
                      <div className="flex flex-wrap gap-2">
                        {stop.items.map((item, i) => (
                          <span key={i} className="text-xs bg-white px-2 py-1 rounded border">
                            {item.product_name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {stop.status === 'delivered' ? (
                        <span className="badge badge-success">Delivered</span>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => markDelivered(stop.order_id)}
                          data-testid={`mark-delivered-${stop.order_id}`}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
