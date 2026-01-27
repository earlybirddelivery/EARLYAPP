import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  User, Phone, MapPin, Calendar, Package, Pause, Play,
  Edit2, Plus, Clock, DollarSign, AlertCircle, X
} from 'lucide-react';
import { toast } from 'sonner';
import { CustomerCalendar } from './CustomerCalendar';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Reusable Customer Details Modal
 * Shows customer information, subscriptions, and allows editing
 * Can be used from DeliveryListGenerator, CustomerManagement, or anywhere else
 */
export function CustomerDetailsModal({ customerId, customerName, onClose, open }) {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (open && customerId) {
      loadCustomerData();
    }
  }, [customerId, open]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load customer details
      const customerRes = await fetch(`${API_URL}/api/phase0-v2/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!customerRes.ok) throw new Error('Failed to load customer');
      const customerData = await customerRes.json();
      setCustomer(customerData);

      // Load subscriptions
      const subsRes = await fetch(`${API_URL}/api/phase0-v2/subscriptions?customer_id=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!subsRes.ok) throw new Error('Failed to load subscriptions');
      const subsData = await subsRes.json();
      setSubscriptions(subsData);

    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (subscriptionId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update subscription status');

      toast.success('Subscription status updated');
      loadCustomerData(); // Reload data
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription status');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      stopped: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700'
    };
    return styles[status] || styles.draft;
  };

  const getModeLabel = (subscription) => {
    if (subscription.mode === 'fixed_daily') return 'Daily';
    if (subscription.mode === 'weekly_pattern') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const pattern = subscription.weekly_pattern?.map(d => days[d]).join(', ') || '';
      return `Weekly: ${pattern}`;
    }
    if (subscription.mode === 'day_by_day') return 'Day by Day';
    if (subscription.mode === 'irregular') return 'Irregular';
    return subscription.mode;
  };

  if (showCalendar && customer) {
    return (
      <CustomerCalendar
        customer={customer}
        onClose={() => {
          setShowCalendar(false);
          loadCustomerData(); // Reload on close
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {customerName || 'Customer Details'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            View and manage customer information and subscriptions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customer details...</p>
          </div>
        ) : customer ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Customer Details</TabsTrigger>
              <TabsTrigger value="subscriptions">
                Subscriptions ({subscriptions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Name</div>
                      <div className="font-medium">{customer.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="font-medium">{customer.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Area</div>
                      <div className="font-medium">{customer.area}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Address</div>
                      <div className="font-medium">{customer.address}</div>
                    </div>
                  </div>
                  {customer.notes && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <div className="text-sm text-gray-500">Notes</div>
                        <div className="font-medium">{customer.notes}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500">Status:</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadge(customer.status)}`}>
                      {customer.status}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setShowCalendar(true)}
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Delivery Calendar
              </Button>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4 mt-4">
              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No subscriptions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <Card key={sub.id} className="relative">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <Package className="h-5 w-5 text-blue-600 mt-1" />
                            <div>
                              <h3 className="font-semibold text-lg">{sub.product_name}</h3>
                              <div className="text-sm text-gray-600 mt-1">
                                {getModeLabel(sub)}
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-500">Default Quantity</div>
                            <div className="font-medium">{sub.default_qty} packets</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Price per Unit</div>
                            <div className="font-medium">₹{sub.price_per_unit}</div>
                          </div>
                        </div>

                        {sub.pause_start && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                            <div className="flex items-center gap-2 text-yellow-800 text-sm">
                              <Pause className="h-4 w-4" />
                              <span>
                                Paused: {new Date(sub.pause_start).toLocaleDateString()}
                                {sub.pause_end && ` - ${new Date(sub.pause_end).toLocaleDateString()}`}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {sub.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(sub.id, 'paused')}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          )}
                          {sub.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(sub.id, 'active')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          {(sub.status === 'active' || sub.status === 'paused') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(sub.id, 'stopped')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Stop
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCalendar(true)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                onClick={() => setShowCalendar(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Subscription
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-12 text-center text-gray-600">
            No customer data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
