import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar, Pause, Play, Edit2, Plus } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

export function CustomerCalendar({ customer, onClose }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  
  const [pauseForm, setPauseForm] = useState({
    start_date: '',
    end_date: null
  });
  
  const [quantityForm, setQuantityForm] = useState({
    quantity: 0
  });
  
  const [addProductForm, setAddProductForm] = useState({
    product_id: '',
    quantity: 1,
    shift: 'morning'
  });
  
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    shift: 'morning',
    apply_to: 'this_date'  // 'this_date' or 'daily'
  });

  useEffect(() => {
    if (customer) {
      fetchCalendar();
    }
  }, [customer, selectedMonth, selectedProduct]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedProduct !== 'all') {
        params.append('product_id', selectedProduct);
      }
      const res = await api.get(`/phase0-v2/customer/${customer.id}/calendar?${params.toString()}`);
      setCalendarData(res.data);
      setAvailableProducts(res.data.available_products || []);
    } catch (error) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.post(`/phase0-v2/customer/${customer.id}/pause`, {
        subscription_id: selectedSubscription,
        start_date: pauseForm.start_date,
        end_date: pauseForm.end_date
      });
      toast.success('Delivery paused successfully');
      setShowPauseDialog(false);
      setPauseForm({ start_date: '', end_date: null });
      fetchCalendar();
    } catch (error) {
      toast.error('Failed to pause delivery');
    }
  };

  const handleQuantityOverride = async () => {
    try {
      await api.post(`/phase0-v2/customer/${customer.id}/override`, {
        subscription_id: selectedSubscription,
        date: selectedDate,
        quantity: quantityForm.quantity
      });
      toast.success('Quantity updated successfully');
      setShowQuantityDialog(false);
      setQuantityForm({ quantity: 0 });
      fetchCalendar();
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleAddProduct = async () => {
    try {
      if (!addProductForm.product_id) {
        toast.error('Please select a product');
        return;
      }
      await api.post(`/phase0-v2/customer/${customer.id}/add-product`, {
        product_id: addProductForm.product_id,
        date: selectedDate,
        quantity: addProductForm.quantity,
        shift: addProductForm.shift
      });
      toast.success('Product added successfully');
      setShowAddProductDialog(false);
      setAddProductForm({ product_id: '', quantity: 1, shift: 'morning' });
      fetchCalendar();
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const openAddProductDialog = (date) => {
    setSelectedDate(date);
    setAddProductForm({ product_id: '', quantity: 1, shift: 'morning' });
    setShowAddProductDialog(true);
  };

  const handleChangeShift = async () => {
    try {
      if (shiftForm.apply_to === 'daily') {
        // Change subscription's main shift permanently
        await api.put(`/phase0-v2/subscriptions/${selectedSubscription}`, {
          shift: shiftForm.shift
        });
        toast.success('Shift changed permanently for all future deliveries');
      } else {
        // Change shift for this date only
        await api.post(`/phase0-v2/customer/${customer.id}/change-shift`, {
          subscription_id: selectedSubscription,
          date: selectedDate,
          shift: shiftForm.shift
        });
        toast.success('Shift changed for this date only');
      }
      setShowShiftDialog(false);
      fetchCalendar();
    } catch (error) {
      toast.error('Failed to change shift');
    }
  };

  const openShiftDialog = (date, product) => {
    setSelectedDate(date);
    setSelectedSubscription(product.subscription_id);
    setShiftForm({ shift: product.shift || 'morning', apply_to: 'this_date' });
    setShowShiftDialog(true);
  };

  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    // Current month and next 11 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    return options;
  };

  const openPauseDialog = (date, subscription) => {
    setSelectedDate(date);
    setSelectedSubscription(subscription.subscription_id);
    setPauseForm({ start_date: date, end_date: null });
    setShowPauseDialog(true);
  };

  const openQuantityDialog = (date, subscription) => {
    setSelectedDate(date);
    setSelectedSubscription(subscription.subscription_id);
    setQuantityForm({ quantity: subscription.quantity });
    setShowQuantityDialog(true);
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{customer.name} - Delivery Calendar</CardTitle>
            <p className="text-sm text-gray-500">{customer.area} • {customer.phone}</p>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </CardHeader>
        
        <CardContent>
          {/* Month & Product Selector */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <Label>Select Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filter by Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {availableProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading calendar...</div>
          ) : calendarData ? (
            <div className="space-y-2">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-bold text-sm p-2 bg-gray-100">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarData.calendar.map((dayData, idx) => {
                  const date = new Date(dayData.date);
                  const dayOfWeek = date.getDay();
                  
                  // Add empty cells for alignment
                  if (idx === 0) {
                    return (
                      <React.Fragment key={`empty-${idx}`}>
                        {Array.from({ length: dayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="p-2 border border-gray-200 bg-gray-50"></div>
                        ))}
                        <DayCell 
                          dayData={dayData} 
                          onPause={openPauseDialog}
                          onEditQuantity={openQuantityDialog}
                          onAddProduct={openAddProductDialog}
                          onChangeShift={openShiftDialog}
                        />
                      </React.Fragment>
                    );
                  }
                  
                  return (
                    <DayCell 
                      key={dayData.date} 
                      dayData={dayData} 
                      onPause={openPauseDialog}
                      onEditQuantity={openQuantityDialog}
                      onAddProduct={openAddProductDialog}
                      onChangeShift={openShiftDialog}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300"></div>
                  <span>Active Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300"></div>
                  <span>Paused</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
                  <span>No Delivery</span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={pauseForm.start_date} onChange={(e) => setPauseForm({ ...pauseForm, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End Date (optional - leave blank for indefinite)</Label>
              <Input type="date" value={pauseForm.end_date || ''} onChange={(e) => setPauseForm({ ...pauseForm, end_date: e.target.value || null })} />
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm">
              <strong>Note:</strong> If end date is not provided, delivery will be paused indefinitely until you manually resume it.
            </div>
            <Button onClick={handlePause} className="w-full">
              <Pause className="mr-2 h-4 w-4" /> Pause Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Override Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Quantity for {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantity (Liters)</Label>
              <Input 
                type="number" 
                step="0.5"
                value={quantityForm.quantity} 
                onChange={(e) => setQuantityForm({ quantity: parseFloat(e.target.value) })} 
              />
            </div>
            <div className="bg-yellow-50 p-3 rounded text-sm">
              <strong>Note:</strong> This will override the regular quantity for this specific date only.
            </div>
            <Button onClick={handleQuantityOverride} className="w-full">
              <Edit2 className="mr-2 h-4 w-4" /> Update Quantity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product for {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Product *</Label>
              <Select value={addProductForm.product_id} onValueChange={(v) => setAddProductForm({ ...addProductForm, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input 
                type="number" 
                step="0.5"
                value={addProductForm.quantity} 
                onChange={(e) => setAddProductForm({ ...addProductForm, quantity: parseFloat(e.target.value) })} 
              />
            </div>
            <div>
              <Label>Delivery Shift *</Label>
              <Select value={addProductForm.shift} onValueChange={(v) => setAddProductForm({ ...addProductForm, shift: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">🌅 Morning</SelectItem>
                  <SelectItem value="evening">🌆 Evening</SelectItem>
                  <SelectItem value="both">🌅🌆 Both Shifts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddProduct} className="w-full">
              Add Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift Change Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Delivery Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select New Shift *</Label>
              <Select value={shiftForm.shift} onValueChange={(v) => setShiftForm({ ...shiftForm, shift: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">🌅 Morning Shift</SelectItem>
                  <SelectItem value="evening">🌆 Evening Shift</SelectItem>
                  <SelectItem value="both">🌅🌆 Both Shifts (2x delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-3 block">Apply Change To: *</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="apply_to"
                    value="this_date"
                    checked={shiftForm.apply_to === 'this_date'}
                    onChange={(e) => setShiftForm({ ...shiftForm, apply_to: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">📅 This Date Only ({selectedDate})</div>
                    <div className="text-xs text-gray-500">Change shift for this specific date. Regular shift remains unchanged.</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="apply_to"
                    value="daily"
                    checked={shiftForm.apply_to === 'daily'}
                    onChange={(e) => setShiftForm({ ...shiftForm, apply_to: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">🔄 Daily (Permanent Change)</div>
                    <div className="text-xs text-gray-500">Change shift for ALL future deliveries. Past dates remain unchanged.</div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className={`p-3 rounded text-sm ${shiftForm.apply_to === 'this_date' ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <strong>{shiftForm.apply_to === 'this_date' ? '📅 Temporary:' : '🔄 Permanent:'}</strong> 
              {shiftForm.apply_to === 'this_date' 
                ? ' Only this date will be affected. Other dates keep their regular shift.'
                : ' All future deliveries will change to this shift. Past dates remain unchanged.'}
            </div>
            
            <Button onClick={handleChangeShift} className="w-full">
              {shiftForm.apply_to === 'this_date' ? 'Change Shift for This Date' : 'Change Shift Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayCell({ dayData, onPause, onEditQuantity, onAddProduct, onChangeShift }) {
  const hasDelivery = dayData.products && dayData.products.length > 0 && dayData.products.some(d => d.quantity > 0);
  const isPast = new Date(dayData.date) < new Date(new Date().toDateString());
  
  const getShiftBadge = (shift) => {
    if (shift === 'morning') return <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">🌅 M</span>;
    if (shift === 'evening') return <span className="px-1 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">🌆 E</span>;
    if (shift === 'both') return <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">🌅🌆 Both</span>;
    return null;
  };
  
  return (
    <div className={`p-2 border min-h-[140px] ${
      hasDelivery ? 'bg-green-50 border-green-300' : 
      isPast ? 'bg-gray-50 border-gray-200' : 
      'bg-white border-gray-300'
    }`}>
      <div className="text-xs font-bold mb-1">{new Date(dayData.date).getDate()}</div>
      
      {/* Show all products for this date */}
      {dayData.products && dayData.products.map((product, idx) => (
        <div key={idx} className="text-xs mb-1 border-b border-gray-200 pb-1">
          <div className="flex justify-between items-center gap-1">
            <span className="text-gray-600 font-medium truncate flex-1">{product.product_name}</span>
            <span className={`${product.quantity > 0 ? 'text-green-700 font-bold' : 'text-gray-400'}`}>
              {product.quantity > 0 ? `${product.quantity}${product.product_unit}` : '—'}
            </span>
          </div>
          
          {/* Shift Badge */}
          {product.shift && product.quantity > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              {getShiftBadge(product.shift)}
              {!isPast && (
                <button 
                  onClick={() => onChangeShift(dayData.date, product)}
                  className="text-xs text-blue-600 hover:underline"
                  title="Change Shift"
                >
                  Change
                </button>
              )}
            </div>
          )}
          
          {!isPast && product.quantity > 0 && (
            <div className="flex gap-1 mt-1">
              <button 
                onClick={() => onPause(dayData.date, product)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-1 py-0.5 rounded"
                title="Pause"
              >
                <Pause className="h-3 w-3" />
              </button>
              <button 
                onClick={() => onEditQuantity(dayData.date, product)}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-1 py-0.5 rounded"
                title="Edit Quantity"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ))}
      
      {/* Add Product Button */}
      {!isPast && (
        <button 
          onClick={() => onAddProduct(dayData.date)}
          className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded w-full mt-1 flex items-center justify-center gap-1"
          title="Add Product"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
}
