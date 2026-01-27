import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Package, Check, MapPin, Phone, LogOut, RefreshCw, Plus, Minus,
  Navigation, Calendar, Clock, AlertTriangle, TrendingDown
} from 'lucide-react';
import { useAccessControl } from '../utils/modules';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const DeliveryBoyDashboard = () => {
  const navigate = useNavigate();
  const { permissions } = useAccessControl();
  const [loading, setLoading] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  
  // Modals
  const [quantityModal, setQuantityModal] = useState({ 
    open: false, 
    customer: null, 
    product: null,
    action: 'add', // 'add' or 'reduce'
    type: 'this_day_only', // 'this_day_only', 'till_further_notice', 'specific_date'
    quantity: 0,
    specificDate: '',
    reason: ''
  });
  
  const [newProductModal, setNewProductModal] = useState({
    open: false,
    customer: null,
    productId: '',
    quantity: 1,
    deliveryTiming: 'today', // 'today', 'specific_date', 'whenever_available'
    specificDate: '',
    notes: ''
  });

  useEffect(() => {
    loadProducts();
    loadDeliveries();
    loadSummary();
    loadEarnings();
  }, [deliveryDate]);

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

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/delivery-boy/today-deliveries?delivery_date=${deliveryDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load deliveries');
      
      const data = await res.json();
      setDeliveries(data.deliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error('Failed to load delivery list');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/delivery-boy/delivery-summary?delivery_date=${deliveryDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load summary');
      
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const res = await fetch(`${API_URL}/api/delivery-boy/${currentUser.id}/earnings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load earnings');
      
      const data = await res.json();
      setDailyEarnings(data.daily?.[deliveryDate]?.earnings || 0);
      setWeeklyEarnings(data.weekly || 0);
      setTotalEarnings(data.total || 0);
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const handleMarkDelivered = async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/delivery-boy/mark-delivered`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          delivery_date: deliveryDate,
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
      });
      
      if (!res.ok) throw new Error('Failed to mark delivered');
      
      toast.success('✓ Marked as delivered');
      loadDeliveries();
      loadSummary();
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast.error('Failed to mark as delivered');
    }
  };

  const handleMarkAreaDelivered = async (area) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/delivery-boy/mark-area-delivered`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delivery_date: deliveryDate,
          area: area,
          completed_at: new Date().toISOString()
        })
      });
      
      if (!res.ok) throw new Error('Failed to mark area delivered');
      
      toast.success(`✓ ${area} completed`);
      loadDeliveries();
      loadSummary();
    } catch (error) {
      console.error('Error marking area delivered:', error);
      toast.error('Failed to mark area');
    }
  };

  const handleQuantityAdjustment = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentQty = quantityModal.product.quantity_packets;
      let newQty = currentQty;
      
      if (quantityModal.action === 'add') {
        newQty = currentQty + parseFloat(quantityModal.quantity);
      } else {
        newQty = Math.max(0, currentQty - parseFloat(quantityModal.quantity));
      }

      const adjustmentType = quantityModal.type === 'specific_date' ? 'this_day_only' : quantityModal.type;
      const targetDate = quantityModal.type === 'specific_date' ? quantityModal.specificDate : deliveryDate;

      const res = await fetch(`${API_URL}/api/delivery-boy/adjust-quantity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: quantityModal.customer.customer_id,
          product_id: quantityModal.product.product_id,
          date: targetDate,
          new_quantity_packets: newQty,
          adjustment_type: adjustmentType,
          reason: quantityModal.reason
        })
      });
      
      if (!res.ok) throw new Error('Failed to adjust quantity');
      
      toast.success('✓ Quantity adjusted');
      setQuantityModal({ ...quantityModal, open: false });
      loadDeliveries();
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      toast.error('Failed to adjust quantity');
    }
  };

  const handleAddNewProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Determine the delivery date based on timing selection
      let targetDate = null;
      if (newProductModal.deliveryTiming === 'today') {
        targetDate = deliveryDate;
      } else if (newProductModal.deliveryTiming === 'specific_date') {
        targetDate = newProductModal.specificDate;
      }
      // If 'whenever_available', targetDate remains null
      
      const res = await fetch(`${API_URL}/api/delivery-boy/request-new-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: newProductModal.customer.customer_id,
          product_id: newProductModal.productId,
          quantity_packets: parseFloat(newProductModal.quantity),
          tentative_date: targetDate,
          notes: newProductModal.notes
        })
      });
      
      if (!res.ok) throw new Error('Failed to add product');
      
      const successMsg = newProductModal.deliveryTiming === 'today' 
        ? '✓ Product will be delivered today'
        : newProductModal.deliveryTiming === 'specific_date'
        ? `✓ Product scheduled for ${newProductModal.specificDate}`
        : '✓ Product request submitted (whenever available)';
      
      toast.success(successMsg);
      setNewProductModal({ ...newProductModal, open: false });
      
      // Reload if adding for today
      if (newProductModal.deliveryTiming === 'today') {
        loadDeliveries();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const openLocationInMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const makePhoneCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Group deliveries by area
  const deliveriesByArea = deliveries.reduce((acc, delivery) => {
    if (!acc[delivery.area]) {
      acc[delivery.area] = [];
    }
    acc[delivery.area].push(delivery);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-bold">Delivery Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-36 h-9 text-sm"
              />
              
              {summary && (
                <div className="flex items-center gap-3 px-3 py-1 bg-gray-100 rounded text-xs">
                  <span><strong>{summary.delivered}</strong>/{summary.total_customers}</span>
                  <span className="text-green-600 font-semibold">{summary.completion_percentage}%</span>
                </div>
              )}
              
              <Button onClick={loadDeliveries} variant="outline" size="sm" className="h-9">
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              <Button onClick={logout} variant="outline" size="sm" className="h-9">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Earnings Cards */}
        {(dailyEarnings !== undefined || weeklyEarnings !== undefined || totalEarnings !== undefined) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 font-medium">Today's Earnings</div>
              <div className="text-2xl font-bold text-green-600 mt-2">₹{dailyEarnings?.toFixed(2) || '0'}</div>
              <div className="text-xs text-gray-500 mt-2">Base: ₹25</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 font-medium">Weekly Earnings</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">₹{weeklyEarnings?.toFixed(2) || '0'}</div>
              <div className="text-xs text-gray-500 mt-2">Last 7 days</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-600 font-medium">Total Earnings</div>
              <div className="text-2xl font-bold text-purple-600 mt-2">₹{totalEarnings?.toFixed(2) || '0'}</div>
              <div className="text-xs text-gray-500 mt-2">Month to date</div>
            </div>
          </div>
        )}

        {/* Compact Table View by Area */}
        {Object.keys(deliveriesByArea).length > 0 ? (
          Object.entries(deliveriesByArea).map(([area, areaDeliveries]) => {
            const areaDelivered = areaDeliveries.every(d => d.delivery_status === 'delivered');
            
            return (
              <div key={area} className="mb-6 bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Area Header */}
                <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-sm">{area}</span>
                    <span className="text-xs text-gray-600">({areaDeliveries.length})</span>
                  </div>
                  <Button
                    onClick={() => handleMarkAreaDelivered(area)}
                    disabled={areaDelivered}
                    size="sm"
                    className={`h-7 text-xs ${areaDelivered ? 'bg-green-600' : ''}`}
                  >
                    {areaDelivered ? '✓ Completed' : 'Mark All Delivered'}
                  </Button>
                </div>

                {/* Compact Table */}
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      <th className="px-3 py-2 text-left font-medium">Products</th>
                      <th className="px-3 py-2 text-left font-medium">Quantity</th>
                      <th className="px-3 py-2 text-center font-medium">Actions</th>
                      <th className="px-3 py-2 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaDeliveries.map((delivery, idx) => (
                      <tr 
                        key={delivery.customer_id}
                        className={`border-b hover:bg-gray-50 ${
                          delivery.delivery_status === 'delivered' ? 'bg-green-50' : ''
                        }`}
                      >
                        {/* Customer Info */}
                        <td className="px-3 py-2">
                          <div className="font-medium text-sm">{delivery.customer_name}</div>
                          <div className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
                            <button
                              onClick={() => makePhoneCall(delivery.phone)}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {delivery.phone}
                            </button>
                          </div>
                          {delivery.address && (
                            <button
                              onClick={() => openLocationInMaps(delivery.address)}
                              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 mt-0.5"
                            >
                              <Navigation className="w-3 h-3" />
                              Location
                            </button>
                          )}
                          <div className="text-xs text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {delivery.shift}
                          </div>
                        </td>

                        {/* Products */}
                        <td className="px-3 py-2">
                          {delivery.products.map((product, pidx) => (
                            <div key={pidx} className="text-xs mb-1">
                              {product.product_name}
                            </div>
                          ))}
                        </td>

                        {/* Quantity with +/- buttons */}
                        <td className="px-3 py-2">
                          {delivery.products.map((product, pidx) => (
                            <div key={pidx} className="flex items-center gap-1 mb-1">
                              <button
                                onClick={() => setQuantityModal({
                                  open: true,
                                  customer: delivery,
                                  product: product,
                                  action: 'reduce',
                                  type: 'this_day_only',
                                  quantity: 1,
                                  specificDate: '',
                                  reason: ''
                                })}
                                className="p-0.5 hover:bg-gray-200 rounded"
                                disabled={delivery.delivery_status === 'delivered'}
                              >
                                <Minus className="w-3 h-3 text-red-600" />
                              </button>
                              <span className="text-xs font-semibold px-2 min-w-[50px] text-center">
                                {product.quantity_packets}p
                              </span>
                              <button
                                onClick={() => setQuantityModal({
                                  open: true,
                                  customer: delivery,
                                  product: product,
                                  action: 'add',
                                  type: 'this_day_only',
                                  quantity: 1,
                                  specificDate: '',
                                  reason: ''
                                })}
                                className="p-0.5 hover:bg-gray-200 rounded"
                                disabled={delivery.delivery_status === 'delivered'}
                              >
                                <Plus className="w-3 h-3 text-green-600" />
                              </button>
                              <span className="text-xs text-gray-500">({product.quantity_liters}L)</span>
                            </div>
                          ))}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <Button
                              onClick={() => setNewProductModal({
                                open: true,
                                customer: delivery,
                                productId: '',
                                quantity: 1,
                                deliveryTiming: 'today',
                                specificDate: '',
                                notes: ''
                              })}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={delivery.delivery_status === 'delivered'}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Product
                            </Button>
                          </div>
                        </td>

                        {/* Status/Delivered Button */}
                        <td className="px-3 py-2 text-center">
                          {delivery.delivery_status === 'delivered' ? (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Delivered
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleMarkDelivered(delivery.customer_id)}
                              size="sm"
                              className="bg-green-600 h-7 text-xs"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No deliveries scheduled for this date</p>
          </div>
        )}
      </div>

      {/* Quantity Adjustment Modal */}
      <Dialog open={quantityModal.open} onOpenChange={(open) => setQuantityModal({...quantityModal, open})}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quantityModal.action === 'add' ? 'Add' : 'Reduce'} Quantity - {quantityModal.customer?.customer_name}
            </DialogTitle>
          </DialogHeader>
          
          {quantityModal.product && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium">{quantityModal.product.product_name}</div>
                <div className="text-xs text-gray-600">Current: {quantityModal.product.quantity_packets} packets</div>
              </div>

              <div>
                <Label>Adjustment Type</Label>
                <Select 
                  value={quantityModal.type} 
                  onValueChange={(v) => setQuantityModal({...quantityModal, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_day_only">This Date Only ({deliveryDate})</SelectItem>
                    <SelectItem value="till_further_notice">Till Further Notice</SelectItem>
                    <SelectItem value="specific_date">Specific Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {quantityModal.type === 'specific_date' && (
                <div>
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={quantityModal.specificDate}
                    onChange={(e) => setQuantityModal({...quantityModal, specificDate: e.target.value})}
                  />
                </div>
              )}

              <div>
                <Label>{quantityModal.action === 'add' ? 'Add' : 'Reduce'} by (packets)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={quantityModal.quantity}
                  onChange={(e) => setQuantityModal({...quantityModal, quantity: e.target.value})}
                />
              </div>

              <div>
                <Label>Reason (optional)</Label>
                <Input
                  value={quantityModal.reason}
                  onChange={(e) => setQuantityModal({...quantityModal, reason: e.target.value})}
                  placeholder="Why the adjustment?"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuantityModal({...quantityModal, open: false})}>
              Cancel
            </Button>
            <Button onClick={handleQuantityAdjustment}>
              Confirm {quantityModal.action === 'add' ? 'Add' : 'Reduce'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Product Modal */}
      <Dialog open={newProductModal.open} onOpenChange={(open) => setNewProductModal({...newProductModal, open})}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product - {newProductModal.customer?.customer_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Product</Label>
              <Select 
                value={newProductModal.productId} 
                onValueChange={(v) => setNewProductModal({...newProductModal, productId: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ₹{product.default_price}/{product.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity (packets)</Label>
              <Input
                type="number"
                min="1"
                step="0.5"
                value={newProductModal.quantity}
                onChange={(e) => setNewProductModal({...newProductModal, quantity: e.target.value})}
              />
            </div>

            <div>
              <Label>When to deliver?</Label>
              <Select 
                value={newProductModal.deliveryTiming} 
                onValueChange={(v) => setNewProductModal({...newProductModal, deliveryTiming: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Deliver Today ({deliveryDate})</SelectItem>
                  <SelectItem value="specific_date">Specific Date</SelectItem>
                  <SelectItem value="whenever_available">Whenever Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newProductModal.deliveryTiming === 'specific_date' && (
              <div>
                <Label>Select Date</Label>
                <Input
                  type="date"
                  value={newProductModal.specificDate}
                  min={deliveryDate}
                  onChange={(e) => setNewProductModal({...newProductModal, specificDate: e.target.value})}
                />
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={newProductModal.notes}
                onChange={(e) => setNewProductModal({...newProductModal, notes: e.target.value})}
                placeholder="Any special instructions?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProductModal({...newProductModal, open: false})}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewProduct} 
              disabled={!newProductModal.productId || (newProductModal.deliveryTiming === 'specific_date' && !newProductModal.specificDate)}
            >
              {newProductModal.deliveryTiming === 'today' ? 'Add for Today' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
