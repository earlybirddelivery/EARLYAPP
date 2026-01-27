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
import { Plus, Edit2, Trash2, Users, LogOut } from 'lucide-react';
import { logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export function MarketingStaff() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    area: '',
    map_link: '',
    notes: '',
    default_quantity: 1.0,
    pause_dates: '',
    day_overrides: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, subscriptionsRes, areasRes] = await Promise.all([
        api.get('/phase0/customers'),
        api.get('/phase0/subscriptions'),
        api.get('/phase0/areas')
      ]);
      setCustomers(customersRes.data);
      setSubscriptions(subscriptionsRes.data);
      setAreas(areasRes.data.areas);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAreaChange = (value) => {
    setFormData(prev => ({ ...prev, area: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Parse pause dates (comma-separated YYYY-MM-DD)
      const pauseDates = formData.pause_dates
        ? formData.pause_dates.split(',').map(d => d.trim()).filter(d => d)
        : [];
      
      if (editingCustomer) {
        // Update existing customer
        await api.put(`/phase0/customers/${editingCustomer.id}`, {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          area: formData.area,
          map_link: formData.map_link || null,
          notes: formData.notes || null
        });
        
        // Update subscription
        const existingSub = subscriptions.find(s => s.customer_id === editingCustomer.id);
        if (existingSub) {
          await api.put(`/phase0/subscriptions/${existingSub.id}`, {
            default_quantity: parseFloat(formData.default_quantity),
            pause_dates: pauseDates,
            status: 'active'
          });
        }
        
        toast.success('Customer updated successfully');
      } else {
        // Create new customer
        const customerRes = await api.post('/phase0/customers', {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          area: formData.area,
          map_link: formData.map_link || null,
          notes: formData.notes || null
        });
        
        // Create subscription
        await api.post('/phase0/subscriptions', {
          customer_id: customerRes.data.id,
          default_quantity: parseFloat(formData.default_quantity),
          day_overrides: [],
          pause_dates: pauseDates,
          status: 'active'
        });
        
        toast.success('Customer added successfully');
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    const subscription = subscriptions.find(s => s.customer_id === customer.id);
    
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      area: customer.area,
      map_link: customer.map_link || '',
      notes: customer.notes || '',
      default_quantity: subscription?.default_quantity || 1.0,
      pause_dates: subscription?.pause_dates?.join(', ') || '',
      day_overrides: subscription?.day_overrides || []
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/phase0/customers/${customerId}`);
      toast.success('Customer deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      area: '',
      map_link: '',
      notes: '',
      default_quantity: 1.0,
      pause_dates: '',
      day_overrides: []
    });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Add Customer Button */}
        {!showForm && (
          <div className="mb-6">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Customer
            </Button>
          </div>
        )}

        {/* Customer Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
              <CardDescription>Fill in the customer and subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="area">Area *</Label>
                    <Select value={formData.area} onValueChange={handleAreaChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                        <SelectItem value="Koramangala">Koramangala</SelectItem>
                        <SelectItem value="Indiranagar">Indiranagar</SelectItem>
                        <SelectItem value="Whitefield">Whitefield</SelectItem>
                        <SelectItem value="HSR Layout">HSR Layout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="map_link">Map Link</Label>
                    <Input
                      id="map_link"
                      name="map_link"
                      value={formData.map_link}
                      onChange={handleInputChange}
                      placeholder="https://goo.gl/maps/..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="default_quantity">Daily Quantity (Liters) *</Label>
                    <Input
                      id="default_quantity"
                      name="default_quantity"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.default_quantity}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pause_dates">Pause Dates (comma-separated)</Label>
                    <Input
                      id="pause_dates"
                      name="pause_dates"
                      value={formData.pause_dates}
                      onChange={handleInputChange}
                      placeholder="2024-12-25, 2024-12-26"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Any special instructions..."
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Add Customer')}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>Customers ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && customers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No customers yet. Add your first customer!</div>
            ) : (
              <div className="space-y-4">
                {customers.map(customer => {
                  const subscription = subscriptions.find(s => s.customer_id === customer.id);
                  return (
                    <div key={customer.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{customer.name}</h3>
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                          <p className="text-sm text-gray-600 mt-1">{customer.address}</p>
                          <div className="flex gap-4 mt-2">
                            <span className="text-sm"><strong>Area:</strong> {customer.area}</span>
                            <span className="text-sm"><strong>Daily Qty:</strong> {subscription?.default_quantity || 'N/A'}L</span>
                          </div>
                          {customer.notes && (
                            <p className="text-sm text-gray-500 mt-2">📝 {customer.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(customer.id)}>
                            <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
}
