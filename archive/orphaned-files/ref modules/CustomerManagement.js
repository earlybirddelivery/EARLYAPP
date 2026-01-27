import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog.jsx';
import { Package, Users, LogOut, MapPin, Plus, Edit2, Check, Download, Upload, Camera } from 'lucide-react';
import { logout, getUserRole } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export function CustomerManagement() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', address: '', area: '', map_link: '', notes: '',
    location: null, house_image_url: '', marketing_boy: ''
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    product_id: '', price_per_unit: 60, mode: 'fixed_daily',
    default_qty: 1.0, status: 'draft', auto_start: false, weekly_pattern: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, subsRes, productsRes, areasRes] = await Promise.all([
        api.get('/phase0-v2/customers'),
        api.get('/phase0-v2/subscriptions'),
        api.get('/phase0-v2/products'),
        api.get('/phase0-v2/areas')
      ]);
      setCustomers(customersRes.data);
      setSubscriptions(subsRes.data);
      setProducts(productsRes.data);
      setAreas(areasRes.data.areas);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const captureGPSLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_meters: position.coords.accuracy
        };
        
        if (location.accuracy_meters > 50) {
          toast.warning(`GPS accuracy: ${location.accuracy_meters.toFixed(0)}m. Please enter manually for better accuracy.`);
        } else {
          toast.success(`Location captured with ${location.accuracy_meters.toFixed(0)}m accuracy`);
        }
        
        setCustomerForm(prev => ({ ...prev, location }));
      },
      (error) => {
        toast.error('GPS failed. Please enter manually.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/phase0-v2/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const data = await res.json();
      setCustomerForm(prev => ({ ...prev, house_image_url: data.image_url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await api.post('/phase0-v2/customers', { ...customerForm, status: 'trial' });
      toast.success('Customer saved! Add subscription next.');
      resetCustomerForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = (customer) => {
    setSelectedCustomer(customer);
    setEditingSubscription(null);
    setSubscriptionForm({ 
      product_id: '', price_per_unit: 60, mode: 'fixed_daily', 
      default_qty: 1.0, status: 'draft', auto_start: false, weekly_pattern: []
    });
    setShowSubscriptionDialog(true);
  };

  const handleEditSubscription = (customer, subscription) => {
    setSelectedCustomer(customer);
    setEditingSubscription(subscription);
    setSubscriptionForm({
      product_id: subscription.product_id || '',
      price_per_unit: subscription.price_per_unit || 60,
      mode: subscription.mode,
      default_qty: subscription.default_qty,
      status: subscription.status,
      auto_start: subscription.auto_start || false,
      weekly_pattern: subscription.weekly_pattern || []
    });
    setShowSubscriptionDialog(true);
  };

  const handleSaveSubscription = async () => {
    try {
      setLoading(true);
      
      if (editingSubscription) {
        await api.put(`/phase0-v2/subscriptions/${editingSubscription.id}`, subscriptionForm);
        toast.success('Subscription updated');
      } else {
        await api.post('/phase0-v2/subscriptions', {
          ...subscriptionForm,
          customer_id: selectedCustomer.id
        });
        toast.success('Subscription created');
      }
      
      setShowSubscriptionDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save subscription');
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
      toast.error('Failed to confirm');
    }
  };

  const updateCustomerStatus = async (customerId, newStatus) => {
    try {
      await api.put(`/phase0-v2/customers/${customerId}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: '', phone: '', address: '', area: '', map_link: '', notes: '',
      location: null, house_image_url: '', marketing_boy: ''
    });
    setShowCustomerForm(false);
  };

  const trialCustomers = customers.filter(c => c.status === 'trial');
  const activeCustomers = customers.filter(c => c.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isAdmin ? <Package className="h-8 w-8 text-blue-600" /> : <Users className="h-8 w-8 text-blue-600" />}
              <div>
                <h1 className="text-2xl font-bold">{isAdmin ? 'Admin' : 'Marketing'} - Customer Management</h1>
                <p className="text-sm text-gray-500">Phase-0 FIXED Version</p>
              </div>
            </div>
            <Button onClick={() => { logout(); navigate('/login'); }} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active">Active ({activeCustomers.length})</TabsTrigger>
            <TabsTrigger value="trial">Trial ({trialCustomers.length})</TabsTrigger>
            <TabsTrigger value="add">Add Customer</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Phone</th>
                        <th className="px-4 py-3 text-left">Area</th>
                        <th className="px-4 py-3 text-left">Subscription</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCustomers.map(customer => {
                        const customerSubs = subscriptions.filter(s => s.customer_id === customer.id);
                        const activeSub = customerSubs.find(s => s.status === 'active');
                        return (
                          <tr key={customer.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{customer.name}</td>
                            <td className="px-4 py-3">{customer.phone}</td>
                            <td className="px-4 py-3">{customer.area}</td>
                            <td className="px-4 py-3">
                              {activeSub ? (
                                <span className="text-green-600">{activeSub.default_qty}L - Active</span>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleAddSubscription(customer)}>
                                  <Plus className="h-4 w-4 mr-1" />Add
                                </Button>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Select value={customer.status} onValueChange={(v) => updateCustomerStatus(customer.id, v)}>
                                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="paused">Paused</SelectItem>
                                  <SelectItem value="stopped">Stopped</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              {activeSub && (
                                <Button size="sm" variant="outline" onClick={() => handleEditSubscription(customer, activeSub)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trial">
            <Card>
              <CardHeader>
                <CardTitle>Trial Customers (Not in Delivery List)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trialCustomers.map(customer => {
                    const customerSubs = subscriptions.filter(s => s.customer_id === customer.id);
                    return (
                      <div key={customer.id} className="border rounded p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{customer.name}</h3>
                            <p className="text-sm text-gray-600">{customer.phone} - {customer.area}</p>
                            {customer.house_image_url && (
                              <img src={customer.house_image_url} alt="House" className="mt-2 h-20 w-20 object-cover rounded" />
                            )}
                            <p className="text-sm mt-2">Subscriptions: {customerSubs.length}</p>
                          </div>
                          <div className="flex gap-2">
                            {customerSubs.length === 0 ? (
                              <Button size="sm" variant="outline" onClick={() => handleAddSubscription(customer)}>
                                <Plus className="mr-2 h-4 w-4" />Add Subscription First
                              </Button>
                            ) : (
                              <Button onClick={() => confirmTrialCustomer(customer.id)}>
                                <Check className="mr-2 h-4 w-4" />Confirm to Active
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add Customer (Subscription Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCustomer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} required />
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Textarea value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
                    </div>
                    <div>
                      <Label>Area *</Label>
                      <Select value={customerForm.area} onValueChange={(v) => setCustomerForm({ ...customerForm, area: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                      <Label>Marketing Boy</Label>
                      <Input value={customerForm.marketing_boy} onChange={(e) => setCustomerForm({ ...customerForm, marketing_boy: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>GPS Location (High Accuracy)</Label>
                      <div className="flex gap-2 items-center">
                        <Button type="button" onClick={captureGPSLocation} variant="outline">
                          <MapPin className="mr-2 h-4 w-4" />Auto Capture (15s timeout)
                        </Button>
                        <Input placeholder="Latitude" type="number" step="any" className="w-40" value={customerForm.location?.lat || ''} 
                          onChange={(e) => setCustomerForm({ ...customerForm, location: { lat: parseFloat(e.target.value) || 0, lng: customerForm.location?.lng || 0 } })} />
                        <Input placeholder="Longitude" type="number" step="any" className="w-40" value={customerForm.location?.lng || ''} 
                          onChange={(e) => setCustomerForm({ ...customerForm, location: { lng: parseFloat(e.target.value) || 0, lat: customerForm.location?.lat || 0 } })} />
                      </div>
                      {customerForm.location && customerForm.location.accuracy_meters && (
                        <p className="text-xs text-gray-500 mt-1">Accuracy: {customerForm.location.accuracy_meters.toFixed(0)}m</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label>House Image</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*" onChange={handleImageUpload} />
                        {customerForm.house_image_url && <img src={customerForm.house_image_url} alt="Preview" className="h-20 w-20 object-cover rounded" />}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Customer (Add Subscription Later)'}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubscription ? 'Edit' : 'Add'} Subscription for {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={subscriptionForm.product_id} onValueChange={(v) => {
                const product = products.find(p => p.id === v);
                setSubscriptionForm({ ...subscriptionForm, product_id: v, price_per_unit: product?.default_price || 60 });
              }} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.default_price})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price/Unit *</Label>
              <Input type="number" step="0.01" value={subscriptionForm.price_per_unit} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, price_per_unit: parseFloat(e.target.value) })} required />
            </div>
            <div>
              <Label>Mode *</Label>
              <Select value={subscriptionForm.mode} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, mode: v })}>
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
              <Label>Quantity *</Label>
              <Input type="number" step="0.5" min="0.5" value={subscriptionForm.default_qty} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, default_qty: parseFloat(e.target.value) })} required />
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={subscriptionForm.status} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (No Delivery)</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {subscriptionForm.mode === 'weekly_pattern' && (
              <div>
                <Label>Weekly Pattern (0=Mon, 6=Sun)</Label>
                <Input placeholder="e.g., 0,2,4 for Mon, Wed, Fri" onChange={(e) => {
                  const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d < 7);
                  setSubscriptionForm({ ...subscriptionForm, weekly_pattern: days });
                }} value={subscriptionForm.weekly_pattern.join(', ')} />
                <p className="text-xs text-gray-500 mt-1">Monday=0, Tuesday=1, ..., Sunday=6</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="auto_start" checked={subscriptionForm.auto_start} 
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, auto_start: e.target.checked })} />
              <Label htmlFor="auto_start" className="cursor-pointer">
                Auto-start deliveries (requires status=active + this checkbox)
              </Label>
            </div>
            <Button onClick={handleSaveSubscription} disabled={loading}>{loading ? 'Saving...' : (editingSubscription ? 'Update' : 'Create')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
