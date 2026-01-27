import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Edit2, Pause, Plus, UserCog, Clock, MessageSquare, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Inline editable delivery row actions component
 * Provides quantity editing, pause, delivery boy change, shift change, add product, and notes
 */
export function DeliveryRowActions({
  delivery,
  product,
  deliveryDate,
  deliveryBoys = [],
  allProducts = [],
  onUpdate
}) {
  const [editingQty, setEditingQty] = useState(false);
  const [newQty, setNewQty] = useState(product.quantity_packets);

  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseForm, setPauseForm] = useState({
    start_date: deliveryDate,
    end_date: null,
    apply_to: 'this_date' // 'this_date' or 'permanent'
  });

  const [showDeliveryBoyDialog, setShowDeliveryBoyDialog] = useState(false);
  const [deliveryBoyForm, setDeliveryBoyForm] = useState({
    delivery_boy: delivery.delivery_boy_name || '',
    apply_to: 'this_date' // 'this_date' or 'permanent'
  });

  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    shift: delivery.shift || 'morning',
    apply_to: 'this_date' // 'this_date' or 'permanent'
  });

  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [addProductForm, setAddProductForm] = useState({
    product_id: '',
    quantity: 1
  });

  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');

  // Save quantity change
  const handleSaveQty = async (applyTo) => {
    if (newQty === product.quantity_packets) {
      setEditingQty(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // For now, only support today-only changes since we don't have subscription_id
      // TODO: Get subscription_id from API to support permanent changes
      if (applyTo === 'permanent' && !product.subscription_id) {
        toast.error('Permanent changes require subscription information. Please use the customer details modal.');
        setEditingQty(false);
        return;
      }

      const endpoint = applyTo === 'permanent'
        ? `/api/phase0-v2/subscriptions/${product.subscription_id}/update-quantity`
        : `/api/phase0-v2/delivery/override-quantity`;

      const payload = applyTo === 'permanent'
        ? { default_qty: newQty }
        : {
            customer_id: delivery.customer_id,
            product_id: product.product_id,
            date: deliveryDate,
            quantity: newQty
          };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: applyTo === 'permanent' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update quantity');

      toast.success(`Quantity updated ${applyTo === 'permanent' ? 'permanently' : 'for today'}`);
      setEditingQty(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Pause delivery
  const handlePause = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = pauseForm.apply_to === 'permanent'
        ? `/api/phase0-v2/subscriptions/${product.subscription_id}/pause`
        : `/api/phase0-v2/delivery/pause`;

      const payload = pauseForm.apply_to === 'permanent'
        ? {
            pause_start: pauseForm.start_date,
            pause_end: pauseForm.end_date
          }
        : {
            customer_id: delivery.customer_id,
            product_id: product.product_id,
            start_date: pauseForm.start_date,
            end_date: pauseForm.end_date
          };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: pauseForm.apply_to === 'permanent' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to pause delivery');

      toast.success(`Delivery paused ${pauseForm.apply_to === 'permanent' ? 'permanently' : 'for selected dates'}`);
      setShowPauseDialog(false);
      setPauseForm({ start_date: deliveryDate, end_date: null, apply_to: 'this_date' });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error pausing delivery:', error);
      toast.error('Failed to pause delivery');
    }
  };

  // Change delivery boy
  const handleDeliveryBoyChange = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = deliveryBoyForm.apply_to === 'permanent'
        ? `/api/phase0-v2/subscriptions/${product.subscription_id}/update-delivery-boy`
        : `/api/phase0-v2/delivery/override-delivery-boy`;

      const payload = deliveryBoyForm.apply_to === 'permanent'
        ? { delivery_boy: deliveryBoyForm.delivery_boy }
        : {
            customer_id: delivery.customer_id,
            product_id: product.product_id,
            date: deliveryDate,
            delivery_boy: deliveryBoyForm.delivery_boy
          };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: deliveryBoyForm.apply_to === 'permanent' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update delivery boy');

      toast.success(`Delivery boy updated ${deliveryBoyForm.apply_to === 'permanent' ? 'permanently' : 'for today'}`);
      setShowDeliveryBoyDialog(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating delivery boy:', error);
      toast.error('Failed to update delivery boy');
    }
  };

  // Change shift
  const handleShiftChange = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = shiftForm.apply_to === 'permanent'
        ? `/api/phase0-v2/subscriptions/${product.subscription_id}/update-shift`
        : `/api/phase0-v2/delivery/override-shift`;

      const payload = shiftForm.apply_to === 'permanent'
        ? { shift: shiftForm.shift }
        : {
            customer_id: delivery.customer_id,
            product_id: product.product_id,
            date: deliveryDate,
            shift: shiftForm.shift
          };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: shiftForm.apply_to === 'permanent' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update shift');

      toast.success(`Shift updated ${shiftForm.apply_to === 'permanent' ? 'permanently' : 'for today'}`);
      setShowShiftDialog(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    }
  };

  // Add product
  const handleAddProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/add-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: delivery.customer_id,
          product_id: addProductForm.product_id,
          date: deliveryDate,
          quantity: addProductForm.quantity
        })
      });

      if (!res.ok) throw new Error('Failed to add product');

      toast.success('Product added for this delivery');
      setShowAddProductDialog(false);
      setAddProductForm({ product_id: '', quantity: 1 });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
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

      if (!res.ok) throw new Error('Failed to save notes');

      toast.success('Notes saved successfully');
      setShowNotesDialog(false);
      setNotes('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  return (
    <>
      {/* Inline Quantity Editor */}
      <td className="px-4 py-3 text-center">
        {editingQty ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
              className="w-16 h-8 text-center"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-green-100"
              onClick={() => handleSaveQty('this_date')}
              title="Save (applies to today only)"
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
            <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold group-hover:bg-blue-200">
              {product.quantity_packets}
            </span>
            <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </td>

      {/* Action Buttons (only show on first product row) */}
      {product.isFirstProduct && (
        <td rowSpan={delivery.products.length} className="px-4 py-3 align-top">
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs h-7"
              onClick={() => setShowPauseDialog(true)}
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs h-7"
              onClick={() => setShowDeliveryBoyDialog(true)}
            >
              <UserCog className="h-3 w-3 mr-1" />
              Change Boy
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs h-7"
              onClick={() => setShowShiftDialog(true)}
            >
              <Clock className="h-3 w-3 mr-1" />
              Change Shift
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs h-7"
              onClick={() => setShowAddProductDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Product
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs h-7"
              onClick={() => setShowNotesDialog(true)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Add Notes
            </Button>
          </div>
        </td>
      )}

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Delivery</DialogTitle>
            <DialogDescription>
              Temporarily pause delivery for this product
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Apply To</Label>
              <Select value={pauseForm.apply_to} onValueChange={(val) => setPauseForm({ ...pauseForm, apply_to: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_date">This Date Only</SelectItem>
                  <SelectItem value="permanent">Date Range (Permanent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={pauseForm.start_date}
                onChange={(e) => setPauseForm({ ...pauseForm, start_date: e.target.value })}
              />
            </div>
            {pauseForm.apply_to === 'permanent' && (
              <div>
                <Label>End Date (Optional - leave empty for indefinite)</Label>
                <Input
                  type="date"
                  value={pauseForm.end_date || ''}
                  onChange={(e) => setPauseForm({ ...pauseForm, end_date: e.target.value || null })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseDialog(false)}>Cancel</Button>
            <Button onClick={handlePause}>Pause Delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Boy Change Dialog */}
      <Dialog open={showDeliveryBoyDialog} onOpenChange={setShowDeliveryBoyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Delivery Boy</DialogTitle>
            <DialogDescription>
              Assign a different delivery boy for this delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Apply To</Label>
              <Select value={deliveryBoyForm.apply_to} onValueChange={(val) => setDeliveryBoyForm({ ...deliveryBoyForm, apply_to: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_date">This Date Only</SelectItem>
                  <SelectItem value="permanent">Permanent (All Future Deliveries)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Boy</Label>
              <Select value={deliveryBoyForm.delivery_boy} onValueChange={(val) => setDeliveryBoyForm({ ...deliveryBoyForm, delivery_boy: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deliveryBoys.map(boy => (
                    <SelectItem key={boy.name} value={boy.name}>{boy.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryBoyDialog(false)}>Cancel</Button>
            <Button onClick={handleDeliveryBoyChange}>Update Delivery Boy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Change Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Shift</DialogTitle>
            <DialogDescription>
              Change delivery shift (morning or evening)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Apply To</Label>
              <Select value={shiftForm.apply_to} onValueChange={(val) => setShiftForm({ ...shiftForm, apply_to: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_date">This Date Only</SelectItem>
                  <SelectItem value="permanent">Permanent (All Future Deliveries)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={shiftForm.shift} onValueChange={(val) => setShiftForm({ ...shiftForm, shift: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>Cancel</Button>
            <Button onClick={handleShiftChange}>Update Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Delivery</DialogTitle>
            <DialogDescription>
              Add an additional product to this delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={addProductForm.quantity}
                onChange={(e) => setAddProductForm({ ...addProductForm, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <p className="text-sm text-gray-500">This will add the product for this delivery date only.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>Cancel</Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Special Instructions</DialogTitle>
            <DialogDescription>
              Add notes or special requests for this delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Notes / Requests</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter special instructions for this delivery..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
