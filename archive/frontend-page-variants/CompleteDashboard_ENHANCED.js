import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast, Toaster } from 'sonner';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog.jsx';
import { Package, Users, LogOut, MapPin, Plus, Edit2, Check, Download, Upload, Share2, FileSpreadsheet, Calendar, X, AlertTriangle, TrendingDown, Activity, Settings, Camera, Navigation, Copy } from 'lucide-react';
import { logout, getUserRole, getUser } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { usePauseDetection, useDemandForecast, useAccessControl } from '../utils/modules';
import { CustomerCalendar } from '../components/CustomerCalendar';
import { SubscriptionCalendarMonth } from '../components/SubscriptionCalendarView';

/**
 * SUPER DASHBOARD - Combined Best Features
 * ✅ CompleteDashboard base (full admin, module hooks, calendar)
 * ✅ AdminDashboardV2 features (export/import excellence, WhatsApp)
 * ✅ UnifiedDashboard features (GPS, image capture)
 */
export function CompleteDashboard() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const currentUser = getUser();
  const isAdmin = userRole === 'admin';
  const isMarketing = userRole === 'marketing_staff';
  
  // ===== DATA STATES =====
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [marketingUsers, setMarketingUsers] = useState([]);
  const [deliveryList, setDeliveryList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ===== UI DIALOG STATES =====
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  
  // ===== ENHANCED IMPORT/EXPORT STATES (from AdminDashboardV2) =====
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // ===== FILTER STATES =====
  const [filters, setFilters] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    area: '',
    delivery_boy_id: '',
    shift: 'all'
  });
  
  // ===== EXPORT STATES (with date range - from AdminDashboardV2) =====
  const [excelExport, setExcelExport] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    area: ''
  });
  
  // ===== USER MANAGEMENT STATES =====
  const [users, setUsers] = useState([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '', email: '', phone: '', role: 'marketing_staff', password: ''
  });
  
  // ===== CALENDAR STATES =====
  const [selectedCustomerForCalendar, setSelectedCustomerForCalendar] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showSubscriptionCalendar, setShowSubscriptionCalendar] = useState(false);
  
  // ===== AREA MANAGEMENT STATES =====
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm, setAreaForm] = useState({ main_area: '', sub_area: '', delivery_boy_ids: [] });
  const [structuredAreas, setStructuredAreas] = useState([]);
  
  // ===== ENHANCED CUSTOMER FORM (with GPS + Image from UnifiedDashboard) =====
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', address: '', area: '', map_link: '', notes: '',
    // Enhanced fields from UnifiedDashboard
    location: null,           // { lat, lng } from GPS
    house_image_url: '',      // Image upload URL
    gps_captured: false,      // GPS capture indicator
    image_verified: false,    // Image verification flag
    // Additional fields
    marketing_boy: '', marketing_boy_id: '', delivery_boy_id: '',
    status: 'trial', trial_start_date: ''
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    product_id: '', price_per_unit: 60, mode: 'fixed_daily',
    default_qty: 1.0, status: 'draft', auto_start: false, weekly_pattern: []
  });
  
  // ===== PENDING REQUESTS STATE =====
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  // ===== MODULE HOOKS (from CompleteDashboard) =====
  const { churnRisks, alerts } = usePauseDetection();
  const { shortages, getSuppliersNeedingReorder } = useDemandForecast();
  const { permissions, user } = useAccessControl();

  // ===== INITIALIZATION EFFECTS =====
  useEffect(() => {
    fetchData();
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (filters.delivery_date) {
      fetchDashboardStats();
      fetchDeliveryList();
    }
  }, [filters.delivery_date, filters.area, filters.delivery_boy_id]);

  // ===== ENHANCED: PARALLEL DATA LOADING (from AdminDashboardV2) =====
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        customersRes, subscriptionsRes, productsRes, areasRes,
        deliveryBoysRes, usersRes, statsRes
      ] = await Promise.all([
        api.get('/customers'),
        api.get('/subscriptions'),
        api.get('/products'),
        api.get('/areas'),
        api.get('/delivery-boys'),
        api.get('/users'),
        api.get(`/dashboard?stat_date=${new Date().toISOString().split('T')[0]}`)
      ]);
      
      setCustomers(customersRes.data || []);
      setSubscriptions(subscriptionsRes.data || []);
      setProducts(productsRes.data || []);
      setAreas(areasRes.data || []);
      setDeliveryBoys(deliveryBoysRes.data || []);
      setUsers(usersRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(`/dashboard?stat_date=${filters.delivery_date}`);
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load stats');
    }
  };

  // ===== ENHANCED: DELIVERY LIST with Smart Filters (from AdminDashboardV2) =====
  const fetchDeliveryList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ date: filters.delivery_date });
      if (filters.area) params.append('area', filters.area);
      if (filters.delivery_boy_id) params.append('delivery_boy_id', filters.delivery_boy_id);
      
      const res = await api.get(`/delivery/generate?${params.toString()}`);
      setDeliveryList(res.data);
    } catch (error) {
      toast.error('Failed to load delivery list');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/pending-requests');
      setPendingRequests(res.data || []);
      setPendingCount((res.data || []).length);
    } catch (error) {
      console.error('Failed to load pending requests');
    }
  };

  // ===== NEW: WHATSAPP SHARING (from AdminDashboardV2) =====
  const handleShareWhatsApp = async () => {
    try {
      const params = new URLSearchParams({ date: filters.delivery_date });
      if (filters.area) params.append('area', filters.area);
      if (filters.delivery_boy_id) params.append('delivery_boy_id', filters.delivery_boy_id);
      
      const res = await api.get(`/delivery/whatsapp-format?${params.toString()}`);
      await navigator.clipboard.writeText(res.data.text);
      toast.success('📋 Delivery list copied! Ready to paste in WhatsApp');
    } catch (error) {
      toast.error('Failed to generate WhatsApp format');
    }
  };

  // ===== ENHANCED: EXCEL EXPORT with Date Range (from AdminDashboardV2) =====
  const handleExportExcel = async () => {
    try {
      // Validate date range
      if (new Date(excelExport.start_date) > new Date(excelExport.end_date)) {
        toast.error('Start date must be before end date');
        return;
      }

      setLoading(true);
      const params = new URLSearchParams({
        start_date: excelExport.start_date,
        end_date: excelExport.end_date
      });
      if (excelExport.area) params.append('area', excelExport.area);
      
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/delivery/export-excel?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (!res.ok) throw new Error('Export failed');
      
      // Professional blob download (from AdminDashboardV2)
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery_report_${excelExport.start_date}_to_${excelExport.end_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('✅ Excel report downloaded!');
      setShowExportDialog(false);
    } catch (error) {
      toast.error('Failed to export Excel');
    } finally {
      setLoading(false);
    }
  };

  // ===== ENHANCED: FILE IMPORT with Preview (from AdminDashboardV2) =====
  const handleFileSelect = (e) => {
    setImportFile(e.target.files[0]);
  };

  const handlePreviewImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);
      
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/customers/import/preview`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        }
      );
      
      const data = await res.json();
      setImportPreview(data);
      setShowImportDialog(true);
    } catch (error) {
      toast.error('Failed to preview file');
    } finally {
      setLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);
      
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/customers/import`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        }
      );
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Imported ${data.imported_count} customers!`);
        setShowImportDialog(false);
        setImportFile(null);
        setImportPreview(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to import');
    } finally {
      setLoading(false);
    }
  };

  // ===== NEW: GPS LOCATION CAPTURE (from UnifiedDashboard) =====
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCustomerForm({
          ...customerForm,
          location: { lat: latitude, lng: longitude },
          gps_captured: true,
          map_link: `https://maps.google.com/?q=${latitude},${longitude}`
        });
        toast.success(`📍 GPS captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLoading(false);
      },
      (error) => {
        toast.error('Failed to get GPS: ' + error.message);
        setLoading(false);
      }
    );
  };

  // ===== NEW: IMAGE UPLOAD (from UnifiedDashboard) =====
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customer_id', editingCustomer?._id || 'new');

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/upload/house-image`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        }
      );

      const data = await res.json();
      setCustomerForm({
        ...customerForm,
        house_image_url: data.url,
        image_verified: false
      });
      toast.success('📸 Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  // ===== CUSTOMER OPERATIONS =====
  const addCustomer = async () => {
    try {
      setLoading(true);
      const customerData = {
        ...customerForm,
        // Enhanced with location data
        gps_location: customerForm.location,
        house_image: customerForm.house_image_url,
        location_verified: customerForm.gps_captured && customerForm.image_verified
      };

      const res = await api.post('/customers', customerData);
      toast.success('✅ Customer added successfully');
      
      setCustomerForm({
        name: '', phone: '', address: '', area: '', map_link: '', notes: '',
        location: null, house_image_url: '', gps_captured: false, image_verified: false,
        marketing_boy: '', marketing_boy_id: '', delivery_boy_id: '', status: 'trial', trial_start_date: ''
      });
      setShowCustomerForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const updateCustomer = async () => {
    try {
      setLoading(true);
      const customerData = {
        ...customerForm,
        gps_location: customerForm.location,
        house_image: customerForm.house_image_url,
        location_verified: customerForm.gps_captured && customerForm.image_verified
      };

      await api.put(`/customers/${editingCustomer._id}`, customerData);
      toast.success('✅ Customer updated');
      
      setEditingCustomer(null);
      setShowCustomerForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('✅ Customer deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ===== RENDER MAIN DASHBOARD =====
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">🚀 Super Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Complete + V2 Export/Import + Unified Location Features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Button className="bg-red-600 hover:bg-red-700" size="sm">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Pending ({pendingCount})
                </Button>
              )}
              <Button onClick={() => navigate('/monthly-billing')} className="bg-green-600 hover:bg-green-700" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />Billing
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* STATISTICS CARDS */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_customers || 0}</div>
                <p className="text-xs text-gray-500">{stats.trial_customers || 0} trial</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_subscriptions || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">GPS Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {customers.filter(c => c.gps_captured).length}
                </div>
                <p className="text-xs text-gray-500">locations captured</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Images Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {customers.filter(c => c.image_verified).length}
                </div>
                <p className="text-xs text-gray-500">house images verified</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MAIN TABS */}
        <Tabs defaultValue="delivery">
          <TabsList className="mb-6 grid w-full grid-cols-7">
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="export">📊 Export</TabsTrigger>
            <TabsTrigger value="import">📥 Import</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
            <TabsTrigger value="alerts">⚠️ Alerts</TabsTrigger>
          </TabsList>

          {/* TAB 1: DELIVERY LIST */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Delivery List Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={filters.delivery_date}
                      onChange={(e) => setFilters({ ...filters, delivery_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Select value={filters.area || ''} onValueChange={(v) => setFilters({ ...filters, area: v, delivery_boy_id: '' })}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Delivery Boy</Label>
                    <Select value={filters.delivery_boy_id || ''} onValueChange={(v) => setFilters({ ...filters, delivery_boy_id: v, area: '' })}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        {deliveryBoys.map(db => <SelectItem key={db.id} value={db.id}>{db.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleShareWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Share2 className="mr-2 h-4 w-4" />WhatsApp
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-500">⏳ Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Qty</th>
                          <th className="px-4 py-3 text-left">Area</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryList.length > 0 ? (
                          deliveryList.map((item, idx) => (
                            <tr key={`${item.customer_id}-${item.product_name}`} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">{idx + 1}</td>
                              <td className="px-4 py-3 font-medium">{item.customer_name}</td>
                              <td className="px-4 py-3">{item.product_name}</td>
                              <td className="px-4 py-3 font-bold text-blue-600">{item.quantity}L</td>
                              <td className="px-4 py-3">{item.area}</td>
                              <td className="px-4 py-3"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Pending</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                              📭 No deliveries scheduled
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: EXPORT EXCEL (from AdminDashboardV2) */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>📊 Export Delivery Reports</CardTitle>
                <p className="text-sm text-gray-500 mt-2">Download Excel reports with date range filtering</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      value={excelExport.start_date}
                      onChange={(e) => setExcelExport({ ...excelExport, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={excelExport.end_date}
                      onChange={(e) => setExcelExport({ ...excelExport, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Area (Optional)</Label>
                    <Select value={excelExport.area || ''} onValueChange={(v) => setExcelExport({ ...excelExport, area: v })}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleExportExcel}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    💡 Quick presets: Select dates for weekly (7 days) or monthly (30 days) reports
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: IMPORT CUSTOMERS (from AdminDashboardV2) */}
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>📥 Import Customers</CardTitle>
                <p className="text-sm text-gray-500 mt-2">Upload CSV or XLSX files with validation preview</p>
              </CardHeader>
              <CardContent>
                {!importPreview ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Select File (CSV or XLSX)</Label>
                      <Input 
                        type="file" 
                        accept=".csv,.xlsx"
                        onChange={handleFileSelect}
                        className="mt-2"
                      />
                    </div>
                    <Button 
                      onClick={handlePreviewImport}
                      disabled={!importFile || loading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Preview Import
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                      <div>
                        <div className="text-sm font-medium">Total Rows</div>
                        <div className="text-2xl font-bold">{importPreview.total_rows}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-600">Valid Rows</div>
                        <div className="text-2xl font-bold text-green-600">{importPreview.valid_rows}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-600">Errors</div>
                        <div className="text-2xl font-bold text-red-600">{importPreview.errors?.length || 0}</div>
                      </div>
                    </div>
                    
                    {importPreview.errors && importPreview.errors.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded">
                        <h3 className="font-medium text-red-800 mb-2">Errors Found:</h3>
                        <ul className="text-sm text-red-700 space-y-1">
                          {importPreview.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>Row {err.row}: {err.error_message}</li>
                          ))}
                          {importPreview.errors.length > 5 && (
                            <li>... and {importPreview.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleImportConfirm}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        ✅ Import {importPreview.valid_rows} Customers
                      </Button>
                      <Button 
                        onClick={() => { setImportPreview(null); setImportFile(null); }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: CUSTOMERS (Enhanced with GPS + Image) */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Customers (with GPS & Image Verification)</CardTitle>
                  <Button onClick={() => setShowCustomerForm(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />Add Customer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers.length > 0 ? (
                    customers.map(customer => (
                      <div key={customer._id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{customer.name}</h3>
                            <p className="text-sm text-gray-600">{customer.phone}</p>
                            <p className="text-sm text-gray-600">{customer.address}, {customer.area}</p>
                            
                            {/* GPS Status */}
                            <div className="flex gap-2 mt-2">
                              {customer.gps_captured ? (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                                  <Navigation className="h-3 w-3" />GPS Captured
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">⚪ No GPS</span>
                              )}
                              
                              {customer.image_verified ? (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                                  <Camera className="h-3 w-3" />Image Verified
                                </span>
                              ) : customer.house_image_url ? (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">📸 Image Pending</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">No Image</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => {
                                setEditingCustomer(customer);
                                setCustomerForm({ ...customer });
                                setShowCustomerForm(true);
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              onClick={() => deleteCustomer(customer._id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">👥 No customers yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: SUBSCRIPTIONS */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {subscriptions.map(sub => (
                      <div key={sub._id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <p className="font-medium">{sub.customer_name}</p>
                          <p className="text-sm text-gray-600">{sub.product_name} - {sub.qty}L {sub.mode}</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{sub.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">📭 No subscriptions</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: CALENDAR */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>📅 Subscription Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                {showSubscriptionCalendar ? (
                  <div>
                    {selectedCustomerId && <SubscriptionCalendarMonth customerId={selectedCustomerId} />}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select a customer to view calendar
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: ALERTS & INSIGHTS */}
          <TabsContent value="alerts">
            <div className="space-y-4">
              {churnRisks && churnRisks.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="text-red-800">⚠️ Churn Risk Customers</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {churnRisks.map(risk => (
                      <div key={risk.customer_id} className="p-3 border rounded mb-2 bg-red-50">
                        <p className="font-medium">{risk.customer_name}</p>
                        <p className="text-sm text-red-700">{risk.reason}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              
              {shortages && shortages.length > 0 && (
                <Card className="border-yellow-200">
                  <CardHeader className="bg-yellow-50">
                    <CardTitle className="text-yellow-800">📦 Low Stock Items</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {shortages.map((short, i) => (
                      <div key={i} className="p-3 border rounded mb-2 bg-yellow-50">
                        <p className="font-medium">{short.product_name}</p>
                        <p className="text-sm text-yellow-700">Stock: {short.current_stock}L (Min: {short.min_stock}L)</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* CUSTOMER FORM DIALOG (Enhanced with GPS + Image) */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '✏️ Edit Customer' : '➕ Add New Customer'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* BASIC INFO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input 
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input 
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Address</Label>
                <Input 
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                />
              </div>
              <div>
                <Label>Area</Label>
                <Select value={customerForm.area || ''} onValueChange={(v) => setCustomerForm({ ...customerForm, area: v })}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* GPS CAPTURE (NEW from UnifiedDashboard) */}
            <div className="p-4 border rounded bg-blue-50">
              <Label className="font-bold flex items-center gap-2">
                <Navigation className="h-4 w-4" />GPS Location Capture
              </Label>
              {customerForm.gps_captured ? (
                <div className="mt-2 p-2 bg-green-100 text-green-800 rounded text-sm">
                  ✅ GPS Captured: {customerForm.location?.lat.toFixed(4)}, {customerForm.location?.lng.toFixed(4)}
                  <br />
                  <a 
                    href={customerForm.map_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="underline font-bold"
                  >
                    View on Map
                  </a>
                </div>
              ) : (
                <Button 
                  onClick={handleCaptureGPS}
                  disabled={loading}
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Capture GPS Location
                </Button>
              )}
            </div>

            {/* IMAGE UPLOAD (NEW from UnifiedDashboard) */}
            <div className="p-4 border rounded bg-purple-50">
              <Label className="font-bold flex items-center gap-2">
                <Camera className="h-4 w-4" />House Image Verification
              </Label>
              {customerForm.house_image_url ? (
                <div className="mt-2">
                  <img src={customerForm.house_image_url} alt="House" className="w-full h-40 object-cover rounded" />
                  <div className="mt-2 text-sm">
                    {customerForm.image_verified ? (
                      <span className="text-green-700">✅ Image Verified</span>
                    ) : (
                      <>
                        <span className="text-yellow-700">⏳ Pending verification</span>
                        <Button 
                          onClick={() => setCustomerForm({ ...customerForm, image_verified: true })}
                          size="sm"
                          className="ml-2"
                        >
                          Mark as Verified
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <Input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            {/* ADDITIONAL INFO */}
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={editingCustomer ? updateCustomer : addCustomer}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {editingCustomer ? '✏️ Update Customer' : '➕ Add Customer'}
              </Button>
              <Button 
                onClick={() => {
                  setShowCustomerForm(false);
                  setEditingCustomer(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
