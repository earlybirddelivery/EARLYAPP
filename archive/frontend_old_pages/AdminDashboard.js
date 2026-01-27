import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { admin } from '../utils/api';
import { toast } from 'sonner';
import { Users, Package, Truck, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [deliveryBoyStats, setDeliveryBoyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, deliveryRes] = await Promise.all([
        admin.getDashboardStats(),
        admin.getDeliveryBoyStats(),
      ]);
      setStats(statsRes.data);
      setDeliveryBoyStats(deliveryRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { icon: Users, label: 'Total Customers', value: stats.total_customers, color: 'text-blue-600' },
    { icon: Package, label: 'Active Subscriptions', value: stats.active_subscriptions, color: 'text-green-600' },
    { icon: ShoppingCart, label: "Today's Deliveries", value: stats.today_deliveries, color: 'text-purple-600' },
    { icon: Truck, label: 'Pending Deliveries', value: stats.pending_deliveries, color: 'text-orange-600' },
    { icon: DollarSign, label: 'Monthly Revenue', value: `₹${stats.monthly_revenue.toLocaleString()}`, color: 'text-green-600' },
    { icon: TrendingUp, label: 'Total Revenue', value: `₹${stats.total_revenue.toLocaleString()}`, color: 'text-indigo-600' },
  ] : [];

  const quickActions = [
    { label: 'Manage Users', path: '/admin/users' },
    { label: 'Products', path: '/admin/products' },
    { label: 'Generate Routes', path: '/admin/routes' },
    { label: 'Procurement', path: '/admin/procurement' },
    { label: 'Reports', path: '/admin/reports' },
    { label: 'Suppliers', path: '/admin/suppliers' },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Complete system overview and management</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                    <CardContent className="p-4">
                      <Icon className={`h-8 w-8 ${stat.color} mb-2`} />
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-20 text-lg"
                  onClick={() => navigate(action.path)}
                  data-testid={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}
                >
                  {action.label}
                </Button>
              ))}
            </div>

            {deliveryBoyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Boy Performance - Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full data-table" data-testid="delivery-boy-stats-table">
                      <thead>
                        <tr>
                          <th className="text-left p-3">Name</th>
                          <th className="text-center p-3">Total</th>
                          <th className="text-center p-3">Completed</th>
                          <th className="text-center p-3">Pending</th>
                          <th className="text-right p-3">Cash Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryBoyStats.map((boy) => (
                          <tr key={boy.delivery_boy_id} data-testid={`delivery-boy-row-${boy.delivery_boy_id}`}>
                            <td className="p-3 font-medium">{boy.name}</td>
                            <td className="text-center p-3">{boy.today_deliveries}</td>
                            <td className="text-center p-3 text-green-600">{boy.completed}</td>
                            <td className="text-center p-3 text-orange-600">{boy.pending}</td>
                            <td className="text-right p-3 font-semibold">₹{boy.cash_collected}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};
