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
import { Package, Users, LogOut, MapPin, Plus, Edit2, Check, Download, Upload, Camera, Search, Filter } from 'lucide-react';
import { logout, getUserRole } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export function UnifiedDashboard() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  
  const [filters, setFilters] = useState({
    status: '',
    area: '',
    marketing_boy: ''
  });
  
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', address: '', area: '', map_link: '', notes: '',
    location: null, house_image_url: '', marketing_boy: ''
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    product_id: '', price_per_unit: 60, mode: 'fixed_daily',
    default_qty: 1.0, weekly_pattern: [], pause_start: '', pause_end: ''
  });
  
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.area) params.append('area', filters.area);
      if (filters.marketing_boy) params.append('marketing_boy', filters.marketing_boy);
      
      const [customersRes, subsRes, productsRes, areasRes, deliveryBoysRes] = await Promise.all([
        api.get(`/phase0-v2/customers?${params.toString()}`),
        api.get('/phase0-v2/subscriptions'),
        api.get('/phase0-v2/products'),
        api.get('/phase0-v2/areas'),
        api.get('/phase0-v2/delivery-boys')
      ]);
      
      setCustomers(customersRes.data);
      setSubscriptions(subsRes.data);
      setProducts(productsRes.data);
      setAreas(areasRes.data.areas);
      setDeliveryBoys(deliveryBoysRes.data);
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
        toast.error('GPS failed. Please enter manually.');
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setUploadingImage(true);
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
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Create customer with subscription together
      const payload = {
        customer: { ...customerForm, status: 'trial' },
        subscription: {
          ...subscriptionForm,
          weekly_pattern: subscriptionForm.mode === 'weekly_pattern' ? subscriptionForm.weekly_pattern : null,
          pause_intervals: subscriptionForm.pause_start && subscriptionForm.pause_end ? [
            { start: subscriptionForm.pause_start, end: subscriptionForm.pause_end }
          ] : [],
          day_overrides: [],
          irregular_list: [],
          stop_date: null
        }
      };
      
      await api.post('/phase0-v2/customers-with-subscription', payload);
      toast.success('Customer and subscription created!');
      
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save');
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

  const handleEditSubscription = async () => {
    if (!editingSubscription) return;
    
    try {
      await api.put(`/phase0-v2/subscriptions/${editingSubscription.id}`, subscriptionForm);
      toast.success('Subscription updated');
      setEditingSubscription(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const resetForm = () => {
    setCustomerForm({
      name: '', phone: '', address: '', area: '', map_link: '', notes: '',
      location: null, house_image_url: '', marketing_boy: ''
    });
    setSubscriptionForm({
      product_id: '', price_per_unit: 60, mode: 'fixed_daily',
      default_qty: 1.0, weekly_pattern: [], pause_start: '', pause_end: ''
    });
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  const downloadSampleTemplate = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/phase0-v2/download-sample-template`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customer_import_template.xlsx';
      a.click();
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
                <h1 className="text-2xl font-bold">{isAdmin ? 'Admin' : 'Marketing'} Dashboard</h1>
                <p className="text-sm text-gray-500">Complete customer management</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Advanced Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Area</Label>
                <Select value={filters.area} onValueChange={(v) => setFilters({ ...filters, area: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    
                    {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marketing Boy</Label>
                <Input value={filters.marketing_boy} onChange={(e) => setFilters({ ...filters, marketing_boy: e.target.value })} placeholder="Name" />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchData}><Search className="mr-2 h-4 w-4" />Search</Button>
                <Button variant="outline" onClick={() => setFilters({ status: '', area: '', marketing_boy: '' })}>Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="customers">
          <TabsList className="mb-6">
            <TabsTrigger value="customers">Active Customers ({activeCustomers.length})</TabsTrigger>
            <TabsTrigger value="trial">Trial Customers ({trialCustomers.length})</TabsTrigger>
            <TabsTrigger value="add">Add Customer</TabsTrigger>
            {isAdmin && <TabsTrigger value="import">Import</TabsTrigger>}
          </TabsList>

          <TabsContent value="customers">
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
                        <th className="px-4 py-3 text-left">Subscriptions</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCustomers.map(customer => {
                        const customerSubs = subscriptions.filter(s => s.customer_id === customer.id);
                        return (
                          <tr key={customer.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{customer.name}</td>
                            <td className="px-4 py-3">{customer.phone}</td>
                            <td className="px-4 py-3">{customer.area}</td>
                            <td className="px-4 py-3">{customerSubs.length}</td>
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
                              <Button size="sm" variant="outline">
                                <Edit2 className="h-4 w-4" />
                              </Button>
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
                  {trialCustomers.map(customer => (
                    <div key={customer.id} className="border rounded p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{customer.name}</h3>
                          <p className="text-sm text-gray-600">{customer.phone} - {customer.area}</p>
                          {customer.house_image_url && (
                            <img src={customer.house_image_url} alt="House" className="mt-2 h-20 w-20 object-cover rounded" />
                          )}
                        </div>
                        <Button onClick={() => confirmTrialCustomer(customer.id)}>
                          <Check className="mr-2 h-4 w-4" />
                          Confirm to Active
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add Customer with Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name *</Label>
                      <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} required />
                    </div>
                    <div className="col-span-2">
                      <Label>Address *</Label>
                      <Textarea value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Area *</Label>
                      <Select value={customerForm.area} onValueChange={(v) => setCustomerForm({ ...customerForm, area: v })} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                          <SelectItem value="Koramangala">Koramangala</SelectItem>
                          <SelectItem value="Indiranagar">Indiranagar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Marketing Boy</Label>
                      <Input value={customerForm.marketing_boy} onChange={(e) => setCustomerForm({ ...customerForm, marketing_boy: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>GPS Location</Label>
                      <div className="flex gap-2 items-center">
                        <Button type="button" onClick={captureGPSLocation} disabled={capturingLocation} variant="outline">
                          <MapPin className="mr-2 h-4 w-4" />
                          {capturingLocation ? 'Capturing...' : 'Auto Capture'}
                        </Button>
                        <Input placeholder="Lat" type="number" step="any" value={customerForm.location?.lat || ''} 
                          onChange={(e) => setCustomerForm({ ...customerForm, location: { ...customerForm.location, lat: parseFloat(e.target.value), lng: customerForm.location?.lng || 0 } })} />
                        <Input placeholder="Lng" type="number" step="any" value={customerForm.location?.lng || ''} 
                          onChange={(e) => setCustomerForm({ ...customerForm, location: { ...customerForm.location, lng: parseFloat(e.target.value), lat: customerForm.location?.lat || 0 } })} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>House Image</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                        {customerForm.house_image_url && <img src={customerForm.house_image_url} alt="Preview" className="h-20 w-20 object-cover rounded" />}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Subscription Details</h3>
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Customer + Subscription'}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="import">
              <Card>
                <CardHeader>
                  <CardTitle>Import Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button onClick={downloadSampleTemplate} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download Sample Template
                    </Button>
                    <Input type="file" accept=".csv,.xlsx" />
                    <Button><Upload className="mr-2 h-4 w-4" />Import</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
