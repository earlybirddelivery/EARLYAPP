import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Label } from '../components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.jsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs.jsx';
import { Plus, Edit2, Trash2, Users, LogOut, MapPin, Check } from 'lucide-react';
import { logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export function MarketingStaffV2() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [trialCustomers, setTrialCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerForSub, setSelectedCustomerForSub] = useState(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    map_link: '',
    notes: '',
    location: null
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    customer_id: '',
    product_id: '',
    price_per_unit: 60,
    mode: 'fixed_daily',
    default_qty: 1.0,
    weekly_pattern: [],
    pause_start: '',
    pause_end: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, trialRes, subsRes, productsRes, areasRes] = await Promise.all([
        api.get('/phase0-v2/customers?status=active'),
        api.get('/phase0-v2/customers?status=trial'),
        api.get('/phase0-v2/subscriptions'),
        api.get('/phase0-v2/products'),
        api.get('/phase0-v2/areas')
      ]);
      setCustomers(customersRes.data);
      setTrialCustomers(trialRes.data);
      setSubscriptions(subsRes.data);
      setProducts(productsRes.data);
      setAreas(areasRes.data.areas);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const captureGPSLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_meters: position.coords.accuracy
        };
        setCustomerForm(prev => ({ ...prev, location }));
        toast.success(`Location captured: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        setCapturingLocation(false);
      },
      (error) => {
        toast.error(`Failed to capture location: ${error.message}`);
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingCustomer) {
        await api.put(`/phase0-v2/customers/${editingCustomer.id}`, customerForm);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/phase0-v2/customers', {
          ...customerForm,
          status: 'trial'
        });
        toast.success('Customer added as trial');
      }
      
      resetCustomerForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmTrialCustomer = async (customerId) => {
    try {
      await api.post('/phase0-v2/customers/confirm', { customer_id: customerId });
      toast.success('Customer confirmed to active');
      fetchData();
    } catch (error) {
      toast.error('Failed to confirm customer');
    }
  };

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const payload = {
        customer_id: subscriptionForm.customer_id,
        product_id: subscriptionForm.product_id,
        price_per_unit: parseFloat(subscriptionForm.price_per_unit),
        mode: subscriptionForm.mode,
        default_qty: parseFloat(subscriptionForm.default_qty),
        weekly_pattern: subscriptionForm.mode === 'weekly_pattern' ? subscriptionForm.weekly_pattern : null,
        day_overrides: [],
        irregular_list: [],
        pause_intervals: subscriptionForm.pause_start && subscriptionForm.pause_end ? [
          { start: subscriptionForm.pause_start, end: subscriptionForm.pause_end }
        ] : [],
        stop_date: null
      };
      
      await api.post('/phase0-v2/subscriptions', payload);
      toast.success('Subscription added successfully');
      
      resetSubscriptionForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to add subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: '', phone: '', address: '', area: '', map_link: '', notes: '', location: null
    });
    setEditingCustomer(null);
    setShowCustomerForm(false);
  };

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      customer_id: '', product_id: '', price_per_unit: 60, mode: 'fixed_daily',
      default_qty: 1.0, weekly_pattern: [], pause_start: '', pause_end: ''
    });
    setSelectedCustomerForSub(null);
    setShowSubscriptionForm(false);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      area: customer.area,
      map_link: customer.map_link || '',
      notes: customer.notes || '',
      location: customer.location
    });
    setShowCustomerForm(true);
  };

  const handleAddSubscription = (customer) => {
    setSelectedCustomerForSub(customer);
    setSubscriptionForm(prev => ({ ...prev, customer_id: customer.id }));
    setShowSubscriptionForm(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Marketing Staff</h1>
                <p className="text-sm text-gray-500">Manage customers and subscriptions</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="customers">
          <TabsList className="mb-6">
            <TabsTrigger value="customers">Active Customers</TabsTrigger>
            <TabsTrigger value="trial">Trial Customers ({trialCustomers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            {!showCustomerForm && !showSubscriptionForm && (
              <div className="mb-6">
                <Button onClick={() => setShowCustomerForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Customer
                </Button>
              </div>
            )}

            {showCustomerForm && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
                  <CardDescription>Customer will be added in trial status</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Customer Name *</Label>
                        <Input value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} required />
                      </div>
                      <div>
                        <Label>Phone *</Label>
                        <Input value={customerForm.phone} onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})} required />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Address *</Label>
                        <Textarea value={customerForm.address} onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})} required />
                      </div>
                      <div>
                        <Label>Area *</Label>
                        <Select value={customerForm.area} onValueChange={(val) => setCustomerForm({...customerForm, area: val})} required>
                          <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                          <SelectContent>
                            {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            <SelectItem value="Koramangala">Koramangala</SelectItem>
                            <SelectItem value="Indiranagar">Indiranagar</SelectItem>
                            <SelectItem value="Whitefield">Whitefield</SelectItem>
                            <SelectItem value="HSR Layout">HSR Layout</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Map Link</Label>
                        <Input value={customerForm.map_link} onChange={(e) => setCustomerForm({...customerForm, map_link: e.target.value})} placeholder="https://goo.gl/maps/..." />
                      </div>
                      <div className="md:col-span-2">
                        <Label>GPS Location</Label>
                        <div className="flex gap-2">
                          <Button type="button" onClick={captureGPSLocation} disabled={capturingLocation} variant="outline" className="gap-2">
                            <MapPin className="h-4 w-4" />
                            {capturingLocation ? 'Capturing...' : 'Capture Location'}
                          </Button>
                          {customerForm.location && (
                            <div className="text-sm text-gray-600 flex items-center">
                              ✓ Location: {customerForm.location.lat.toFixed(6)}, {customerForm.location.lng.toFixed(6)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Notes</Label>
                        <Textarea value={customerForm.notes} onChange={(e) => setCustomerForm({...customerForm, notes: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Add Customer')}</Button>
                      <Button type="button" variant="outline" onClick={resetCustomerForm}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {showSubscriptionForm && selectedCustomerForSub && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Add Subscription for {selectedCustomerForSub.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubscriptionSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Product *</Label>
                        <Select value={subscriptionForm.product_id} onValueChange={(val) => {
                          const product = products.find(p => p.id === val);
                          setSubscriptionForm({...subscriptionForm, product_id: val, price_per_unit: product?.default_price || 60});
                        }} required>
                          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.default_price}/{p.unit})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Price per Unit *</Label>
                        <Input type="number" step="0.01" value={subscriptionForm.price_per_unit} onChange={(e) => setSubscriptionForm({...subscriptionForm, price_per_unit: e.target.value})} required />
                      </div>
                      <div>
                        <Label>Subscription Mode *</Label>
                        <Select value={subscriptionForm.mode} onValueChange={(val) => setSubscriptionForm({...subscriptionForm, mode: val})} required>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed_daily">Fixed Daily</SelectItem>
                            <SelectItem value="weekly_pattern">Weekly Pattern</SelectItem>
                            <SelectItem value="day_by_day">Day by Day</SelectItem>
                            <SelectItem value="irregular">Irregular</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Default Quantity *</Label>
                        <Input type="number" step="0.5" min="0.5" value={subscriptionForm.default_qty} onChange={(e) => setSubscriptionForm({...subscriptionForm, default_qty: e.target.value})} required />
                      </div>
                      {subscriptionForm.mode === 'weekly_pattern' && (
                        <div className="md:col-span-2">
                          <Label>Select Days (Mon=0, Sun=6)</Label>
                          <Input placeholder="e.g., 0,2,4 for Mon, Wed, Fri" onChange={(e) => {
                            const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                            setSubscriptionForm({...subscriptionForm, weekly_pattern: days});
                          }} />
                        </div>
                      )}
                      <div>
                        <Label>Pause Start (Optional)</Label>
                        <Input type="date" value={subscriptionForm.pause_start} onChange={(e) => setSubscriptionForm({...subscriptionForm, pause_start: e.target.value})} />
                      </div>
                      <div>
                        <Label>Pause End (Optional)</Label>
                        <Input type="date" value={subscriptionForm.pause_end} onChange={(e) => setSubscriptionForm({...subscriptionForm, pause_end: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Subscription'}</Button>
                      <Button type="button" variant="outline" onClick={resetSubscriptionForm}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Active Customers ({customers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No active customers yet</div>
                ) : (
                  <div className="space-y-4">
                    {customers.map(customer => {
                      const customerSubs = subscriptions.filter(s => s.customer_id === customer.id);
                      return (
                        <div key={customer.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{customer.name}</h3>
                              <p className="text-sm text-gray-600">{customer.phone}</p>
                              <p className="text-sm text-gray-600 mt-1">{customer.address}</p>
                              <div className="flex gap-4 mt-2">
                                <span className="text-sm"><strong>Area:</strong> {customer.area}</span>
                                <span className="text-sm"><strong>Subscriptions:</strong> {customerSubs.length}</span>
                              </div>
                              {customer.location && (
                                <p className="text-xs text-gray-500 mt-1">📍 {customer.location.lat.toFixed(6)}, {customer.location.lng.toFixed(6)}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" onClick={() => handleAddSubscription(customer)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trial">
            <Card>
              <CardHeader>
                <CardTitle>Trial Customers ({trialCustomers.length})</CardTitle>
                <CardDescription>Confirm trial customers to activate them</CardDescription>
              </CardHeader>
              <CardContent>
                {trialCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No trial customers</div>
                ) : (
                  <div className="space-y-4">
                    {trialCustomers.map(customer => (
                      <div key={customer.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{customer.name}</h3>
                            <p className="text-sm text-gray-600">{customer.phone}</p>
                            <p className="text-sm text-gray-600 mt-1">{customer.address}</p>
                            <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">TRIAL</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => confirmTrialCustomer(customer.id)} className="gap-2">
                              <Check className="h-4 w-4" />
                              Confirm to Active
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
