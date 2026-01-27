import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Edit2, Check, X, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Inline delivery actions with dropdown menus for shift and delivery boy
 */
export function InlineDeliveryActions({
  delivery,
  product,
  deliveryDate,
  deliveryBoys = [],
  allProducts = [],
  areas = [],
  onUpdate
}) {
  const [editingQty, setEditingQty] = useState(false);
  const [newQty, setNewQty] = useState(product.quantity_packets);

  const [editingShift, setEditingShift] = useState(false);
  const [newShift, setNewShift] = useState(delivery.shift || 'morning');

  const [editingDeliveryBoy, setEditingDeliveryBoy] = useState(false);
  const [newDeliveryBoy, setNewDeliveryBoy] = useState(delivery.delivery_boy_id || '');
  const [newDeliveryBoyName, setNewDeliveryBoyName] = useState(delivery.delivery_boy_name || '');

  // Dialog states
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseForm, setPauseForm] = useState({
    start_date: deliveryDate,
    end_date: ''
  });

  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopForm, setStopForm] = useState({
    reason: ''
  });

  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [addProductForm, setAddProductForm] = useState({
    product_id: '',
    quantity: 1,
    dateMode: 'single', // 'single', 'range', 'multiple'
    single_date: deliveryDate,
    start_date: deliveryDate,
    end_date: deliveryDate,
    selected_dates: [deliveryDate]
  });
  const [showCalendar, setShowCalendar] = useState(false);

  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');

  // Helper: Add/remove date from multiple selection
  const toggleDateSelection = (date) => {
    setAddProductForm(prev => {
      const dates = prev.selected_dates || [];
      if (dates.includes(date)) {
        return { ...prev, selected_dates: dates.filter(d => d !== date) };
      } else {
        return { ...prev, selected_dates: [...dates, date].sort() };
      }
    });
  };

  // Helper: Generate dates in range
  const getDateRange = (start, end) => {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Helper: Render small calendar
  const renderCalendar = () => {
    const today = new Date(deliveryDate);
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    
    return days;
  };

  // Save quantity change (today only)
  const handleSaveQty = async () => {
    if (newQty === product.quantity_packets) {
      setEditingQty(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/override-quantity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: delivery.customer_id,
          product_id: product.product_id,
          date: deliveryDate,
          quantity: newQty
        })
      });

      if (!res.ok) throw new Error('Failed to update quantity');

      toast.success('Quantity updated for today');
      setEditingQty(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Save shift change
  const handleSaveShift = async (applyTo) => {
    if (newShift === delivery.shift) {
      setEditingShift(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // For today only
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/override-shift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: delivery.customer_id,
          product_id: product.product_id,
          date: deliveryDate,
          shift: newShift
        })
      });

      if (!res.ok) throw new Error('Failed to update shift');

      toast.success(`Shift updated for ${applyTo === 'today' ? 'today' : 'permanently'}`);
      setEditingShift(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    }
  };

  // Save delivery boy change
  const handleSaveDeliveryBoy = async (applyTo) => {
    if (newDeliveryBoy === delivery.delivery_boy_id) {
      setEditingDeliveryBoy(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/override-delivery-boy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: delivery.customer_id,
          product_id: product.product_id,
          date: deliveryDate,
          delivery_boy: newDeliveryBoy
        })
      });

      if (!res.ok) throw new Error('Failed to update delivery boy');

      toast.success(`Delivery boy updated for ${applyTo === 'today' ? 'today' : 'permanently'}`);
      setEditingDeliveryBoy(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating delivery boy:', error);
      toast.error('Failed to update delivery boy');
    }
  };

  return (
    <>
      {/* Quantity Column - Inline Editable */}
      <td className="px-4 py-3 text-center">
        {editingQty ? (
          <div className="flex items-center justify-center gap-1">
            <Input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
              className="w-16 h-8 text-center"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveQty();
                if (e.key === 'Escape') {
                  setNewQty(product.quantity_packets);
                  setEditingQty(false);
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-green-100"
              onClick={handleSaveQty}
              title="Save (today only)"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-red-100"
              onClick={() => {
                setNewQty(product.quantity_packets);
                setEditingQty(false);
              }}
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div
            className="inline-flex items-center gap-2 cursor-pointer group"
            onClick={() => setEditingQty(true)}
          >
            <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md font-semibold group-hover:bg-blue-200 transition-colors">
              {product.quantity_packets}
            </span>
            <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </td>

      {/* Area, Shift, Delivery Boy only on first product row */}
      {product.isFirstProduct && (
        <>
          {/* Area Column */}
          <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
            <div className="text-gray-700">{delivery.area}</div>
          </td>

          {/* Shift Column - Inline Dropdown */}
          <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
            {editingShift ? (
              <div className="flex items-center gap-1">
                <Select value={newShift} onValueChange={setNewShift}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-green-100"
                  onClick={() => handleSaveShift('today')}
                  title="Save for today"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-red-100"
                  onClick={() => {
                    setNewShift(delivery.shift);
                    setEditingShift(false);
                  }}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-2 cursor-pointer group"
                onClick={() => setEditingShift(true)}
              >
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  delivery.shift?.toLowerCase().includes('morning')
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current mr-1"></span>
                  {delivery.shift}
                </span>
                <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </td>

          {/* Delivery Boy Column - Inline Dropdown */}
          <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
            {editingDeliveryBoy ? (
              <div className="flex items-center gap-1">
                <Select value={newDeliveryBoy} onValueChange={(value) => {
                  setNewDeliveryBoy(value);
                  const selectedBoy = deliveryBoys.find(b => b.id === value);
                  setNewDeliveryBoyName(selectedBoy?.name || '');
                }}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryBoys.map(boy => (
                      <SelectItem key={boy.id} value={boy.id}>{boy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-green-100"
                  onClick={() => handleSaveDeliveryBoy('today')}
                  title="Save for today"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-red-100"
                  onClick={() => {
                    setNewDeliveryBoy(delivery.delivery_boy_id);
                    setNewDeliveryBoyName(delivery.delivery_boy_name);
                    setEditingDeliveryBoy(false);
                  }}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-2 cursor-pointer group"
                onClick={() => setEditingDeliveryBoy(true)}
              >
                <span className="text-purple-700 font-medium">
                  {delivery.delivery_boy_name || 'RUDRESH'}
                </span>
                <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </td>

          {/* Actions Column - Dropdown Menu */}
          <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowPauseDialog(true)}>
                  ⏸️ Pause Delivery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowStopDialog(true)}>
                  🛑 Stop Delivery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddProductDialog(true)}>
                  ➕ Add Product
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowNotesDialog(true)}>
                  📝 Add Notes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </>
      )}

      {/* Pause Dialog - Only render once per delivery */}
      {product.isFirstProduct && (
        <>
          <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pause Delivery</DialogTitle>
                <DialogDescription>Temporarily pause delivery for this product</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={pauseForm.start_date}
                    onChange={(e) => setPauseForm({ ...pauseForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={pauseForm.end_date}
                    onChange={(e) => setPauseForm({ ...pauseForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPauseDialog(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/api/phase0-v2/delivery/pause`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        customer_id: delivery.customer_id,
                        product_id: product.product_id,
                        start_date: pauseForm.start_date,
                        end_date: pauseForm.end_date && pauseForm.end_date.trim() !== '' ? pauseForm.end_date : null
                      })
                    });
                    if (!res.ok) throw new Error('Failed to pause');
                    toast.success('Delivery paused');
                    setShowPauseDialog(false);
                    if (onUpdate) onUpdate();
                  } catch (error) {
                    toast.error('Failed to pause delivery');
                  }
                }}>Pause</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stop Dialog */}
          <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stop Delivery</DialogTitle>
                <DialogDescription>Permanently stop delivery for this product</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">
                    ⚠️ This will permanently stop the subscription. The customer will need to manually reactivate it.
                  </p>
                </div>
                <div>
                  <Label>Reason (Optional)</Label>
                  <Input
                    placeholder="e.g., Customer requested, delivery issues..."
                    value={stopForm.reason}
                    onChange={(e) => setStopForm({ ...stopForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowStopDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/api/phase0-v2/delivery/stop`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        customer_id: delivery.customer_id,
                        product_id: product.product_id,
                        reason: stopForm.reason
                      })
                    });
                    if (!res.ok) throw new Error('Failed to stop delivery');
                    toast.success('Delivery stopped permanently');
                    setShowStopDialog(false);
                    setStopForm({ reason: '' });
                    if (onUpdate) onUpdate();
                  } catch (error) {
                    toast.error('Failed to stop delivery');
                  }
                }}>Stop Delivery</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Product Dialog - Enhanced with Date Selection */}
          <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
            <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
                <DialogDescription>Add an additional product for this customer</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Product Selection */}
                <div>
                  <Label>Product</Label>
                  <Select value={addProductForm.product_id} onValueChange={(val) => setAddProductForm({ ...addProductForm, product_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={addProductForm.quantity}
                    onChange={(e) => setAddProductForm({ ...addProductForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                {/* Date Mode Selection */}
                <div>
                  <Label>Date Selection</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={addProductForm.dateMode === 'single' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAddProductForm({ ...addProductForm, dateMode: 'single' })}
                    >
                      📅 Single Date
                    </Button>
                    <Button
                      variant={addProductForm.dateMode === 'range' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAddProductForm({ ...addProductForm, dateMode: 'range' })}
                    >
                      📅 Date Range
                    </Button>
                    <Button
                      variant={addProductForm.dateMode === 'multiple' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setAddProductForm({ ...addProductForm, dateMode: 'multiple' }); setShowCalendar(!showCalendar); }}
                    >
                      📆 Multiple
                    </Button>
                  </div>
                </div>

                {/* Single Date */}
                {addProductForm.dateMode === 'single' && (
                  <div>
                    <Label>Select Date</Label>
                    <Input
                      type="date"
                      value={addProductForm.single_date}
                      onChange={(e) => setAddProductForm({ ...addProductForm, single_date: e.target.value })}
                    />
                  </div>
                )}

                {/* Date Range */}
                {addProductForm.dateMode === 'range' && (
                  <div className="space-y-2">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={addProductForm.start_date}
                        onChange={(e) => setAddProductForm({ ...addProductForm, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={addProductForm.end_date}
                        onChange={(e) => setAddProductForm({ ...addProductForm, end_date: e.target.value })}
                      />
                    </div>
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      📌 Product will be added for {getDateRange(addProductForm.start_date, addProductForm.end_date).length} dates
                    </div>
                  </div>
                )}

                {/* Multiple Dates with Calendar */}
                {addProductForm.dateMode === 'multiple' && (
                  <div>
                    <Label>Select Dates</Label>
                    {showCalendar && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-7 gap-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center font-semibold text-xs text-gray-600 h-8 flex items-center justify-center">
                              {day}
                            </div>
                          ))}
                          {renderCalendar().map((dateStr, idx) => {
                            const isSelected = dateStr && addProductForm.selected_dates?.includes(dateStr);
                            const isToday = dateStr === deliveryDate;
                            return (
                              <button
                                key={idx}
                                onClick={() => dateStr && toggleDateSelection(dateStr)}
                                disabled={!dateStr}
                                className={`h-8 text-xs font-medium rounded transition-colors ${
                                  !dateStr ? 'bg-transparent' :
                                  isSelected ? 'bg-blue-500 text-white' :
                                  isToday ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                                  'bg-white border border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {dateStr ? new Date(dateStr).getDate() : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-600 bg-green-50 p-2 rounded mt-2">
                      ✓ {addProductForm.selected_dates?.length || 0} dates selected
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    if (!addProductForm.product_id) {
                      toast.error('Please select a product');
                      return;
                    }

                    const token = localStorage.getItem('token');
                    let dates = [];

                    if (addProductForm.dateMode === 'single') {
                      dates = [addProductForm.single_date];
                    } else if (addProductForm.dateMode === 'range') {
                      dates = getDateRange(addProductForm.start_date, addProductForm.end_date);
                    } else {
                      dates = addProductForm.selected_dates;
                    }

                    if (dates.length === 0) {
                      toast.error('Please select at least one date');
                      return;
                    }

                    // Add product for each date
                    for (const date of dates) {
                      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/add-product`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          customer_id: delivery.customer_id,
                          product_id: addProductForm.product_id,
                          date: date,
                          quantity: addProductForm.quantity
                        })
                      });
                      if (!res.ok) throw new Error('Failed to add product');
                    }

                    toast.success(`Product added for ${dates.length} date(s)`);
                    setShowAddProductDialog(false);
                    setAddProductForm({
                      product_id: '',
                      quantity: 1,
                      dateMode: 'single',
                      single_date: deliveryDate,
                      start_date: deliveryDate,
                      end_date: deliveryDate,
                      selected_dates: [deliveryDate]
                    });
                    setShowCalendar(false);
                    if (onUpdate) onUpdate();
                  } catch (error) {
                    console.error('Error:', error);
                    toast.error('Failed to add product');
                  }
                }}>Add Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Notes</DialogTitle>
                <DialogDescription>Add special instructions for this delivery</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Notes / Requests</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter special instructions..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/api/phase0-v2/delivery/add-notes`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        customer_id: delivery.customer_id,
                        date: deliveryDate,
                        notes: notes
                      })
                    });
                    if (!res.ok) throw new Error('Failed to add notes');
                    toast.success('Notes saved');
                    setShowNotesDialog(false);
                    setNotes('');
                    if (onUpdate) onUpdate();
                  } catch (error) {
                    toast.error('Failed to save notes');
                  }
                }}>Save Notes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
