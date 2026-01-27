import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Package, RefreshCw, Download, Calendar, Filter, Users, User, Sunrise, Sunset,
  CheckCircle, Clock, XCircle, Box, Share2, Link as LinkIcon, Copy, Trash2, ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { InlineDeliveryActions } from '../components/InlineDeliveryActions';
import { CustomerDetailsModal } from '../components/CustomerDetailsModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const DeliveryListGenerator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Filters - Get today's date in local timezone
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [deliveryDate, setDeliveryDate] = useState(getTodayDate());
  const [selectedShift, setSelectedShift] = useState('All Shifts');
  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('All Boys');
  const [selectedMarketingStaff, setSelectedMarketingStaff] = useState('All Staff');
  const [selectedProduct, setSelectedProduct] = useState('All Products');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  // Data
  const [deliveries, setDeliveries] = useState([]);
  const [pausedDeliveries, setPausedDeliveries] = useState([]);
  const [stoppedDeliveries, setStoppedDeliveries] = useState([]);
  const [addedProducts, setAddedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [marketingStaff, setMarketingStaff] = useState([]);

  // Statistics
  const [stats, setStats] = useState({
    morning: 0,
    evening: 0,
    totalQty: 0,
    customers: 0,
    delivered: 0,
    pending: 0,
    notDelivered: 0
  });

  // Shared Links Management
  const [savedLinks, setSavedLinks] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditData, setAuditData] = useState({ access_logs: [], action_logs: [], link_info: {} });
  const [linkForm, setLinkForm] = useState({
    name: '',
    expires_days: 30,
    auto_renew_daily: true,
    require_login: false
  });

  // Customer Details Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    loadProducts();
    loadDeliveries();
    loadPausedDeliveries();
    loadStoppedDeliveries();
    loadAddedProducts();
    loadDropdownData();
    loadSavedLinks();
  }, [deliveryDate]);

  useEffect(() => {
    calculateStats();
  }, [deliveries, selectedShift, selectedArea, selectedDeliveryBoy, selectedMarketingStaff, selectedProduct, selectedStatus]);

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load delivery boys - using correct admin endpoint
      try {
        const boysRes = await fetch(`${API_URL}/api/phase0-v2/users?role=delivery_boy`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (boysRes.ok) {
          const boysData = await boysRes.json();
          setDeliveryBoys(boysData);
        }
      } catch (err) {
        console.log('Could not load delivery boys:', err);
      }

      // Load marketing staff - using correct admin endpoint
      try {
        const staffRes = await fetch(`${API_URL}/api/phase0-v2/users?role=marketing_staff`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setMarketingStaff(staffData);
        }
      } catch (err) {
        console.log('Could not load marketing staff:', err);
      }

      // Extract unique areas from deliveries
      const uniqueAreas = [...new Set(deliveries.map(d => d.area).filter(Boolean))];
      setAreas(uniqueAreas);

    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Use the correct admin/marketing endpoint for delivery list
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/generate?date=${deliveryDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to load deliveries');
      }

      const data = await res.json();

      // The API returns an array of delivery items directly
      // Transform to group by customer
      const groupedByCustomer = {};
      data.forEach(item => {
        const key = item.customer_id;
        if (!groupedByCustomer[key]) {
          groupedByCustomer[key] = {
            customer_id: item.customer_id,
            customer_name: item.customer_name,
            phone: item.phone,
            area: item.area,
            address: item.address || '',
            shift: item.shift || 'morning',
            delivery_boy_name: item.delivery_boy_name || 'RUDRESH',
            marketing_staff_name: item.marketing_staff_name || '',
            delivery_status: item.delivery_status || 'pending',
            products: []
          };
        }
        groupedByCustomer[key].products.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_packets: item.quantity_packets || item.quantity,
          quantity_liters: item.quantity_liters || (item.quantity * 0.5)
        });
      });

      const deliveriesArray = Object.values(groupedByCustomer);
      console.log('Loaded deliveries:', deliveriesArray.length, deliveriesArray);
      setDeliveries(deliveriesArray);

      // Extract unique areas from loaded deliveries
      const uniqueAreas = [...new Set(deliveriesArray.map(d => d.area).filter(Boolean))];
      setAreas(uniqueAreas);

      toast.success(`Loaded ${deliveriesArray.length} deliveries`);

    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error(error.message || 'Failed to load delivery list');
    } finally {
      setLoading(false);
    }
  };

  // Load paused deliveries
  const loadPausedDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/paused?date=${deliveryDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Group by customer
        const groupedByCustomer = {};
        (Array.isArray(data) ? data : data.items || []).forEach(item => {
          const key = item.customer_id;
          if (!groupedByCustomer[key]) {
            groupedByCustomer[key] = {
              customer_id: item.customer_id,
              customer_name: item.customer_name,
              phone: item.phone,
              area: item.area,
              address: item.address || '',
              shift: item.shift || 'morning',
              delivery_boy_name: item.delivery_boy_name || 'RUDRESH',
              delivery_status: 'paused',
              products: []
            };
          }
          groupedByCustomer[key].products.push({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity_packets: item.quantity_packets || item.quantity,
            pause_id: item.pause_id,
            pause_reason: item.pause_reason || 'Temporarily paused'
          });
        });
        setPausedDeliveries(Object.values(groupedByCustomer));
      }
    } catch (error) {
      console.error('Error loading paused deliveries:', error);
    }
  };

  // Load stopped deliveries
  const loadStoppedDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/stopped`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setStoppedDeliveries(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error('Error loading stopped deliveries:', error);
    }
  };

  // Load added products (one-time additions)
  const loadAddedProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/added-products?date=${deliveryDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Added products loaded:', data); // Debug log
        setAddedProducts(Array.isArray(data) ? data : data.items || []);
      }
    } catch (error) {
      console.error('Error loading added products:', error);
    }
  };

  // Delete added product
  const deleteAddedProduct = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/added-product/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Added product deleted');
        loadAddedProducts(); // Reload list
      } else {
        toast.error('Failed to delete added product');
      }
    } catch (error) {
      console.error('Error deleting added product:', error);
      toast.error('Error deleting product');
    }
  };

  const calculateStats = () => {
    const filtered = getFilteredDeliveries();

    let morning = 0;
    let evening = 0;
    let totalQty = 0;
    let delivered = 0;
    let pending = 0;
    let notDelivered = 0;

    filtered.forEach(delivery => {
      // Count by shift
      if (delivery.shift?.toLowerCase().includes('morning') || delivery.shift?.toLowerCase().includes('am')) {
        morning++;
      } else if (delivery.shift?.toLowerCase().includes('evening') || delivery.shift?.toLowerCase().includes('pm')) {
        evening++;
      }

      // Sum total quantity
      delivery.products?.forEach(product => {
        totalQty += parseFloat(product.quantity_packets || 0);
      });

      // Count by delivery status
      if (delivery.delivery_status === 'delivered') {
        delivered++;
      } else if (delivery.delivery_status === 'not_delivered') {
        notDelivered++;
      } else {
        pending++;
      }
    });

    setStats({
      morning,
      evening,
      totalQty: totalQty.toFixed(1),
      customers: filtered.length,
      delivered,
      pending,
      notDelivered
    });
  };

  const getFilteredDeliveries = () => {
    return deliveries.filter(delivery => {
      // Filter by shift
      if (selectedShift !== 'All Shifts') {
        if (!delivery.shift || !delivery.shift.toLowerCase().includes(selectedShift.toLowerCase())) {
          return false;
        }
      }

      // Filter by area
      if (selectedArea !== 'All Areas' && delivery.area !== selectedArea) {
        return false;
      }

      // Filter by delivery boy
      if (selectedDeliveryBoy !== 'All Boys' && delivery.delivery_boy_name !== selectedDeliveryBoy) {
        return false;
      }

      // Filter by marketing staff
      if (selectedMarketingStaff !== 'All Staff' && delivery.marketing_staff_name !== selectedMarketingStaff) {
        return false;
      }

      // Filter by product
      if (selectedProduct !== 'All Products') {
        const hasProduct = delivery.products?.some(p => p.product_name === selectedProduct);
        if (!hasProduct) return false;
      }

      // Filter by status
      if (selectedStatus !== 'All Status') {
        if (selectedStatus === 'Delivered' && delivery.delivery_status !== 'delivered') return false;
        if (selectedStatus === 'Pending' && delivery.delivery_status === 'delivered') return false;
        if (selectedStatus === 'Not Delivered' && delivery.delivery_status !== 'not_delivered') return false;
      }

      return true;
    });
  };

  const handleExportCSV = () => {
    const filtered = getFilteredDeliveries();

    // Create CSV header
    let csv = '#,Customer,Phone,Product,Qty,Area,Shift,Delivery Boy\n';

    // Add rows
    filtered.forEach((delivery, index) => {
      delivery.products?.forEach((product, pIndex) => {
        const rowNum = pIndex === 0 ? index + 1 : '';
        const customer = pIndex === 0 ? delivery.customer_name : '';
        const phone = pIndex === 0 ? delivery.phone : '';
        const area = pIndex === 0 ? delivery.area : '';
        const shift = pIndex === 0 ? delivery.shift : '';
        const deliveryBoy = pIndex === 0 ? (delivery.delivery_boy_name || 'RUDRESH') : '';

        csv += `${rowNum},"${customer}","${phone}","${product.product_name}",${product.quantity_packets},"${area}","${shift}","${deliveryBoy}"\n`;
      });
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-list-${deliveryDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  const handleCopyWhatsApp = () => {
    const filtered = getFilteredDeliveries();

    if (filtered.length === 0 && addedProducts.length === 0) {
      toast.error('No deliveries or products to copy');
      return;
    }

    let message = `*📋 Delivery List - ${deliveryDate}*\n`;
    message += `*Total: ${filtered.length} customers`;
    if (addedProducts.length > 0) {
      message += ` + ${addedProducts.length} added products`;
    }
    message += `*\n`;
    message += `${'─'.repeat(40)}\n\n`;

    // Create table header
    message += `\`\`\`\n`;
    message += `# | Customer      | Phone      | Product        | Qty | Area\n`;
    message += `${'-'.repeat(70)}\n`;

    let rowNum = 1;

    // Add regular deliveries
    filtered.forEach((delivery, index) => {
      delivery.products?.forEach((product, pIndex) => {
        const currentRowNum = pIndex === 0 ? String(rowNum).padEnd(2) : '  ';
        const customer = pIndex === 0 ? delivery.customer_name.substring(0, 13).padEnd(13) : ' '.repeat(13);
        const phone = pIndex === 0 ? delivery.phone.substring(0, 10).padEnd(10) : ' '.repeat(10);
        const productName = product.product_name.substring(0, 14).padEnd(14);
        const qty = String(product.quantity_packets).padEnd(4);
        const area = pIndex === 0 ? delivery.area.substring(0, 15) : '';

        message += `${currentRowNum} | ${customer} | ${phone} | ${productName} | ${qty} | ${area}\n`;
        if (pIndex === 0) rowNum++;
      });
    });

    // Add section for added products
    if (addedProducts.length > 0) {
      message += `${'-'.repeat(70)}\n`;
      message += `\n*➕ ADDITIONAL PRODUCTS*\n`;
      message += `${'-'.repeat(70)}\n`;
      
      addedProducts.forEach((product) => {
        const productName = (product.product_name || 'N/A').substring(0, 14).padEnd(14);
        const qty = String(product.quantity_packets || 0).padEnd(4);
        const area = (product.area || 'N/A').substring(0, 15).padEnd(15);
        const customerName = (product.customer_name || 'N/A').substring(0, 13).padEnd(13);
        const phone = (product.phone || 'N/A').substring(0, 10).padEnd(10);
        
        message += `${String(rowNum).padEnd(2)} | ${customerName} | ${phone} | ${productName} | ${qty} | ${area}\n`;
        rowNum++;
      });
    }

    message += `\`\`\`\n\n`;
    message += `_Generated from EarlyBird Delivery System_`;

    navigator.clipboard.writeText(message).then(() => {
      toast.success(`✓ Copied ${filtered.length} deliveries + ${addedProducts.length} added products!`);
    }).catch((err) => {
      console.error('Clipboard error:', err);
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleRefresh = () => {
    loadDeliveries();
    toast.success('Refreshed');
  };

  // Shared Links Functions
  const loadSavedLinks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/shared-delivery-links`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedLinks(data);
      }
    } catch (error) {
      console.error('Error loading saved links:', error);
    }
  };

  const handleSaveFilter = async () => {
    if (!linkForm.name.trim()) {
      toast.error('Please enter a name for this link');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const linkData = {
        name: linkForm.name,
        delivery_boy_name: selectedDeliveryBoy !== 'All Boys' ? selectedDeliveryBoy : null,
        area: selectedArea !== 'All Areas' ? selectedArea : null,
        shift: selectedShift !== 'All Shifts' ? selectedShift.toLowerCase() : null,
        date: deliveryDate,
        expires_days: linkForm.expires_days,
        auto_renew_daily: linkForm.auto_renew_daily,
        require_login: linkForm.require_login,
        added_products: addedProducts  // Include added products in the shared filter
      };

      const res = await fetch(`${API_URL}/api/shared-delivery-links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(linkData)
      });

      if (!res.ok) throw new Error('Failed to create shared link');

      const result = await res.json();
      toast.success('Shared link created successfully!');

      // Reset form and reload links
      setLinkForm({ name: '', expires_days: 30, auto_renew_daily: true, require_login: false });
      setShowSaveModal(false);
      loadSavedLinks();

      // Copy the link to clipboard
      navigator.clipboard.writeText(result.share_url);
      toast.success('Link copied to clipboard!');

    } catch (error) {
      console.error('Error creating shared link:', error);
      toast.error('Failed to create shared link');
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this shared link?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/shared-delivery-links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete link');

      toast.success('Link deleted successfully');
      loadSavedLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to delete link');
    }
  };

  const handleCopyLink = (linkId) => {
    const shareUrl = `${window.location.origin}/shared-delivery/${linkId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleViewAuditLogs = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/shared-delivery-links/${linkId}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to load audit logs');

      const data = await res.json();
      setAuditData(data);
      setShowAuditModal(true);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    }
  };

  const filtered = getFilteredDeliveries();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">Delivery List Generator</h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-600">{filtered.length} deliveries found</span>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            {/* Date Picker */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                Date
              </Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Shift Filter */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                Shift
              </Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Shifts">All Shifts</SelectItem>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Area Filter */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Filter className="w-3 h-3" />
                Area
              </Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Areas">All Areas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Boy Filter */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <User className="w-3 h-3" />
                Delivery Boy
              </Label>
              <Select value={selectedDeliveryBoy} onValueChange={setSelectedDeliveryBoy}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Boys">All Boys</SelectItem>
                  {deliveryBoys.map(boy => (
                    <SelectItem key={boy.id} value={boy.name}>{boy.name}</SelectItem>
                  ))}
                  <SelectItem value="RUDRESH">RUDRESH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Marketing Staff Filter */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" />
                Marketing Staff
              </Label>
              <Select value={selectedMarketingStaff} onValueChange={setSelectedMarketingStaff}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Staff">All Staff</SelectItem>
                  {marketingStaff.map(staff => (
                    <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Filter */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <Box className="w-3 h-3" />
                Product
              </Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Products">All Products</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.name}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="col-span-1">
              <Label className="text-xs flex items-center gap-1 mb-1">
                <CheckCircle className="w-3 h-3" />
                Delivery Status
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Not Delivered">Not Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="col-span-1 flex items-end gap-1">
              <Button onClick={handleRefresh} variant="outline" size="sm" className="h-9 flex-1">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 flex-1">
                <Download className="w-4 h-4" />
              </Button>
              <Button onClick={handleCopyWhatsApp} className="h-9 flex-1 bg-green-600 hover:bg-green-700">
                <span className="text-sm">WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Save & Share Row */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              onClick={() => setShowSaveModal(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Save & Share Filter
            </Button>

            {savedLinks.length > 0 && (
              <Button
                onClick={() => setShowLinksModal(true)}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                View Saved Links ({savedLinks.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {/* Morning */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-3">
            <div className="flex items-center gap-2 text-orange-700 text-xs font-medium mb-1">
              <Sunrise className="w-4 h-4" />
              Morning
            </div>
            <div className="text-3xl font-bold text-orange-700">{stats.morning}</div>
          </div>

          {/* Evening */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-3">
            <div className="flex items-center gap-2 text-purple-700 text-xs font-medium mb-1">
              <Sunset className="w-4 h-4" />
              Evening
            </div>
            <div className="text-3xl font-bold text-purple-700">{stats.evening}</div>
          </div>

          {/* Total Qty */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-3">
            <div className="flex items-center gap-2 text-green-700 text-xs font-medium mb-1">
              <Package className="w-4 h-4" />
              Total Qty
            </div>
            <div className="text-3xl font-bold text-green-700">{stats.totalQty}</div>
          </div>

          {/* Customers */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-3">
            <div className="flex items-center gap-2 text-blue-700 text-xs font-medium mb-1">
              <Users className="w-4 h-4" />
              Customers
            </div>
            <div className="text-3xl font-bold text-blue-700">{stats.customers}</div>
          </div>

          {/* Delivered */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-3">
            <div className="flex items-center gap-2 text-green-700 text-xs font-medium mb-1">
              <CheckCircle className="w-4 h-4" />
              Delivered
            </div>
            <div className="text-3xl font-bold text-green-700">{stats.delivered}</div>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-3">
            <div className="flex items-center gap-2 text-yellow-700 text-xs font-medium mb-1">
              <Clock className="w-4 h-4" />
              Pending
            </div>
            <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
          </div>

          {/* Not Delivered */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-3">
            <div className="flex items-center gap-2 text-red-700 text-xs font-medium mb-1">
              <XCircle className="w-4 h-4" />
              Not Delivered
            </div>
            <div className="text-3xl font-bold text-red-700">{stats.notDelivered}</div>
          </div>
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Product</th>
                  <th className="px-4 py-3 text-center font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Area</th>
                  <th className="px-4 py-3 text-left font-semibold">Shift</th>
                  <th className="px-4 py-3 text-left font-semibold">Delivery Boy</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((delivery, index) => {
                  const rowSpan = delivery.products?.length || 1;

                  return delivery.products?.map((product, pIndex) => (
                    <tr
                      key={`${delivery.customer_id}-${pIndex}`}
                      className={`border-b hover:bg-gray-50 ${
                        delivery.delivery_status === 'delivered' ? 'bg-green-50' : ''
                      }`}
                    >
                      {pIndex === 0 && (
                        <>
                          <td rowSpan={rowSpan} className="px-4 py-3 text-center align-top">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                              {index + 1}
                            </span>
                          </td>
                          <td rowSpan={rowSpan} className="px-4 py-3 align-top">
                            <div
                              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                              onClick={() => {
                                setSelectedCustomer({
                                  id: delivery.customer_id,
                                  name: delivery.customer_name
                                });
                                setShowCustomerModal(true);
                              }}
                            >
                              {delivery.customer_name}
                            </div>
                          </td>
                          <td rowSpan={rowSpan} className="px-4 py-3 align-top">
                            <div className="text-gray-700">{delivery.phone}</div>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{product.product_name}</div>
                      </td>
                      <InlineDeliveryActions
                        delivery={delivery}
                        product={{ ...product, isFirstProduct: pIndex === 0 }}
                        deliveryDate={deliveryDate}
                        deliveryBoys={deliveryBoys}
                        allProducts={products}
                        areas={areas}
                        onUpdate={() => {
                          loadDeliveries();
                          loadPausedDeliveries();
                          loadStoppedDeliveries();
                          loadAddedProducts();
                        }}
                      />
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No deliveries found for the selected filters</p>
          </div>
        )}

        {/* PAUSED DELIVERIES SECTION */}
        {pausedDeliveries.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
              <h2 className="text-lg font-bold text-orange-700">Paused Deliveries ({pausedDeliveries.length})</h2>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Paused for today</span>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 border-b text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Product</th>
                    <th className="px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Area</th>
                  </tr>
                </thead>
                <tbody>
                  {pausedDeliveries.map((delivery, index) => 
                    delivery.products?.map((product, pIndex) => (
                      <tr key={`paused-${delivery.customer_id}-${pIndex}`} className="border-b hover:bg-orange-50 bg-orange-50">
                        {pIndex === 0 && (
                          <>
                            <td rowSpan={delivery.products.length} className="px-4 py-3 text-center align-top">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>
                            <td rowSpan={delivery.products.length} className="px-4 py-3 align-top font-medium text-orange-700">
                              {delivery.customer_name}
                            </td>
                            <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
                              <div className="text-gray-700">{delivery.phone}</div>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{product.product_name}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-orange-100 text-orange-700 rounded-md font-semibold">
                            {product.quantity_packets}
                          </span>
                        </td>
                        {pIndex === 0 && (
                          <>
                            <td rowSpan={delivery.products.length} className="px-4 py-3 align-top text-sm text-orange-700">
                              {product.pause_reason || 'Paused'}
                            </td>
                            <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
                              <div className="text-gray-700">{delivery.area}</div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STOPPED DELIVERIES SECTION */}
        {stoppedDeliveries.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-red-600 rounded-full"></div>
              <h2 className="text-lg font-bold text-red-700">Stopped Deliveries ({stoppedDeliveries.length})</h2>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Permanently stopped</span>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-red-50 border-b text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Product</th>
                    <th className="px-4 py-3 text-left font-semibold">Area</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Stopped At</th>
                  </tr>
                </thead>
                <tbody>
                  {stoppedDeliveries.map((item, index) => (
                    <tr key={item.stop_id} className="border-b hover:bg-red-50 bg-red-50">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-red-700">{item.customer_name}</td>
                      <td className="px-4 py-3">{item.phone}</td>
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3">{item.area}</td>
                      <td className="px-4 py-3 text-xs text-red-800">
                        <div className="bg-red-100 px-2 py-1 rounded w-fit">{item.reason}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(item.stopped_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADDED PRODUCTS SECTION */}
        {addedProducts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-green-500 rounded-full"></div>
              <h2 className="text-lg font-bold text-green-700">Added Products ({addedProducts.length})</h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">One-time additions</span>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-green-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-green-50 border-b text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Product</th>
                    <th className="px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold">Area</th>
                    <th className="px-4 py-3 text-left font-semibold">Added By</th>
                    <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {addedProducts.map((item, index) => (
                    <tr key={item.id} className="border-b hover:bg-green-50 bg-green-50">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-green-700">{item.customer_name}</td>
                      <td className="px-4 py-3">{item.phone}</td>
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-md font-semibold">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.area}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-800">{item.added_by_name}</div>
                        <div className="text-gray-500 text-xs">{item.added_by_id?.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-800">
                          {new Date(item.added_at).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                          {new Date(item.added_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deleteAddedProduct(item.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded transition"
                          title="Delete this added product"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Save Filter Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              Save & Share Filter
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Link Name</Label>
              <Input
                placeholder="e.g. John's Morning Route, Area A Evening"
                value={linkForm.name}
                onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Give this link a descriptive name</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="font-medium text-blue-900">Current Filters:</div>
              <div className="text-blue-700 space-y-1">
                <div>📅 Date: {deliveryDate}</div>
                {selectedShift !== 'All Shifts' && <div>🕐 Shift: {selectedShift}</div>}
                {selectedArea !== 'All Areas' && <div>📍 Area: {selectedArea}</div>}
                {selectedDeliveryBoy !== 'All Boys' && <div>🚚 Delivery Boy: {selectedDeliveryBoy}</div>}
                {selectedMarketingStaff !== 'All Staff' && <div>👤 Marketing Staff: {selectedMarketingStaff}</div>}
                {selectedProduct !== 'All Products' && <div>📦 Product: {selectedProduct}</div>}
                {selectedStatus !== 'All Status' && <div>✅ Status: {selectedStatus}</div>}
                {addedProducts.length > 0 && <div>➕ Additional Products: {addedProducts.length} item{addedProducts.length !== 1 ? 's' : ''}</div>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-renew"
                  checked={linkForm.auto_renew_daily}
                  onChange={(e) => setLinkForm({ ...linkForm, auto_renew_daily: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="auto-renew" className="text-sm cursor-pointer">
                  Auto-renew daily (Updates date automatically each day)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="require-login"
                  checked={linkForm.require_login}
                  onChange={(e) => setLinkForm({ ...linkForm, require_login: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="require-login" className="text-sm cursor-pointer">
                  Require login (Delivery boy must login to access & track usage)
                </Label>
              </div>

              {linkForm.require_login && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>📋 Audit Trail Enabled:</strong> All access and actions will be logged with user information for tracking and accountability.
                </div>
              )}

              <div>
                <Label className="text-sm font-medium mb-2 block">Link Expires After</Label>
                <Select
                  value={String(linkForm.expires_days)}
                  onValueChange={(val) => setLinkForm({ ...linkForm, expires_days: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFilter} className="bg-blue-600 hover:bg-blue-700">
              <Share2 className="w-4 h-4 mr-2" />
              Create & Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Saved Links Modal */}
      <Dialog open={showLinksModal} onOpenChange={setShowLinksModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              Saved Shared Links
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto py-4">
            {savedLinks.map((link) => (
              <div
                key={link.link_id}
                className="bg-gray-50 rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900">{link.name}</div>
                      {link.require_login && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          🔒 Login Required
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {link.delivery_boy_name && (
                        <div>🚚 Delivery Boy: {link.delivery_boy_name}</div>
                      )}
                      {link.area && <div>📍 Area: {link.area}</div>}
                      {link.shift && <div>🕐 Shift: {link.shift}</div>}
                      <div>📅 {link.auto_renew_daily ? 'Auto-renews daily' : `Date: ${link.date}`}</div>
                      <div>⏰ Accessed {link.access_count} times</div>
                      <div>🔗 Expires: {new Date(link.expires_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleCopyLink(link.link_id)}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                    <Button
                      onClick={() => window.open(`/shared-delivery/${link.link_id}`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </Button>
                    {link.require_login && (
                      <Button
                        onClick={() => handleViewAuditLogs(link.link_id)}
                        variant="outline"
                        size="sm"
                        className="gap-1 bg-amber-50 hover:bg-amber-100"
                      >
                        <Users className="w-3 h-3" />
                        Audit
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDeleteLink(link.link_id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded px-3 py-2 text-xs font-mono text-gray-700 break-all">
                  {window.location.origin}/shared-delivery/{link.link_id}
                </div>
              </div>
            ))}

            {savedLinks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No saved links yet</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinksModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              Audit Logs - {auditData.link_info?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[500px] overflow-y-auto py-4">
            {/* Access Logs Section */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Access History ({auditData.access_logs?.length || 0})
              </h3>
              <div className="space-y-2">
                {auditData.access_logs?.length > 0 ? (
                  auditData.access_logs.map((log, idx) => (
                    <div key={idx} className="bg-blue-50 rounded-lg p-3 text-sm border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-blue-900">
                            {log.user_name || 'Anonymous'}
                            {log.user_role && (
                              <span className="ml-2 text-xs bg-blue-200 px-2 py-0.5 rounded">
                                {log.user_role}
                              </span>
                            )}
                          </div>
                          {log.user_id && (
                            <div className="text-xs text-blue-700 mt-1">User ID: {log.user_id}</div>
                          )}
                        </div>
                        <div className="text-xs text-blue-700">
                          {new Date(log.accessed_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">No access logs yet</div>
                )}
              </div>
            </div>

            {/* Action Logs Section */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Actions Performed ({auditData.action_logs?.length || 0})
              </h3>
              <div className="space-y-2">
                {auditData.action_logs?.length > 0 ? (
                  auditData.action_logs.map((log, idx) => (
                    <div key={idx} className="bg-green-50 rounded-lg p-3 text-sm border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-green-900">
                          {log.action === 'mark_delivered' && '✅ Marked as Delivered'}
                          {log.action === 'add_product' && '📦 Added Product Request'}
                          {log.action === 'pause_request' && '⏸️ Pause Request'}
                          {log.action === 'stop_request' && '⏹️ Stop Request'}
                        </div>
                        <div className="text-xs text-green-700">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-green-700 space-y-1">
                        {log.customer_id && <div>Customer: {log.customer_id}</div>}
                        {log.product_id && <div>Product: {log.product_id}</div>}
                        {log.quantity && <div>Quantity: {log.quantity}</div>}
                        {log.reason && <div>Reason: {log.reason}</div>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.user_id
                              ? 'bg-green-200 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {log.user_id ? '🔒 Authenticated' : '🌐 Anonymous'}
                          </span>
                          {log.user_id && (
                            <span className="text-xs">User ID: {log.user_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">No actions performed yet</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          open={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false);
            setSelectedCustomer(null);
            loadDeliveries(); // Reload deliveries in case subscriptions were modified
          }}
        />
      )}
    </div>
  );
};
