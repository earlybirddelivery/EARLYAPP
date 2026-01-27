import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Package, Check, Plus, Pause, StopCircle, Clock, Phone, MapPin, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const SharedDeliveryList = () => {
  const { linkId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [consolidatedDeliveries, setConsolidatedDeliveries] = useState([]);
  const [pausedDeliveries, setPausedDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [linkData, setLinkData] = useState(null);
  const [requireLogin, setRequireLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [editingQuantities, setEditingQuantities] = useState({});

  // Modals
  const [actionModal, setActionModal] = useState({
    open: false,
    type: '', // 'add_product', 'pause', 'stop', 'mark_delivered'
    customer: null
  });

  const [deliveryModal, setDeliveryModal] = useState({
    open: false,
    customerId: null,
    deliveryType: 'full', // 'full' or 'partial'
    partialProducts: []
  });

  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    delivery_date: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadSharedLink();
    loadProducts();
  }, [linkId]);

  // Consolidate deliveries by customer
  useEffect(() => {
    const consolidated = {};
    deliveries.forEach(delivery => {
      if (!consolidated[delivery.customer_id]) {
        consolidated[delivery.customer_id] = {
          ...delivery,
          products: []
        };
      }
      if (delivery.products && delivery.products.length > 0) {
        consolidated[delivery.customer_id].products.push(...delivery.products);
      } else {
        // Single product delivery
        consolidated[delivery.customer_id].products.push({
          product_id: delivery.product_id,
          product_name: delivery.product_name,
          quantity_packets: delivery.quantity
        });
      }
    });
    setConsolidatedDeliveries(Object.values(consolidated));
  }, [deliveries]);

  const loadSharedLink = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // First, try to load with token if available
      if (token) {
        const authRes = await fetch(`${API_URL}/api/shared-delivery-link/${linkId}/auth`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          setLinkData(authData.link_info);
          
          // Separate paused and active deliveries
          const allDeliveries = authData.deliveries || [];
          const active = allDeliveries.filter(d => d.delivery_status !== 'paused');
          const paused = allDeliveries.filter(d => d.delivery_status === 'paused');
          
          setDeliveries(active);
          setPausedDeliveries(paused);
          setProducts(authData.added_products || []);
          setCurrentUser(authData.user_info);
          setIsAuthenticated(true);
          setRequireLogin(false);
          setLoading(false);
          return;
        }
      }

      // Otherwise, try public access
      const res = await fetch(`${API_URL}/api/shared-delivery-link/${linkId}`);

      if (!res.ok) throw new Error('Invalid or expired link');

      const data = await res.json();

      if (data.require_login) {
        setRequireLogin(true);
        setLinkData(data.link_info);
        setShowLoginPrompt(true);
      } else {
        setLinkData(data.link_info);
        
        // Separate paused and active deliveries
        const allDeliveries = data.deliveries || [];
        const active = allDeliveries.filter(d => d.delivery_status !== 'paused');
        const paused = allDeliveries.filter(d => d.delivery_status === 'paused');
        
        setDeliveries(active);
        setPausedDeliveries(paused);
        setProducts(data.added_products || []);
        setRequireLogin(false);
      }
    } catch (error) {
      console.error('Error loading shared link:', error);
      toast.error('Failed to load delivery list. Link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`${API_URL}/api/phase0-v2/products`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        console.warn('Could not load products list');
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleMarkDelivered = async (customerId, deliveryType = 'full', partialProducts = []) => {
    try {
      const deliveryData = {
        customer_id: customerId,
        delivery_type: deliveryType, // 'full' or 'partial'
        delivered_at: new Date().toISOString(),
        user_id: currentUser?.id || null
      };

      // For partial delivery, include which products were delivered
      if (deliveryType === 'partial') {
        deliveryData.delivered_products = partialProducts;
      }

      const res = await fetch(`${API_URL}/api/shared-delivery-link/${linkId}/mark-delivered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryData)
      });

      if (!res.ok) throw new Error('Failed to mark delivered');

      toast.success(`✓ ${deliveryType === 'full' ? 'Full' : 'Partial'} delivery marked`);
      setDeliveryModal({ open: false, customerId: null, deliveryType: 'full', partialProducts: [] });
      loadSharedLink();
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast.error('Failed to mark as delivered');
    }
  };

  const handleAddProduct = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shared-delivery-link/${linkId}/add-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: actionModal.customer.customer_id,
          product_id: formData.product_id,
          quantity: parseFloat(formData.quantity),
          delivery_date: formData.delivery_date || null,
          notes: formData.notes
        })
      });

      if (!res.ok) throw new Error('Failed to add product');

      toast.success('✓ Product request submitted');
      setActionModal({ open: false, type: '', customer: null });
      setFormData({ product_id: '', quantity: 1, delivery_date: '', reason: '', notes: '' });
      loadSharedLink();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to submit product request');
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shared-delivery-link/${linkId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: actionModal.customer.customer_id,
          reason: formData.reason,
          notes: formData.notes
        })
      });

      if (!res.ok) throw new Error('Failed to pause delivery');

      toast.success('✓ Delivery pause request submitted');
      setActionModal({ open: false, type: '', customer: null });
      setFormData({ product_id: '', quantity: 1, delivery_date: '', reason: '', notes: '' });
      loadSharedLink();
    } catch (error) {
      console.error('Error pausing delivery:', error);
      toast.error('Failed to submit pause request');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shared-delivery-link/${linkId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: actionModal.customer.customer_id,
          reason: formData.reason,
          notes: formData.notes
        })
      });

      if (!res.ok) throw new Error('Failed to stop delivery');

      toast.success('✓ Delivery stop request submitted');
      setActionModal({ open: false, type: '', customer: null });
      setFormData({ product_id: '', quantity: 1, delivery_date: '', reason: '', notes: '' });
      loadSharedLink();
    } catch (error) {
      console.error('Error stopping delivery:', error);
      toast.error('Failed to submit stop request');
    }
  };

  const handleCopyWhatsApp = () => {
    if (deliveries.length === 0) {
      toast.error('No deliveries to copy');
      return;
    }

    let message = `*📋 Delivery List*\n`;
    if (linkData) {
      message += `*${linkData.delivery_boy_name || 'Delivery Boy'}*\n`;
      message += `*Date: ${linkData.date}*\n`;
    }
    message += `*Total: ${deliveries.length} customers*\n`;
    message += `${'─'.repeat(40)}\n\n`;

    message += `\`\`\`\n`;
    message += `# | Customer      | Phone      | Product        | Qty | Area\n`;
    message += `${'-'.repeat(70)}\n`;

    deliveries.forEach((delivery, index) => {
      delivery.products?.forEach((product, pIndex) => {
        const rowNum = pIndex === 0 ? String(index + 1).padEnd(2) : '  ';
        const customer = pIndex === 0 ? delivery.customer_name.substring(0, 13).padEnd(13) : ' '.repeat(13);
        const phone = pIndex === 0 ? delivery.phone.substring(0, 10).padEnd(10) : ' '.repeat(10);
        const productName = product.product_name.substring(0, 14).padEnd(14);
        const qty = String(product.quantity_packets).padEnd(4);
        const area = pIndex === 0 ? delivery.area.substring(0, 15) : '';

        message += `${rowNum} | ${customer} | ${phone} | ${productName} | ${qty} | ${area}\n`;
      });
    });

    message += `\`\`\`\n`;

    navigator.clipboard.writeText(message).then(() => {
      toast.success(`✓ Copied ${deliveries.length} deliveries!`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-blue-600 mb-4 animate-pulse" />
          <p className="text-gray-600">Loading delivery list...</p>
        </div>
      </div>
    );
  }

  if (!linkData && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
          <p className="text-gray-600">This delivery list link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (requireLogin && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600">
              This delivery list requires you to login to access.
            </p>
          </div>

          {linkData && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="font-medium text-blue-900 mb-2">Link Info:</div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>📋 {linkData.name}</div>
                {linkData.delivery_boy_name && <div>🚚 {linkData.delivery_boy_name}</div>}
                {linkData.area && <div>📍 {linkData.area}</div>}
                {linkData.date && <div>📅 {linkData.date}</div>}
              </div>
            </div>
          )}

          <Button
            onClick={() => window.location.href = `/login?redirect=/shared-delivery/${linkId}`}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Go to Login
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            You need to login with your delivery boy account to access this link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                <h1 className="text-lg font-bold">Delivery List</h1>
                {isAuthenticated && currentUser && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    🔒 Logged in as {currentUser.name}
                  </span>
                )}
              </div>
              {linkData && (
                <p className="text-sm text-gray-600 mt-1">
                  {linkData.delivery_boy_name} • {linkData.date} • {linkData.area || 'All Areas'}
                </p>
              )}
            </div>

            <Button onClick={handleCopyWhatsApp} className="bg-green-600 hover:bg-green-700">
              Copy WhatsApp
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        {/* Active Deliveries Table */}
        {consolidatedDeliveries.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Active Deliveries ({consolidatedDeliveries.length})
            </h2>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Products</th>
                    <th className="px-4 py-3 text-left font-semibold">Area</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedDeliveries.map((delivery, index) => (
                    <tr
                      key={delivery.customer_id}
                      className={`border-b hover:bg-gray-50 ${
                        delivery.delivery_status === 'delivered' ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{delivery.customer_name}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {delivery.phone}
                        </div>
                        {delivery.address && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {delivery.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {delivery.products?.map((product, pIdx) => (
                            <div key={`${delivery.customer_id}-${pIdx}`} className="text-sm">
                              <div className="font-medium text-gray-900">{product.product_name}</div>
                              <div className="text-xs text-gray-600">
                                {editingQuantities[`${delivery.customer_id}-${pIdx}`] !== undefined ? (
                                  <div className="mt-1 flex items-center gap-1">
                                    <span className="text-xs font-semibold">Qty:</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={editingQuantities[`${delivery.customer_id}-${pIdx}`]}
                                      onChange={(e) => setEditingQuantities({
                                        ...editingQuantities,
                                        [`${delivery.customer_id}-${pIdx}`]: parseFloat(e.target.value) || 0
                                      })}
                                      className="h-6 text-xs w-16"
                                    />
                                    <Button
                                      onClick={() => {
                                        const updated = { ...editingQuantities };
                                        delete updated[`${delivery.customer_id}-${pIdx}`];
                                        setEditingQuantities(updated);
                                      }}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      title="Save quantity"
                                    >
                                      ✓
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span>Qty: <span className="font-semibold">{product.quantity_packets}</span></span>
                                    <Button
                                      onClick={() => setEditingQuantities({
                                        ...editingQuantities,
                                        [`${delivery.customer_id}-${pIdx}`]: product.quantity_packets
                                      })}
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-2 text-xs"
                                      title="Edit quantity"
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{delivery.area}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-1">
                          <Button
                            onClick={() => setActionModal({ open: true, type: 'add_product', customer: delivery })}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs w-full"
                            disabled={delivery.delivery_status === 'delivered'}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Product
                          </Button>
                          <Button
                            onClick={() => setActionModal({ open: true, type: 'pause', customer: delivery })}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs w-full"
                            disabled={delivery.delivery_status === 'delivered'}
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                          <Button
                            onClick={() => setActionModal({ open: true, type: 'stop', customer: delivery })}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs w-full text-red-600"
                            disabled={delivery.delivery_status === 'delivered'}
                          >
                            <StopCircle className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {delivery.delivery_status === 'delivered' ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Delivered
                          </span>
                        ) : (
                          <Button
                            onClick={() => setDeliveryModal({ 
                              open: true, 
                              customerId: delivery.customer_id,
                              deliveryType: 'full',
                              partialProducts: delivery.products.map((p, idx) => ({
                                index: idx,
                                product_name: p.product_name,
                                quantity_packets: editingQuantities[`${delivery.customer_id}-${idx}`] || p.quantity_packets,
                                delivered: true
                              }))
                            })}
                            size="sm"
                            className="bg-green-600 h-7 text-xs"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark Delivered
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No active deliveries</p>
          </div>
        )}

        {/* Paused Deliveries Section */}
        {pausedDeliveries.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Pause className="w-5 h-5 text-amber-600" />
              Paused Deliveries ({pausedDeliveries.length})
            </h2>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Product</th>
                    <th className="px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold">Area</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {pausedDeliveries.map((delivery, index) => {
                    const rowSpan = delivery.products?.length || 1;

                    return delivery.products?.map((product, pIndex) => (
                      <tr
                        key={`paused-${delivery.customer_id}-${pIndex}`}
                        className="border-b hover:bg-amber-50 bg-amber-50 opacity-75"
                      >
                        {pIndex === 0 && (
                          <>
                            <td rowSpan={rowSpan} className="px-4 py-3 text-center align-top">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>
                            <td rowSpan={rowSpan} className="px-4 py-3 align-top">
                              <div className="font-medium">{delivery.customer_name}</div>
                              <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3" />
                                {delivery.phone}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{product.product_name}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-1 bg-amber-100 text-amber-700 rounded font-semibold">
                            {product.quantity_packets}
                          </span>
                        </td>
                        {pIndex === 0 && (
                          <>
                            <td rowSpan={rowSpan} className="px-4 py-3 align-top">
                              <div className="text-gray-700">{delivery.area}</div>
                            </td>
                            <td rowSpan={rowSpan} className="px-4 py-3 align-top">
                              <span className="inline-flex items-center px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-medium">
                                <Pause className="w-3 h-3 mr-1" />
                                {delivery.pause_reason || 'Paused'}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Dialog open={actionModal.open} onOpenChange={(open) => !open && setActionModal({ open: false, type: '', customer: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionModal.type === 'add_product' && 'Add Product Request'}
              {actionModal.type === 'pause' && 'Pause Delivery'}
              {actionModal.type === 'stop' && 'Stop Delivery'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {actionModal.customer && (
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium">{actionModal.customer.customer_name}</div>
                <div className="text-xs text-gray-600">{actionModal.customer.phone}</div>
              </div>
            )}

            {actionModal.type === 'add_product' && (
              <>
                <div>
                  <Label>Product</Label>
                  <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Delivery Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for "whenever available"</p>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions..."
                  />
                </div>
              </>
            )}

            {(actionModal.type === 'pause' || actionModal.type === 'stop') && (
              <>
                <div>
                  <Label>Reason</Label>
                  <Select value={formData.reason} onValueChange={(v) => setFormData({ ...formData, reason: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation/Travel</SelectItem>
                      <SelectItem value="stock">Stock/Surplus</SelectItem>
                      <SelectItem value="price">Price Issue</SelectItem>
                      <SelectItem value="quality">Quality Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal({ open: false, type: '', customer: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (actionModal.type === 'add_product') handleAddProduct();
                else if (actionModal.type === 'pause') handlePause();
                else if (actionModal.type === 'stop') handleStop();
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Delivery Modal */}
      <Dialog open={deliveryModal.open} onOpenChange={(open) => !open && setDeliveryModal({ open: false, customerId: null, deliveryType: 'full', partialProducts: [] })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Delivery</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Delivery Type</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="full"
                    checked={deliveryModal.deliveryType === 'full'}
                    onChange={(e) => setDeliveryModal({ ...deliveryModal, deliveryType: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Full Delivery (All Products)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="partial"
                    checked={deliveryModal.deliveryType === 'partial'}
                    onChange={(e) => setDeliveryModal({ ...deliveryModal, deliveryType: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Partial Delivery (Select Products)</span>
                </label>
              </div>
            </div>

            {deliveryModal.deliveryType === 'partial' && (
              <div>
                <Label>Select Products Delivered</Label>
                <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
                  {deliveryModal.partialProducts.map((product, idx) => (
                    <label key={idx} className="flex items-start gap-2 cursor-pointer p-2 border rounded">
                      <input
                        type="checkbox"
                        checked={product.delivered}
                        onChange={(e) => {
                          const updated = [...deliveryModal.partialProducts];
                          updated[idx].delivered = e.target.checked;
                          setDeliveryModal({ ...deliveryModal, partialProducts: updated });
                        }}
                        className="w-4 h-4 mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{product.product_name}</div>
                        <div className="text-xs text-gray-600">Qty: {product.quantity_packets}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryModal({ open: false, customerId: null, deliveryType: 'full', partialProducts: [] })}>
              Cancel
            </Button>
            <Button
              onClick={() => handleMarkDelivered(
                deliveryModal.customerId,
                deliveryModal.deliveryType,
                deliveryModal.partialProducts.filter(p => p.delivered)
              )}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SharedDeliveryList;