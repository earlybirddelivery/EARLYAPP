import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Calendar, ArrowLeft, Send, DollarSign, Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const MonthlyBilling = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [billingData, setBillingData] = useState(null);
  const [products, setProducts] = useState([]);
  const [visibleProductIds, setVisibleProductIds] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [filters, setFilters] = useState({
    areas: [],
    payment_status: 'All'
  });
  
  const [areas, setAreas] = useState([]);
  
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    customer: null,
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    notes: ''
  });
  
  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState({
    open: false,
    customer: null,
    message: '',
    whatsapp_url: ''
  });
  
  // QR Settings modal
  const [qrModal, setQrModal] = useState({ open: false });
  const [systemSettings, setSystemSettings] = useState(null);
  const [qrFile, setQrFile] = useState(null);

  // View toggle
  const [currentView, setCurrentView] = useState('edit'); // 'edit' or 'billing'
  
  // Payment inputs per customer
  const [customerPayments, setCustomerPayments] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadMonthlyData();
    }
  }, [selectedMonth]);

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load products
      const productsRes = await fetch(`${API_URL}/api/phase0-v2/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const productsData = await productsRes.json();
      setProducts(productsData);
      setVisibleProductIds(productsData.map(p => p.id));
      
      // Load areas
      const areasRes = await fetch(`${API_URL}/api/phase0-v2/areas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const areasData = await areasRes.json();
      setAreas(areasData.areas || []);
      
      // Load delivery boys
      const boysRes = await fetch(`${API_URL}/api/phase0-v2/delivery-boys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const boysData = await boysRes.json();
      setDeliveryBoys(boysData);
      
      // Load system settings
      const settingsRes = await fetch(`${API_URL}/api/billing/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const settingsData = await settingsRes.json();
      setSystemSettings(settingsData);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load initial data');
    }
  };

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        month: selectedMonth,
        product_ids: visibleProductIds.length === products.length ? null : visibleProductIds,
        areas: filters.areas.length > 0 ? filters.areas : null,
        payment_status: filters.payment_status === 'All' ? null : filters.payment_status
      };
      
      const res = await fetch(`${API_URL}/api/billing/monthly-view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error('Failed to load monthly data');
      }
      
      const data = await res.json();
      setBillingData(data);
      
      // Initialize payment inputs
      const payments = {};
      data.customers.forEach(c => {
        payments[c.customer_id] = '';
      });
      setCustomerPayments(payments);
      
    } catch (error) {
      console.error('Error loading monthly data:', error);
      toast.error('Failed to load monthly billing data');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Check if product uses packet conversion (milk products)
  const isPacketProduct = (product) => {
    return product.unit === 'Liter' || product.unit === 'L';
  };

  // Convert packets to liters (1 packet = 0.5L)
  const packetsToLiters = (packets) => {
    return packets * 0.5;
  };

  // Convert liters to packets for display
  const litersToPackets = (liters) => {
    return Math.round(liters * 2);
  };

  const handleQuantityUpdate = async (customerId, productId, date, packetValue) => {
    try {
      const token = localStorage.getItem('token');
      const product = products.find(p => p.id === productId);
      
      // Convert to liters if it's a packet product
      const actualQuantity = isPacketProduct(product) 
        ? packetsToLiters(parseInt(packetValue) || 0)
        : (parseInt(packetValue) || 0);
      
      await fetch(`${API_URL}/api/billing/monthly-view/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          product_id: productId,
          date: date,
          quantity: actualQuantity,
          shift: 'morning'
        })
      });
      
      toast.success('Quantity updated');
      
      // Update local state
      setBillingData(prev => {
        const newData = {...prev};
        const customerIndex = newData.customers.findIndex(c => c.customer_id === customerId);
        if (customerIndex !== -1) {
          const customer = newData.customers[customerIndex];
          if (customer.products_data[productId]) {
            customer.products_data[productId].daily_quantities[date] = actualQuantity;
            
            // Recalculate totals
            const quantities = Object.values(customer.products_data[productId].daily_quantities);
            const total_qty = quantities.reduce((sum, q) => sum + q, 0);
            const price = customer.products_data[productId].price_per_unit;
            customer.products_data[productId].total_qty = total_qty;
            customer.products_data[productId].total_amount = total_qty * price;
            
            // Recalculate week totals
            customer.products_data[productId].week_totals = {
              'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0, 'Residuary Week': 0
            };
            Object.entries(customer.products_data[productId].daily_quantities).forEach(([date, qty]) => {
              const day = parseInt(date.split('-')[2]);
              const week = getWeekName(day);
              customer.products_data[productId].week_totals[week] += qty;
            });
            
            // Recalculate customer totals
            customer.total_bill_amount = Object.values(customer.products_data).reduce((sum, p) => sum + p.total_amount, 0);
            customer.current_balance = customer.total_bill_amount + customer.previous_balance - customer.amount_paid;
          }
        }
        return newData;
      });
      
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const getWeekName = (day) => {
    if (day <= 7) return 'Week 1';
    if (day <= 14) return 'Week 2';
    if (day <= 21) return 'Week 3';
    if (day <= 28) return 'Week 4';
    return 'Residuary Week';
  };

  const handleShiftChange = async (customerId, newShift) => {
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_URL}/api/phase0-v2/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shift: newShift })
      });
      
      toast.success('Shift updated');
      loadMonthlyData();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    }
  };

  const handleDeliveryBoyChange = async (customerId, newDeliveryBoyId) => {
    try {
      const token = localStorage.getItem('token');
      
      await fetch(`${API_URL}/api/phase0-v2/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delivery_boy_id: newDeliveryBoyId })
      });
      
      toast.success('Delivery boy updated');
      loadMonthlyData();
    } catch (error) {
      console.error('Error updating delivery boy:', error);
      toast.error('Failed to update delivery boy');
    }
  };

  const handleQuickPayment = async (customerId) => {
    const amount = customerPayments[customerId];
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_URL}/api/billing/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          month: selectedMonth,
          amount: parseFloat(amount),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'Cash',
          notes: ''
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to record payment');
      }
      
      toast.success('Payment recorded');
      setCustomerPayments({...customerPayments, [customerId]: ''});
      loadMonthlyData();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const openPaymentModal = (customer) => {
    setPaymentModal({
      open: true,
      customer: customer,
      amount: customer.current_balance > 0 ? customer.current_balance.toString() : '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      notes: ''
    });
  };

  const handlePaymentSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_URL}/api/billing/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: paymentModal.customer.customer_id,
          month: selectedMonth,
          amount: parseFloat(paymentModal.amount),
          payment_date: paymentModal.payment_date,
          payment_method: paymentModal.payment_method,
          notes: paymentModal.notes
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to record payment');
      }
      
      // Also deduct from wallet if payment method is wallet
      if (paymentModal.payment_method === 'wallet') {
        const walletRes = await fetch(`${API_URL}/api/billing/wallet/deduct`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customer_id: paymentModal.customer.customer_id,
            amount: parseFloat(paymentModal.amount),
            reason: `Monthly billing payment for ${selectedMonth}`
          })
        });
        
        if (!walletRes.ok) {
          console.warn('Failed to deduct from wallet, but payment was recorded');
        }
      }
      
      toast.success('Payment recorded successfully');
      setPaymentModal({ ...paymentModal, open: false });
      loadMonthlyData();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const openWhatsAppModal = async (customer) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_URL}/api/billing/whatsapp-message/${customer.customer_id}?month=${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to generate message');
      }
      
      const data = await res.json();
      
      setWhatsappModal({
        open: true,
        customer: customer,
        message: data.message,
        whatsapp_url: data.whatsapp_url
      });
      
    } catch (error) {
      console.error('Error generating WhatsApp message:', error);
      toast.error('Failed to generate WhatsApp message');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    window.open(whatsappModal.whatsapp_url, '_blank');
    setWhatsappModal({ ...whatsappModal, open: false });
  };

  const toggleProductVisibility = (productId) => {
    setVisibleProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleQRUpload = async () => {
    if (!qrFile) {
      toast.error('Please select a file');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', qrFile);
      
      const res = await fetch(`${API_URL}/api/billing/settings/qr-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload QR');
      }
      
      const data = await res.json();
      toast.success('QR code uploaded successfully');
      setSystemSettings({...systemSettings, qr_code_url: data.qr_url});
      setQrModal({ open: false });
      setQrFile(null);
      
    } catch (error) {
      console.error('Error uploading QR:', error);
      toast.error('Failed to upload QR code');
    }
  };

  const getDeliveryBoyName = (deliveryBoyId) => {
    const boy = deliveryBoys.find(b => b.id === deliveryBoyId);
    return boy ? boy.name : 'Unassigned';
  };

  if (loading && !billingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading monthly data...</p>
        </div>
      </div>
    );
  }

  const visibleProducts = products.filter(p => visibleProductIds.includes(p.id));
  const dateList = billingData?.date_list || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Monthly Billing & Editing</h1>
                <p className="text-sm text-gray-600">Excel-like editing with billing summary</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded p-1">
                <Button
                  size="sm"
                  variant={currentView === 'edit' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('edit')}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit View
                </Button>
                <Button
                  size="sm"
                  variant={currentView === 'billing' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('billing')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Billing View
                </Button>
              </div>
              
              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                />
              </div>
              
              {/* QR Settings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrModal({ open: true })}
              >
                QR Settings
              </Button>
              
              {/* Refresh */}
              <Button
                size="sm"
                onClick={loadMonthlyData}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full px-6 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters & Product Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Product Visibility */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Visible Products:</Label>
                <div className="flex flex-wrap gap-3">
                  {products.map(product => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={visibleProductIds.includes(product.id)}
                        onCheckedChange={() => toggleProductVisibility(product.id)}
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {product.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Additional Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={filters.payment_status}
                    onValueChange={(value) => setFilters({...filters, payment_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={loadMonthlyData} className="mt-2">
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit View - Daily Quantities Grid */}
        {currentView === 'edit' && billingData && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Quantity Editing - {selectedMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-semibold border sticky left-0 bg-gray-100 z-20">S.No</th>
                      <th className="p-2 text-left font-semibold border sticky left-12 bg-gray-100 z-20">Customer</th>
                      <th className="p-2 text-left font-semibold border">Phone</th>
                      <th className="p-2 text-left font-semibold border">Area</th>
                      <th className="p-2 text-left font-semibold border">Delivery Boy</th>
                      <th className="p-2 text-left font-semibold border">Shift</th>
                      
                      {/* Product headers with daily columns */}
                      {visibleProducts.map(product => (
                        <th key={product.id} className="p-2 text-center font-semibold border bg-blue-50" colSpan={dateList.length}>
                          {product.name} ({isPacketProduct(product) ? 'Packets' : product.unit})
                        </th>
                      ))}
                      
                      {/* Paid column */}
                      <th className="p-2 text-center font-semibold border bg-green-50 sticky right-0 z-20">Paid (₹)</th>
                    </tr>
                    
                    {/* Day numbers sub-header */}
                    <tr className="bg-gray-50">
                      <th className="p-1 border sticky left-0 bg-gray-50 z-20"></th>
                      <th className="p-1 border sticky left-12 bg-gray-50 z-20"></th>
                      <th className="p-1 border"></th>
                      <th className="p-1 border"></th>
                      <th className="p-1 border"></th>
                      <th className="p-1 border"></th>
                      
                      {visibleProducts.map(product => (
                        <React.Fragment key={`days-${product.id}`}>
                          {dateList.map(date => {
                            const day = date.split('-')[2];
                            return (
                              <th key={`${product.id}-${date}`} className="p-1 text-center text-xs border min-w-[50px]">
                                {parseInt(day)}
                              </th>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      
                      <th className="p-1 border sticky right-0 bg-gray-50 z-20"></th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {billingData.customers.map((customer, index) => (
                      <tr key={customer.customer_id} className="hover:bg-gray-50">
                        <td className="p-2 border sticky left-0 bg-white z-10">{index + 1}</td>
                        <td className="p-2 border font-medium sticky left-12 bg-white z-10 min-w-[150px]">
                          <button
                            onClick={() => navigate(`/admin?tab=customers&customer=${customer.customer_id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-left w-full"
                          >
                            {customer.customer_name}
                          </button>
                        </td>
                        <td className="p-2 border">{customer.phone}</td>
                        <td className="p-2 border">{customer.area}</td>
                        <td className="p-1 border">
                          <select
                            value={customer.delivery_boy || ''}
                            onChange={(e) => handleDeliveryBoyChange(customer.customer_id, e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="">Unassigned</option>
                            {deliveryBoys.map(boy => (
                              <option key={boy.id} value={boy.id}>
                                {boy.name} ({boy.area_assigned})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1 border">
                          <select
                            value={customer.shift || 'morning'}
                            onChange={(e) => handleShiftChange(customer.customer_id, e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-blue-500 outline-none capitalize"
                          >
                            <option value="morning">Morning</option>
                            <option value="evening">Evening</option>
                            <option value="both">Both</option>
                          </select>
                        </td>
                        
                        {/* Daily quantity cells for each product */}
                        {visibleProducts.map(product => {
                          const productData = customer.products_data[product.id];
                          return (
                            <React.Fragment key={`${customer.customer_id}-${product.id}`}>
                              {dateList.map(date => {
                                const actualQuantity = productData?.daily_quantities[date] || 0;
                                // Display as packets for milk products
                                const displayValue = isPacketProduct(product) 
                                  ? litersToPackets(actualQuantity) 
                                  : actualQuantity;
                                
                                return (
                                  <td key={`${customer.customer_id}-${product.id}-${date}`} className="p-0 border">
                                    <input
                                      type="number"
                                      step="1"
                                      min="0"
                                      value={displayValue}
                                      onChange={(e) => handleQuantityUpdate(customer.customer_id, product.id, date, e.target.value)}
                                      className="w-full h-full px-2 py-1 text-center border-0 focus:ring-2 focus:ring-blue-500 outline-none"
                                      style={{ minWidth: '50px' }}
                                    />
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Paid input */}
                        <td className="p-1 border sticky right-0 bg-white z-10">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={customerPayments[customer.customer_id] || ''}
                              onChange={(e) => setCustomerPayments({
                                ...customerPayments,
                                [customer.customer_id]: e.target.value
                              })}
                              placeholder="0"
                              className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleQuickPayment(customer.customer_id)}
                              disabled={!customerPayments[customer.customer_id]}
                              className="px-2 py-1 h-7"
                            >
                              ✓
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing View - Summary with Week Totals */}
        {currentView === 'billing' && billingData && (
          <Card>
            <CardHeader>
              <CardTitle>Billing Summary - {selectedMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left font-semibold border">S.No</th>
                      <th className="p-3 text-left font-semibold border">Customer</th>
                      <th className="p-3 text-left font-semibold border">Phone</th>
                      <th className="p-3 text-left font-semibold border">Area</th>
                      <th className="p-3 text-left font-semibold border">Delivery Boy</th>
                      <th className="p-3 text-left font-semibold border">Shift</th>
                      
                      {visibleProducts.map(product => (
                        <th key={product.id} className="p-3 text-center font-semibold border bg-blue-50" colSpan="5">
                          {product.name}
                        </th>
                      ))}
                      
                      <th className="p-3 text-right font-semibold border bg-green-50">Total Bill</th>
                      <th className="p-3 text-right font-semibold border bg-yellow-50">Paid</th>
                      <th className="p-3 text-right font-semibold border bg-orange-50">Prev Balance</th>
                      <th className="p-3 text-right font-semibold border bg-red-50">Current Balance</th>
                      <th className="p-3 text-center font-semibold border">Status</th>
                      <th className="p-3 text-center font-semibold border">Actions</th>
                    </tr>
                    
                    <tr className="bg-gray-50">
                      <th className="p-2 border"></th>
                      <th className="p-2 border"></th>
                      <th className="p-2 border"></th>
                      <th className="p-2 border"></th>
                      <th className="p-2 border"></th>
                      <th className="p-2 border"></th>
                      
                      {visibleProducts.map(product => (
                        <React.Fragment key={`week-header-${product.id}`}>
                          <th className="p-2 text-center text-xs border">W1</th>
                          <th className="p-2 text-center text-xs border">W2</th>
                          <th className="p-2 text-center text-xs border">W3</th>
                          <th className="p-2 text-center text-xs border">W4</th>
                          <th className="p-2 text-center text-xs border">Res</th>
                        </React.Fragment>
                      ))}
                      
                      <th className="p-2 border" colSpan="6"></th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {billingData.customers.map((customer, index) => (
                      <tr key={customer.customer_id} className="hover:bg-gray-50">
                        <td className="p-3 border">{index + 1}</td>
                        <td className="p-3 border font-medium">
                          <button
                            onClick={() => navigate(`/admin?tab=customers&customer=${customer.customer_id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-left w-full"
                          >
                            {customer.customer_name}
                          </button>
                        </td>
                        <td className="p-3 border">{customer.phone}</td>
                        <td className="p-3 border">{customer.area}</td>
                        <td className="p-2 border">
                          <select
                            value={customer.delivery_boy || ''}
                            onChange={(e) => handleDeliveryBoyChange(customer.customer_id, e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="">Unassigned</option>
                            {deliveryBoys.map(boy => (
                              <option key={boy.id} value={boy.id}>
                                {boy.name} ({boy.area_assigned})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select
                            value={customer.shift || 'morning'}
                            onChange={(e) => handleShiftChange(customer.customer_id, e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none capitalize"
                          >
                            <option value="morning">Morning</option>
                            <option value="evening">Evening</option>
                            <option value="both">Both</option>
                          </select>
                        </td>
                        
                        {visibleProducts.map(product => {
                          const productData = customer.products_data[product.id];
                          return (
                            <React.Fragment key={`${customer.customer_id}-${product.id}`}>
                              {productData ? (
                                <>
                                  <td className="p-2 text-center border">{productData.week_totals['Week 1'].toFixed(1)}</td>
                                  <td className="p-2 text-center border">{productData.week_totals['Week 2'].toFixed(1)}</td>
                                  <td className="p-2 text-center border">{productData.week_totals['Week 3'].toFixed(1)}</td>
                                  <td className="p-2 text-center border">{productData.week_totals['Week 4'].toFixed(1)}</td>
                                  <td className="p-2 text-center border">{productData.week_totals['Residuary Week'].toFixed(1)}</td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2 text-center border text-gray-400">-</td>
                                  <td className="p-2 text-center border text-gray-400">-</td>
                                  <td className="p-2 text-center border text-gray-400">-</td>
                                  <td className="p-2 text-center border text-gray-400">-</td>
                                  <td className="p-2 text-center border text-gray-400">-</td>
                                </>
                              )}
                            </React.Fragment>
                          );
                        })}
                        
                        <td className="p-3 text-right border font-semibold">₹{customer.total_bill_amount.toFixed(2)}</td>
                        <td className="p-3 text-right border">₹{customer.amount_paid.toFixed(2)}</td>
                        <td className="p-3 text-right border">₹{customer.previous_balance.toFixed(2)}</td>
                        <td className={`p-3 text-right border font-semibold ${customer.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{customer.current_balance.toFixed(2)}
                        </td>
                        <td className="p-3 text-center border">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            customer.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                            customer.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {customer.payment_status}
                          </span>
                        </td>
                        <td className="p-3 border">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentModal(customer)}
                              title="Record Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openWhatsAppModal(customer)}
                              title="Send WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(open) => setPaymentModal({...paymentModal, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment - {paymentModal.customer?.customer_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm"><strong>Current Balance:</strong> ₹{paymentModal.customer?.current_balance.toFixed(2)}</p>
            </div>
            
            <div>
              <Label>Amount*</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentModal.amount}
                onChange={(e) => setPaymentModal({...paymentModal, amount: e.target.value})}
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <Label>Payment Date*</Label>
              <Input
                type="date"
                value={paymentModal.payment_date}
                onChange={(e) => setPaymentModal({...paymentModal, payment_date: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Payment Method*</Label>
              <Select
                value={paymentModal.payment_method}
                onValueChange={(value) => setPaymentModal({...paymentModal, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="QR">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Input
                value={paymentModal.notes}
                onChange={(e) => setPaymentModal({...paymentModal, notes: e.target.value})}
                placeholder="Optional notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal({...paymentModal, open: false})}>
              Cancel
            </Button>
            <Button onClick={handlePaymentSubmit} disabled={!paymentModal.amount}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal */}
      <Dialog open={whatsappModal.open} onOpenChange={(open) => setWhatsappModal({...whatsappModal, open})}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>WhatsApp Message - {whatsappModal.customer?.customer_name}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">{whatsappModal.message}</pre>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappModal({...whatsappModal, open: false})}>
              Close
            </Button>
            <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Settings Modal */}
      <Dialog open={qrModal.open} onOpenChange={(open) => setQrModal({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {systemSettings?.qr_code_url && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Current QR Code:</p>
                <img src={systemSettings.qr_code_url} alt="QR Code" className="max-w-xs mx-auto" />
              </div>
            )}
            
            <div>
              <Label>Upload New QR Code</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setQrFile(e.target.files[0])}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrModal({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleQRUpload} disabled={!qrFile}>
              Upload QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
