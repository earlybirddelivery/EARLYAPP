import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog.jsx';
import { Package, Share2, TrendingUp, Users, LogOut, MapPin, Download, FileSpreadsheet, Settings } from 'lucide-react';
import { logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

export function AdminDashboardV2() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [deliveryList, setDeliveryList] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    area: '',
    delivery_boy_id: ''
  });
  
  const [excelExport, setExcelExport] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    area: ''
  });
  
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

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
      const [areasRes, deliveryBoysRes] = await Promise.all([
        api.get('/phase0-v2/areas'),
        api.get('/phase0-v2/delivery-boys')
      ]);
      setAreas(areasRes.data.areas);
      setDeliveryBoys(deliveryBoysRes.data);
    } catch (error) {
      toast.error('Failed to load initial data');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(`/phase0-v2/dashboard?stat_date=${filters.delivery_date}`);
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    }
  };

  const fetchDeliveryList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ date: filters.delivery_date });
      if (filters.area) params.append('area', filters.area);
      if (filters.delivery_boy_id) params.append('delivery_boy_id', filters.delivery_boy_id);
      
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
      toast.success('Delivery list copied!');
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
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery_report_${excelExport.start_date}_to_${excelExport.end_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel downloaded!');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setLoading(false);
    }
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
        toast.success(`Imported ${data.imported_count} customers!`);
        setShowImportDialog(false);
        setImportFile(null);
        fetchDashboardStats();
      }
    } catch (error) {
      toast.error('Failed to import');
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Complete Phase-0 System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/monthly-billing')} className="bg-green-600 hover:bg-green-700" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />Monthly Billing
              </Button>
              <Button onClick={() => navigate('/staff/earnings')} className="bg-orange-600 hover:bg-orange-700" size="sm">
                <Users className="mr-2 h-4 w-4" />Commission
              </Button>
              <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />Settings
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <div className="text-2xl font-bold">{Object.values(stats.liters_by_area).reduce((a, b) => a + b, 0).toFixed(1)}L</div>
                <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                  {Object.entries(stats.liters_by_area).map(([area, liters]) => (
                    <div key={area}>{area}: {liters}L</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="delivery">
          <TabsList className="mb-6">
            <TabsTrigger value="delivery">Delivery List</TabsTrigger>
            <TabsTrigger value="export">Export Excel</TabsTrigger>
            <TabsTrigger value="import">Import Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Delivery List Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={filters.delivery_date} onChange={(e) => setFilters({ ...filters, delivery_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Select value={filters.area || undefined} onValueChange={(v) => setFilters({ ...filters, area: v || '', delivery_boy_id: '' })}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Delivery Boy</Label>
                    <Select value={filters.delivery_boy_id || undefined} onValueChange={(v) => setFilters({ ...filters, delivery_boy_id: v || '', area: '' })}>
                      <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        {deliveryBoys.map(db => <SelectItem key={db.id} value={db.id}>{db.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleShareWhatsApp} className="w-full">
                      <Share2 className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>

                {loading ? <div className="text-center py-8">Loading...</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Qty</th>
                          <th className="px-4 py-3 text-left">Area</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryList.map(item => (
                          <tr key={`${item.customer_id}-${item.product_name}`}>
                            <td className="px-4 py-3">{item.serial}</td>
                            <td className="px-4 py-3">{item.customer_name}</td>
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
                <div className="grid grid-cols-3 gap-4">
                  <Input type="date" value={excelExport.start_date} onChange={(e) => setExcelExport({ ...excelExport, start_date: e.target.value })} />
                  <Input type="date" value={excelExport.end_date} onChange={(e) => setExcelExport({ ...excelExport, end_date: e.target.value })} />
                  <Button onClick={handleExportExcel} disabled={loading}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>Import Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input type="file" accept=".csv,.xlsx" onChange={handleFileSelect} />
                  <Button onClick={handlePreviewImport} disabled={!importFile || loading}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
    </div>
  );
}
