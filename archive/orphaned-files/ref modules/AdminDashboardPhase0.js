import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
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
  Calendar, 
  MapPin, 
  Share2, 
  TrendingUp, 
  Users, 
  Package,
  LogOut,
  DollarSign,
  FileText
} from 'lucide-react';
import { logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.jsx';

export function AdminDashboardPhase0() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [deliveryList, setDeliveryList] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [billingData, setBillingData] = useState(null);
  
  const [filters, setFilters] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    area: '',
    delivery_boy_id: ''
  });
  
  const [billingFilters, setBillingFilters] = useState({
    customer_id: '',
    start_date: '',
    end_date: '',
    rate_per_liter: 60
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.delivery_date) {
      fetchDashboardStats();
      fetchDeliveryList();
    }
  }, [filters.delivery_date, filters.area, filters.delivery_boy_id]);

  const fetchInitialData = async () => {
    try {
      const [areasRes, deliveryBoysRes, customersRes] = await Promise.all([
        api.get('/phase0/areas'),
        api.get('/phase0/delivery-boys'),
        api.get('/phase0/customers')
      ]);
      setAreas(areasRes.data.areas);
      setDeliveryBoys(deliveryBoysRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Failed to load initial data');
      console.error(error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(`/phase0/dashboard?stat_date=${filters.delivery_date}`);
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
      console.error(error);
    }
  };

  const fetchDeliveryList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        delivery_date: filters.delivery_date
      });
      
      if (filters.area) {
        params.append('area', filters.area);
      }
      
      if (filters.delivery_boy_id) {
        params.append('delivery_boy_id', filters.delivery_boy_id);
      }
      
      const res = await api.get(`/phase0/delivery-list?${params.toString()}`);
      setDeliveryList(res.data);
    } catch (error) {
      toast.error('Failed to load delivery list');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const params = new URLSearchParams({
        delivery_date: filters.delivery_date
      });
      
      if (filters.area) {
        params.append('area', filters.area);
      }
      
      if (filters.delivery_boy_id) {
        params.append('delivery_boy_id', filters.delivery_boy_id);
      }
      
      const res = await api.get(`/phase0/delivery-list/whatsapp-format?${params.toString()}`);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(res.data.text);
      toast.success('Delivery list copied to clipboard! Ready to share on WhatsApp.');
    } catch (error) {
      toast.error('Failed to generate WhatsApp format');
      console.error(error);
    }
  };

  const handleGenerateBill = async () => {
    if (!billingFilters.customer_id || !billingFilters.start_date || !billingFilters.end_date) {
      toast.error('Please select customer and date range');
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: billingFilters.start_date,
        end_date: billingFilters.end_date,
        rate_per_liter: billingFilters.rate_per_liter
      });
      
      const res = await api.get(`/phase0/billing/customer/${billingFilters.customer_id}?${params.toString()}`);
      setBillingData(res.data);
      setShowBillingDialog(true);
    } catch (error) {
      toast.error('Failed to generate bill');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">EarlyBird Delivery Services - Phase 0</p>
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
        {/* Dashboard Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_customers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_active_subscriptions}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Liters ({filters.delivery_date})</CardTitle>
                <Package className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(stats.liters_by_area).reduce((a, b) => a + b, 0).toFixed(1)}L
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {Object.entries(stats.liters_by_area).map(([area, liters]) => (
                    <div key={area}>{area}: {liters}L</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delivery List Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Delivery List Generator</CardTitle>
            <CardDescription>Filter by date and area or delivery boy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Label htmlFor="delivery_date">Delivery Date</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={filters.delivery_date}
                  onChange={(e) => setFilters({ ...filters, delivery_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="area">Filter by Area</Label>
                <Select 
                  value={filters.area || undefined} 
                  onValueChange={(value) => setFilters({ ...filters, area: value || '', delivery_boy_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.area && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilters({ ...filters, area: '' })}
                    className="mt-1 text-xs"
                  >
                    Clear filter
                  </Button>
                )}
              </div>
              
              <div>
                <Label htmlFor="delivery_boy">OR Filter by Delivery Boy</Label>
                <Select 
                  value={filters.delivery_boy_id || undefined} 
                  onValueChange={(value) => setFilters({ ...filters, delivery_boy_id: value || '', area: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Delivery Boys" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryBoys.map(db => (
                      <SelectItem key={db.id} value={db.id}>
                        {db.name} ({db.area_assigned})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.delivery_boy_id && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilters({ ...filters, delivery_boy_id: '' })}
                    className="mt-1 text-xs"
                  >
                    Clear filter
                  </Button>
                )}
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleShareWhatsApp} className="w-full gap-2">
                  <Share2 className="h-4 w-4" />
                  Copy for WhatsApp
                </Button>
              </div>
            </div>

            {/* Delivery List Table */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : deliveryList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No deliveries for selected filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Phone</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Address</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Area</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Qty (L)</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Notes</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveryList.map(item => (
                      <tr key={item.customer_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.serial}</td>
                        <td className="px-4 py-3 font-medium">{item.customer_name}</td>
                        <td className="px-4 py-3">{item.phone}</td>
                        <td className="px-4 py-3 text-xs max-w-xs">{item.address}</td>
                        <td className="px-4 py-3">{item.area}</td>
                        <td className="px-4 py-3 font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{item.notes || '-'}</td>
                        <td className="px-4 py-3">
                          {item.map_link ? (
                            <a href={item.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              <MapPin className="h-4 w-4" />
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Billing</CardTitle>
            <CardDescription>Generate bills for customers based on deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select 
                  value={billingFilters.customer_id} 
                  onValueChange={(value) => setBillingFilters({ ...billingFilters, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={billingFilters.start_date}
                  onChange={(e) => setBillingFilters({ ...billingFilters, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={billingFilters.end_date}
                  onChange={(e) => setBillingFilters({ ...billingFilters, end_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="rate">Rate/Liter (₹)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={billingFilters.rate_per_liter}
                  onChange={(e) => setBillingFilters({ ...billingFilters, rate_per_liter: parseFloat(e.target.value) })}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleGenerateBill} className="w-full gap-2" disabled={loading}>
                  <FileText className="h-4 w-4" />
                  Generate Bill
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Bill</DialogTitle>
            <DialogDescription>Delivery summary and billing details</DialogDescription>
          </DialogHeader>
          
          {billingData && (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg">{billingData.customer_name}</h3>
                <p className="text-sm text-gray-600">{billingData.phone}</p>
                <p className="text-sm text-gray-600">{billingData.address}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Period:</span>
                  <span className="ml-2 font-medium">{billingData.start_date} to {billingData.end_date}</span>
                </div>
                <div>
                  <span className="text-gray-600">Rate:</span>
                  <span className="ml-2 font-medium">₹{billingData.rate_per_liter}/L</span>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Quantity (L)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {billingData.deliveries.map((delivery, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{delivery.date}</td>
                        <td className="px-4 py-2 text-right font-medium">{delivery.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{billingData.total_liters}L</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{billingData.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
