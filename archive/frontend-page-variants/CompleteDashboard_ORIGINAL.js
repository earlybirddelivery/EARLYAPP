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
import { Package, Users, LogOut, MapPin, Plus, Edit2, Check, Download, Upload, Share2, FileSpreadsheet, Calendar, X, AlertTriangle, TrendingDown, Activity, Settings } from 'lucide-react';
import { logout, getUserRole, getUser } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { usePauseDetection, useDemandForecast, useAccessControl } from '../utils/modules';
import { CustomerCalendar } from '../components/CustomerCalendar';
import { SubscriptionCalendarMonth } from '../components/SubscriptionCalendarView';

export function CompleteDashboard() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const currentUser = getUser();
  const isAdmin = userRole === 'admin';
  const isMarketing = userRole === 'marketing_staff';
  
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [marketingUsers, setMarketingUsers] = useState([]);
  const [deliveryList, setDeliveryList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  
  const [filters, setFilters] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    area: '',
    delivery_boy_id: '',
    shift: 'all'  // morning, evening, both, or all
  });
  
  const [excelExport, setExcelExport] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    area: ''
  });
  
  const [users, setUsers] = useState([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '', email: '', phone: '', role: 'marketing_staff', password: ''
  });
  
  const [selectedCustomerForCalendar, setSelectedCustomerForCalendar] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState(false); // false = list view, true = calendar view
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showSubscriptionCalendar, setShowSubscriptionCalendar] = useState(false);
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm, setAreaForm] = useState({ main_area: '', sub_area: '', delivery_boy_ids: [] });
  const [structuredAreas, setStructuredAreas] = useState([]);
  
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', address: '', area: '', map_link: '', notes: '',
    location: null, house_image_url: '', marketing_boy: '', marketing_boy_id: '', delivery_boy_id: '',
    status: 'trial', trial_start_date: ''
  });
  
  const [subscriptionForm, setSubscriptionForm] = useState({
    product_id: '', price_per_unit: 60, mode: 'fixed_daily',
    default_qty: 1.0, status: 'draft', auto_start: false, weekly_pattern: []
  });
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Module hooks for advanced features
  const { churnRisks, alerts } = usePauseDetection();
  const { shortages, getSuppliersNeedingReorder } = useDemandForecast();
  const { permissions, user } = useAccessControl();

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
  
  // Handle URL parameters for customer selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customer');
    const tab = urlParams.get('tab');
    
    if (customerId && tab === 'customers') {
      // Find and select the customer
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomerForCalendar(customer);
        setSelectedCustomerId(customerId);
        // Clear URL params
        window.history.replaceState({}, '', '/admin');
      }
    }
  }, [customers]);

  // Sync selectedCustomer with selectedCustomerId
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
  }, [selectedCustomerId, customers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, subsRes, productsRes, areasRes, deliveryBoysRes, marketingUsersRes] = await Promise.all([
        api.get('/phase0-v2/customers'),
        api.get('/phase0-v2/subscriptions'),
        api.get('/phase0-v2/products'),
        api.get('/phase0-v2/areas'),
        api.get('/phase0-v2/delivery-boys'),
        api.get('/phase0-v2/users?role=marketing_staff').catch(() => ({ data: [] }))
      ]);
      
      setCustomers(customersRes.data);
      setSubscriptions(subsRes.data);
      setProducts(productsRes.data);
      setAreas(areasRes.data.areas || []);
      setStructuredAreas(areasRes.data.structured_areas || []);
      setDeliveryBoys(deliveryBoysRes.data);
      setMarketingUsers(marketingUsersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(`/phase0-v2/dashboard?stat_date=${filters.delivery_date}`);
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };


  const fetchDeliveryList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ date: filters.delivery_date });
      // Only add filters if they have actual values (not empty strings)
      if (filters.area && filters.area !== 'all') params.append('area', filters.area);
      if (filters.delivery_boy_id && filters.delivery_boy_id !== 'all') params.append('delivery_boy_id', filters.delivery_boy_id);
      if (filters.shift && filters.shift !== 'all') params.append('shift', filters.shift);
      
      const res = await api.get(`/phase0-v2/delivery/generate?${params.toString()}`);
      setDeliveryList(res.data);
    } catch (error) {
      toast.error('Failed to load delivery list');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const params = new URLSearchParams({ date: filters.delivery_date });
      if (filters.area) params.append('area', filters.area);
      if (filters.delivery_boy_id) params.append('delivery_boy_id', filters.delivery_boy_id);
      
      const res = await api.get(`/phase0-v2/delivery/whatsapp-format?${params.toString()}`);
      await navigator.clipboard.writeText(res.data.text);
      toast.success('Delivery list copied to clipboard!');
    } catch (error) {
      toast.error('Failed to generate WhatsApp format');
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: excelExport.start_date,
        end_date: excelExport.end_date
      });
      if (excelExport.area) params.append('area', excelExport.area);
      
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/phase0-v2/delivery/export-excel?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery_report_${excelExport.start_date}_to_${excelExport.end_date}.xlsx`;
      a.click();
      toast.success('Excel downloaded!');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/product-requests?status=pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load requests');
      
      const data = await res.json();
      setPendingRequests(data);
      setPendingCount(data.length);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };
  
  const handleApproveReject = async (requestId, action, notes = '') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/product-requests/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: requestId,
          action: action,
          admin_notes: notes
        })
      });
      
      if (!res.ok) throw new Error('Failed to process request');
      
      toast.success(action === 'approve' ? 'Request approved!' : 'Request rejected');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
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
          toast.warning(`GPS accuracy: ${location.accuracy_meters.toFixed(0)}m. Consider manual entry.`);
        } else {
          toast.success(`Location captured (${location.accuracy_meters.toFixed(0)}m accuracy)`);
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

  const getAutoAssignedDeliveryBoy = (area) => {
    const boyInArea = deliveryBoys.find(db => db.area_assigned === area);
    return boyInArea ? boyInArea.id : '';
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Auto-assign marketing boy if logged in as marketing and no selection
      let marketingBoy = customerForm.marketing_boy;
      let marketingBoyId = customerForm.marketing_boy_id;
      
      if (isMarketing && !marketingBoyId && currentUser) {
        marketingBoyId = currentUser.id;
        marketingBoy = currentUser.name || currentUser.email;
      } else if (marketingBoyId) {
        // Find the marketing user's name from the list
        const selectedUser = marketingUsers.find(u => u.id === marketingBoyId);
        if (selectedUser) {
          marketingBoy = selectedUser.name || selectedUser.email;
        }
      }
      
      // Auto-assign delivery boy based on area if not manually selected
      let deliveryBoyId = customerForm.delivery_boy_id;
      if (!deliveryBoyId && customerForm.area) {
        deliveryBoyId = getAutoAssignedDeliveryBoy(customerForm.area);
      }
      
      const customerData = {
        ...customerForm,
        marketing_boy: marketingBoy,
        marketing_boy_id: marketingBoyId,
        delivery_boy_id: deliveryBoyId,
        status: editingCustomer ? customerForm.status : 'trial'
      };
      
      if (editingCustomer) {
        await api.put(`/phase0-v2/customers/${editingCustomer.id}`, customerData);
        toast.success('Customer updated!');
      } else {
        await api.post('/phase0-v2/customers', customerData);
        toast.success('Customer saved! Add subscription next.');
      }
      
      resetCustomerForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = (customer) => {
    // Check if marketing staff can edit this customer
    if (isMarketing && currentUser) {
      const canEdit = customer.marketing_boy_id === currentUser.id;
      if (!canEdit) {
        toast.error('You can only edit your own customers');
        return;
      }
    }
    
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      area: customer.area,
      map_link: customer.map_link || '',
      notes: customer.notes || '',
      location: customer.location,
      house_image_url: customer.house_image_url || '',
      marketing_boy: customer.marketing_boy || '',
      marketing_boy_id: customer.marketing_boy_id || '',
      delivery_boy_id: customer.delivery_boy_id || '',
      status: customer.status,
      trial_start_date: customer.trial_start_date || ''
    });
    setShowCustomerForm(true);
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
      location: null, house_image_url: '', marketing_boy: '', marketing_boy_id: '', delivery_boy_id: '',
      status: 'trial', trial_start_date: ''
    });
    setEditingCustomer(null);
    setShowCustomerForm(false);
  };

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
      
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/phase0-v2/customers/import/preview`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const data = await res.json();
      setImportPreview(data);
      setShowImportDialog(true);
    } catch (error) {
      toast.error('Failed to preview');
    } finally {
      setLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);
      
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/phase0-v2/customers/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const data = await res.json();
      
      if (data.success) {
        let message = `Successfully imported ${data.imported_count} customers`;
        if (data.failed_count > 0) {
          message += `, ${data.failed_count} failed`;
        }
        toast.success(message, { duration: 5000 });
        
        // Show detailed error report if there are errors
        if (data.errors && data.errors.length > 0) {
          console.log('Import Errors:', data.errors);
          
          // Create error summary
          const errorSummary = data.errors.map(err => 
            `Row ${err.row} (${err.customer_name}): ${err.error}`
          ).join('\n');
          
          // Show first 5 errors in toast
          const firstErrors = data.errors.slice(0, 5).map(err => 
            `Row ${err.row}: ${err.error}`
          ).join('\n');
          
          toast.error(
            `Import completed with errors:\n${firstErrors}${data.errors.length > 5 ? `\n...and ${data.errors.length - 5} more errors` : ''}`,
            { duration: 10000 }
          );
          
          // Download full error report
          const errorBlob = new Blob([
            `Import Error Report\n\n`,
            `Total Rows: ${data.total_rows}\n`,
            `Imported: ${data.imported_count}\n`,
            `Failed: ${data.failed_count}\n\n`,
            `Detailed Errors:\n`,
            errorSummary
          ], { type: 'text/plain' });
          
          const url = window.URL.createObjectURL(errorBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `import_errors_${new Date().toISOString()}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          toast.info('Error report downloaded', { duration: 5000 });
        }
        
        setShowImportDialog(false);
        setImportFile(null);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to import: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/admin/users/create', userForm);
      toast.success('User created successfully!');
      setShowUserDialog(false);
      setUserForm({ name: '', email: '', phone: '', role: 'marketing_staff', password: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`);
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddArea = async () => {
    try {
      if (!areaForm.main_area || !areaForm.sub_area) {
        toast.error('Main area and sub area are required');
        return;
      }
      if (editingArea) {
        await api.put(`/phase0-v2/areas/${editingArea.id}`, areaForm);
        toast.success('Area updated successfully');
      } else {
        await api.post('/phase0-v2/areas', areaForm);
        toast.success('Area added successfully');
      }
      setShowAreaDialog(false);
      setEditingArea(null);
      setAreaForm({ main_area: '', sub_area: '', delivery_boy_ids: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save area');
    }
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setAreaForm({
      main_area: area.main_area,
      sub_area: area.sub_area,
      delivery_boy_ids: area.delivery_boy_ids || []
    });
    setShowAreaDialog(true);
  };

  const handleDeleteArea = async (areaId) => {
    const area = structuredAreas.find(a => a.id === areaId);
    if (!window.confirm(`Delete area "${area?.full_name}"? This will not delete customers.`)) return;
    try {
      await api.delete(`/phase0-v2/areas/${areaId}`);
      toast.success('Area deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete area');
    }
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
                <p className="text-sm text-gray-500">Complete Phase-0 System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/monthly-billing')} className="bg-green-600 hover:bg-green-700" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />Monthly Billing
              </Button>
              {isAdmin && (
                <>
                  <Button onClick={() => navigate('/staff/earnings')} className="bg-orange-600 hover:bg-orange-700" size="sm">
                    <Users className="mr-2 h-4 w-4" />Commission
                  </Button>
                  <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />Settings
                  </Button>
                </>
              )}
              <Button onClick={() => { logout(); navigate('/login'); }} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {stats && (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_customers}</div>
                  <p className="text-xs text-gray-500">{stats.trial_customers} trial, {stats.active_customers} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_subscriptions}</div>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Liters by Area</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.values(stats.liters_by_area || {}).reduce((a, b) => a + b, 0).toFixed(1)}L</div>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    {Object.entries(stats.liters_by_area || {}).map(([area, liters]) => (
                      <div key={area}>{area}: {liters.toFixed(1)}L</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {stats.liters_by_delivery_boy && Object.keys(stats.liters_by_delivery_boy).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Liters by Delivery Boy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">{Object.values(stats.liters_by_delivery_boy).reduce((a, b) => a + b, 0).toFixed(1)}L</div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(stats.liters_by_delivery_boy).map(([boy, liters]) => (
                        <div key={boy} className="flex justify-between">
                          <span>{boy}</span>
                          <span className="font-bold">{liters.toFixed(1)}L</span>
                        </div>
                      ))}
                    </div>
                    {stats.top_delivery_boy && stats.top_delivery_boy.liters > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-green-600 font-bold">🏆 Top Performer: {stats.top_delivery_boy.name} ({stats.top_delivery_boy.liters.toFixed(1)}L)</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Liters by Marketing Boy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">{Object.values(stats.liters_by_marketing_boy).reduce((a, b) => a + b, 0).toFixed(1)}L</div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(stats.liters_by_marketing_boy).map(([boy, liters]) => (
                        <div key={boy} className="flex justify-between">
                          <span>{boy}</span>
                          <span className="font-bold">{liters.toFixed(1)}L</span>
                        </div>
                      ))}
                    </div>
                    {stats.top_marketing_boy && stats.top_marketing_boy.liters > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-green-600 font-bold">🏆 Top Performer: {stats.top_marketing_boy.name} ({stats.top_marketing_boy.liters.toFixed(1)}L)</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Alerts Section from Modules */}
        {churnRisks.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertTriangle className="h-5 w-5" />
                Churn Risk Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {churnRisks.slice(0, 5).map((risk, idx) => (
                  <div key={idx} className="text-sm text-orange-700">
                    <span className="font-medium">{risk.customer_name || 'Customer #' + risk.customer_id}</span>
                    {' '} - Paused for {Math.floor((Date.now() - new Date(risk.paused_date).getTime()) / (1000*60*60*24))} days
                  </div>
                ))}
                {churnRisks.length > 5 && (
                  <p className="text-sm text-orange-600 font-medium mt-2">+{churnRisks.length - 5} more at risk</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {shortages.length > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <TrendingDown className="h-5 w-5" />
                Inventory Shortage Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {shortages.slice(0, 5).map((shortage, idx) => (
                  <div key={idx} className="text-sm text-red-700">
                    <span className="font-medium">{shortage.area}</span>
                    {' '} - Need {shortage.suggested_quantity}L (have {shortage.current_stock}L)
                  </div>
                ))}
                {shortages.length > 5 && (
                  <p className="text-sm text-red-600 font-medium mt-2">+{shortages.length - 5} areas need stock</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="customers">
          <TabsList className="mb-6">
            <TabsTrigger value="customers">Customers ({activeCustomers.length})</TabsTrigger>
            <TabsTrigger value="trial">Trial ({trialCustomers.length})</TabsTrigger>
            <TabsTrigger value="add">Add Customer</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
            <TabsTrigger value="delivery">Delivery List</TabsTrigger>
            <TabsTrigger value="export">Export Excel</TabsTrigger>
            {isAdmin && <TabsTrigger value="import">Import</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {isAdmin && (
              <TabsTrigger value="requests" className="relative">
                Pending Requests
                {pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Customers</CardTitle>
                <Button 
                  variant={calendarViewMode ? 'default' : 'outline'}
                  onClick={() => setCalendarViewMode(!calendarViewMode)}
                  size="sm"
                >
                  {calendarViewMode ? '📅 Calendar View' : '📋 List View'}
                </Button>
              </CardHeader>
              <CardContent>
                {calendarViewMode ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Select a customer to view their subscription calendar:
                    </div>
                    <Select value={selectedCustomerId || ''} onValueChange={(id) => setSelectedCustomerId(id)}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Select a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCustomers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedCustomerId && selectedCustomer && (
                      <div className="mt-6">
                        <SubscriptionCalendarMonth customer={selectedCustomer} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Name</th>
                          <th className="px-4 py-3 text-left">Phone</th>
                          <th className="px-4 py-3 text-left">Area</th>
                          <th className="px-4 py-3 text-left">Delivery Boy</th>
                          <th className="px-4 py-3 text-left">Marketing By</th>
                          <th className="px-4 py-3 text-left">Subscription</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCustomers.map(customer => {
                          const customerSubs = subscriptions.filter(s => s.customer_id === customer.id);
                          const activeSub = customerSubs.find(s => s.status === 'active');
                          const deliveryBoy = deliveryBoys.find(db => db.id === customer.delivery_boy_id);
                          return (
                            <tr key={customer.id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{customer.name}</td>
                              <td className="px-4 py-3">{customer.phone}</td>
                              <td className="px-4 py-3">{customer.area}</td>
                              <td className="px-4 py-3">{deliveryBoy?.name || 'Auto'}</td>
                              <td className="px-4 py-3">{customer.marketing_boy || '-'}</td>
                              <td className="px-4 py-3">
                                {activeSub ? (
                                  <span className="text-green-600">{activeSub.default_qty}L</span>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => handleAddSubscription(customer)}>
                                    <Plus className="h-4 w-4" />
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
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedCustomerForCalendar(customer)} title="Open Calendar">
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  {activeSub && (
                                    <Button size="sm" variant="outline" onClick={() => handleEditSubscription(customer, activeSub)}>
                                      Edit Sub
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trial">
            <Card>
              <CardHeader>
                <CardTitle>Trial Customers</CardTitle>
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
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedCustomerForCalendar(customer)} title="Open Calendar">
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {customerSubs.length === 0 ? (
                              <Button size="sm" variant="outline" onClick={() => handleAddSubscription(customer)}>
                                <Plus className="mr-2 h-4 w-4" />Add Subscription
                              </Button>
                            ) : (
                              <Button onClick={() => confirmTrialCustomer(customer.id)}>
                                <Check className="mr-2 h-4 w-4" />Confirm
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
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
                <CardTitle>Add/Edit Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCustomer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Name *</Label><Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} required /></div>
                    <div><Label>Phone *</Label><Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} required /></div>
                    <div className="col-span-2"><Label>Address</Label><Textarea value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} /></div>
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
                      <Label>Delivery Boy</Label>
                      <Select value={customerForm.delivery_boy_id} onValueChange={(v) => setCustomerForm({ ...customerForm, delivery_boy_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select delivery boy" /></SelectTrigger>
                        <SelectContent>
                          {deliveryBoys.map(db => <SelectItem key={db.id} value={db.id}>{db.name} ({db.area_assigned})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Marketing By</Label>
                      <Select 
                        value={customerForm.marketing_boy_id || (isMarketing ? currentUser?.id : '')} 
                        onValueChange={(v) => setCustomerForm({ ...customerForm, marketing_boy_id: v })}
                      >
                        <SelectTrigger><SelectValue placeholder={isMarketing ? "Your account (default)" : "Select marketing staff"} /></SelectTrigger>
                        <SelectContent>
                          {marketingUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={customerForm.status || 'trial'} onValueChange={(v) => setCustomerForm({ ...customerForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {customerForm.status === 'trial' && (
                      <div>
                        <Label>Trial Start Date (When should delivery start?)</Label>
                        <Input 
                          type="date" 
                          value={customerForm.trial_start_date} 
                          onChange={(e) => setCustomerForm({ ...customerForm, trial_start_date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave blank to start immediately</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Label>GPS Location</Label>
                      <div className="flex gap-2 items-center">
                        <Button type="button" onClick={captureGPSLocation} variant="outline"><MapPin className="mr-2 h-4 w-4" />Capture</Button>
                        <Input placeholder="Lat" type="number" step="any" className="w-32" value={customerForm.location?.lat || ''} 
                          onChange={(e) => setCustomerForm({ ...customerForm, location: { lat: parseFloat(e.target.value) || 0, lng: customerForm.location?.lng || 0 } })} />
                        <Input placeholder="Lng" type="number" step="any" className="w-32" value={customerForm.location?.lng || ''} 
                          onChange={(e) => setCustomerForm({ ...customerForm, location: { lng: parseFloat(e.target.value) || 0, lat: customerForm.location?.lat || 0 } })} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>House Image</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*" onChange={handleImageUpload} />
                        {customerForm.house_image_url && <img src={customerForm.house_image_url} alt="Preview" className="h-20 w-20 object-cover rounded" />}
                      </div>
                    </div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Save')}</Button>
                    <Button type="button" variant="outline" onClick={resetCustomerForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Area Management (Main Area + Sub Area)</CardTitle>
                <Button onClick={() => { setEditingArea(null); setAreaForm({ main_area: '', sub_area: '', delivery_boy_ids: [] }); setShowAreaDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" />Add Area
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Main Area</th>
                        <th className="px-4 py-3 text-left">Sub Area</th>
                        <th className="px-4 py-3 text-left">Customers</th>
                        <th className="px-4 py-3 text-left">Delivery Boys Assigned</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structuredAreas.map(area => {
                        const assignedBoys = deliveryBoys.filter(b => 
                          (b.assigned_areas || []).includes(area.full_name)
                        );
                        return (
                          <tr key={area.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{area.main_area}</td>
                            <td className="px-4 py-3">{area.sub_area}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {customers.filter(c => c.area === area.full_name).length} customers
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {assignedBoys.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {assignedBoys.map(boy => (
                                    <span key={boy.id} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                      {boy.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-red-600">⚠️ No delivery boy assigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEditArea(area)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDeleteArea(area.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {structuredAreas.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No areas created yet. Click "Add Area" to create one.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Delivery List Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 mb-6">
                  <div><Label>Date</Label><Input type="date" value={filters.delivery_date} onChange={(e) => setFilters({ ...filters, delivery_date: e.target.value })} /></div>
                  <div>
                    <Label>Shift</Label>
                    <Select value={filters.shift || 'all'} onValueChange={(v) => setFilters({ ...filters, shift: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Shifts</SelectItem>
                        <SelectItem value="morning">🌅 Morning Only</SelectItem>
                        <SelectItem value="evening">🌆 Evening Only</SelectItem>
                        <SelectItem value="both">🌅🌆 Both Shifts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Select value={filters.area || 'all'} onValueChange={(v) => setFilters({ ...filters, area: v === 'all' ? '' : v, delivery_boy_id: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Delivery Boy</Label>
                    <Select value={filters.delivery_boy_id || 'all'} onValueChange={(v) => setFilters({ ...filters, delivery_boy_id: v === 'all' ? '' : v, area: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Boys</SelectItem>
                        {deliveryBoys.map(db => <SelectItem key={db.id} value={db.id}>{db.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleShareWhatsApp} className="w-full"><Share2 className="mr-2 h-4 w-4" />Copy WhatsApp</Button>
                  </div>
                </div>
                {loading ? <div className="text-center py-8">Loading...</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Phone</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Qty</th>
                          <th className="px-4 py-3 text-left">Area</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryList.map(item => (
                          <tr key={`${item.customer_id}-${item.product_name}`} className="border-t">
                            <td className="px-4 py-3">{item.serial}</td>
                            <td className="px-4 py-3">{item.customer_name}</td>
                            <td className="px-4 py-3">{item.phone}</td>
                            <td className="px-4 py-3">{item.product_name}</td>
                            <td className="px-4 py-3 font-bold">{item.quantity}</td>
                            <td className="px-4 py-3">{item.area}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Excel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <Input type="date" value={excelExport.start_date} onChange={(e) => setExcelExport({ ...excelExport, start_date: e.target.value })} />
                  <Input type="date" value={excelExport.end_date} onChange={(e) => setExcelExport({ ...excelExport, end_date: e.target.value })} />
                  <Select value={excelExport.area || undefined} onValueChange={(v) => setExcelExport({ ...excelExport, area: v || '' })}>
                    <SelectTrigger><SelectValue placeholder="All Areas" /></SelectTrigger>
                    <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={handleExportExcel} disabled={loading}><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>
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
                    <Button onClick={downloadSampleTemplate} variant="outline"><Download className="mr-2 h-4 w-4" />Download Template</Button>
                    <Input type="file" accept=".csv,.xlsx" onChange={handleFileSelect} />
                    <Button onClick={handlePreviewImport} disabled={!importFile || loading}><FileSpreadsheet className="mr-2 h-4 w-4" />Preview</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <>
            <TabsContent value="users">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Button onClick={() => { setShowUserDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add User</Button>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Button onClick={fetchUsers}>Load Users</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Phone</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(user => (
                            <tr key={user.id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{user.name}</td>
                              <td className="px-4 py-3">{user.email}</td>
                              <td className="px-4 py-3">{user.phone || '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                                  user.role === 'marketing_staff' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {user.role === 'admin' ? 'Admin' : 
                                   user.role === 'marketing_staff' ? 'Marketing Staff' :
                                   user.role === 'delivery_boy' ? 'Delivery Boy' : user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {user.role === 'admin' ? (
                                  <span className="text-xs text-gray-500">System Admin</span>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => handleToggleUserStatus(user.id)}>
                                    {user.is_active ? 'Deactivate' : 'Activate'}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Product Requests from Delivery Boys</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map(request => (
                        <div key={request.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{request.customer_name}</h3>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {request.customer_area}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                  <span className="text-gray-600">Product:</span>
                                  <span className="ml-2 font-medium">{request.product_name}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Quantity:</span>
                                  <span className="ml-2 font-medium">{request.quantity_packets} packets ({request.quantity_liters}L)</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Delivery Date:</span>
                                  <span className="ml-2 font-medium">
                                    {request.tentative_date ? new Date(request.tentative_date).toLocaleDateString() : 'Whenever Available'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Requested By:</span>
                                  <span className="ml-2 font-medium">{request.requested_by_name}</span>
                                </div>
                              </div>
                              
                              {request.notes && (
                                <div className="text-sm text-gray-600 mb-3">
                                  <span className="font-medium">Notes:</span> {request.notes}
                                </div>
                              )}
                              
                              <div className="text-xs text-gray-500">
                                Requested: {new Date(request.requested_at).toLocaleString()}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                onClick={() => handleApproveReject(request.id, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                onClick={() => handleApproveReject(request.id, 'reject')}
                                variant="outline"
                                className="border-red-600 text-red-600 hover:bg-red-50"
                                size="sm"
                              >
                                ✗ Reject
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
          </>
          )}
        </Tabs>
      </div>

      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubscription ? 'Edit' : 'Add'} Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={subscriptionForm.product_id} onValueChange={(v) => {
                const product = products.find(p => p.id === v);
                setSubscriptionForm({ ...subscriptionForm, product_id: v, price_per_unit: product?.default_price || 60 });
              }} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.default_price})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Price/Unit *</Label><Input type="number" step="0.01" value={subscriptionForm.price_per_unit} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, price_per_unit: parseFloat(e.target.value) })} required /></div>
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
            <div><Label>Quantity *</Label><Input type="number" step="0.5" min="0.5" value={subscriptionForm.default_qty} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, default_qty: parseFloat(e.target.value) })} required /></div>
            {subscriptionForm.mode === 'weekly_pattern' && (
              <div>
                <Label>Weekly Pattern</Label>
                <Input placeholder="e.g., 0,2,4 for Mon,Wed,Fri" onChange={(e) => {
                  const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 0 && d < 7);
                  setSubscriptionForm({ ...subscriptionForm, weekly_pattern: days });
                }} value={subscriptionForm.weekly_pattern.join(', ')} />
              </div>
            )}
            <div>
              <Label>Status *</Label>
              <Select value={subscriptionForm.status} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="auto_start" checked={subscriptionForm.auto_start} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, auto_start: e.target.checked })} />
              <Label htmlFor="auto_start">Auto-start deliveries</Label>
            </div>
            <Button onClick={handleSaveSubscription} disabled={loading}>{loading ? 'Saving...' : (editingSubscription ? 'Update' : 'Create')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                <div><div className="text-sm">Total</div><div className="text-2xl font-bold">{importPreview.total_rows}</div></div>
                <div><div className="text-sm">Valid</div><div className="text-2xl font-bold text-green-600">{importPreview.valid_rows}</div></div>
                <div><div className="text-sm">Errors</div><div className="text-2xl font-bold text-red-600">{importPreview.errors.length}</div></div>
              </div>
              <Button onClick={handleImportConfirm} disabled={loading}>Import {importPreview.valid_rows} Customers</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="marketing_staff">Marketing Staff</SelectItem>
                  <SelectItem value="delivery_boy">Delivery Boy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {selectedCustomerForCalendar && (
        <CustomerCalendar 
          customer={selectedCustomerForCalendar} 
          onClose={() => setSelectedCustomerForCalendar(null)}
        />
      )}

      {/* Subscription Calendar View */}
      <Dialog open={showSubscriptionCalendar} onOpenChange={setShowSubscriptionCalendar} className="max-w-5xl">
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Subscription Calendar View</DialogTitle>
            <DialogDescription>
              Calendar-centric view of all customer subscriptions with delivery details
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && <SubscriptionCalendarMonth customer={selectedCustomer} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Edit Area' : 'Add New Area'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Main Area *</Label>
              <Input 
                value={areaForm.main_area} 
                onChange={(e) => setAreaForm({ ...areaForm, main_area: e.target.value })} 
                placeholder="e.g., Koramangala, Indiranagar" 
              />
            </div>
            <div>
              <Label>Sub Area *</Label>
              <Input 
                value={areaForm.sub_area} 
                onChange={(e) => setAreaForm({ ...areaForm, sub_area: e.target.value })} 
                placeholder="e.g., 4th Block, 100 Feet Road" 
              />
            </div>
            <div>
              <Label>Assign Delivery Boys (Select Multiple)</Label>
              <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                {deliveryBoys.map(boy => (
                  <label key={boy.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={areaForm.delivery_boy_ids.includes(boy.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAreaForm({ ...areaForm, delivery_boy_ids: [...areaForm.delivery_boy_ids, boy.id] });
                        } else {
                          setAreaForm({ ...areaForm, delivery_boy_ids: areaForm.delivery_boy_ids.filter(id => id !== boy.id) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{boy.name}</span>
                    {boy.assigned_areas && boy.assigned_areas.length > 0 && (
                      <span className="text-xs text-gray-500">({boy.assigned_areas.length} areas)</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Each delivery boy can handle multiple areas</p>
            </div>
            <Button onClick={handleAddArea} className="w-full">
              {editingArea ? 'Update Area' : 'Add Area'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
