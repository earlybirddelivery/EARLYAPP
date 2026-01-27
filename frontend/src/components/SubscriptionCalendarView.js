import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Pause, Play, Edit2, Plus, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== MONTH CALENDAR VIEW ====================

export function SubscriptionCalendarMonth({ customer }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subscriptions, setSubscriptions] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  useEffect(() => {
    loadSubscriptions();
    generateCalendarDays();
  }, [currentDate, customer]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/phase0-v2/customers/${customer.id}/subscriptions`);
      setSubscriptions(res.data.subscriptions || []);
    } catch (error) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        day: i,
      });
    }

    // Empty cells for days after month ends
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    setCalendarDays(days);
  };

  const getDeliveriesForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    
    return subscriptions.flatMap(sub => {
      const deliveries = [];
      
      // Check if within pause interval
      const isPaused = sub.pause_intervals?.some(p => {
        const start = new Date(p.start);
        const end = p.end ? new Date(p.end) : null;
        return date >= start && (!end || date <= end);
      });
      
      if (isPaused) return deliveries;

      // Check fixed daily
      if (sub.mode === 'fixed_daily' && sub.default_qty > 0) {
        deliveries.push({
          id: sub.id,
          type: 'fixed',
          product: sub.product_name,
          quantity: sub.default_qty,
          shift: sub.shift,
          subscription_id: sub.id,
        });
      }

      // Check weekly pattern
      if (sub.mode === 'weekly_pattern' && sub.weekly_pattern?.includes(date.getDay())) {
        deliveries.push({
          id: sub.id,
          type: 'weekly',
          product: sub.product_name,
          quantity: sub.default_qty,
          shift: sub.shift,
          subscription_id: sub.id,
        });
      }

      // Check day overrides
      const override = sub.day_overrides?.find(o => o.date === dateStr);
      if (override) {
        deliveries.push({
          id: sub.id,
          type: 'override',
          product: sub.product_name,
          quantity: override.quantity,
          shift: sub.shift,
          subscription_id: sub.id,
        });
      }

      // Check irregular list
      const irregular = sub.irregular_list?.find(i => i.date === dateStr);
      if (irregular) {
        deliveries.push({
          id: sub.id,
          type: 'irregular',
          product: sub.product_name,
          quantity: irregular.quantity,
          shift: irregular.shift || sub.shift,
          subscription_id: sub.id,
        });
      }

      return deliveries;
    });
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{customer.name} - Delivery Calendar</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold w-32 text-center">{monthName}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="h-10 flex items-center justify-center font-semibold text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 auto-rows-[120px]">
            {calendarDays.map((dayData, idx) => {
              const deliveries = dayData.isCurrentMonth ? getDeliveriesForDate(dayData.date) : [];
              const isPast = dayData.date && dayData.date < new Date(new Date().toDateString());
              const isToday = dayData.date?.toDateString() === new Date().toDateString();

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (dayData.isCurrentMonth) {
                      setSelectedDay(dayData.date);
                      setShowDayModal(true);
                    }
                  }}
                  className={`border p-1.5 rounded cursor-pointer transition overflow-hidden ${
                    !dayData.isCurrentMonth
                      ? 'bg-gray-50 border-gray-200'
                      : isToday
                      ? 'bg-blue-50 border-blue-300 border-2'
                      : deliveries.length > 0
                      ? 'bg-green-50 border-green-300 hover:bg-green-100'
                      : isPast
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {dayData.isCurrentMonth && (
                    <>
                      <div className={`text-xs font-bold ${isToday ? 'text-blue-700' : ''}`}>
                        {dayData.day}
                      </div>
                      <div className="text-xs space-y-0.5 max-h-20 overflow-y-auto">
                        {deliveries.map((d, i) => (
                          <div key={i} className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs truncate">
                            {d.product} {d.quantity}{d.quantity > 1 ? 'L' : ''}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Details Modal */}
      <DayDetailsModal
        open={showDayModal}
        onOpenChange={setShowDayModal}
        date={selectedDay}
        deliveries={selectedDay ? getDeliveriesForDate(selectedDay) : []}
        subscriptions={subscriptions}
        customer={customer}
        onRefresh={loadSubscriptions}
      />
    </div>
  );
}

// ==================== DAY DETAILS MODAL ====================

function DayDetailsModal({ open, onOpenChange, date, deliveries, subscriptions, customer, onRefresh }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  if (!date) return null;

  const dateStr = date.toISOString().split('T')[0];
  const isPast = date < new Date(new Date().toDateString());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{date.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</DialogTitle>
          <DialogDescription>
            {deliveries.length > 0 ? `${deliveries.length} delivery(ies) scheduled` : 'No deliveries scheduled'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deliveries */}
          <div>
            <h4 className="font-semibold mb-3">Scheduled Deliveries</h4>
            {deliveries.length > 0 ? (
              <div className="space-y-2">
                {deliveries.map((d, idx) => (
                  <div key={idx} className="bg-green-50 border border-green-200 rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{d.product}</div>
                      <div className="text-sm text-gray-600">
                        <span className="inline-block mr-3">Qty: {d.quantity}L</span>
                        <span className="inline-block">Shift: {d.shift === 'morning' ? '🌅 Morning' : '🌆 Evening'}</span>
                      </div>
                    </div>
                    {!isPast && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDelivery(d);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            setSelectedDelivery(d);
                            setShowPauseDialog(true);
                          }}
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No deliveries scheduled for this date</p>
              </div>
            )}
          </div>

          {/* Add Delivery Button */}
          {!isPast && (
            <Button onClick={() => setShowAddDialog(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Delivery
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Delivery Dialog */}
      <AddDeliveryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        date={dateStr}
        customer={customer}
        onSuccess={onRefresh}
      />

      {/* Edit Delivery Dialog */}
      {selectedDelivery && (
        <EditDeliveryDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          delivery={selectedDelivery}
          date={dateStr}
          customer={customer}
          onSuccess={() => {
            setShowEditDialog(false);
            onRefresh();
          }}
        />
      )}

      {/* Pause Dialog */}
      {selectedDelivery && (
        <PauseDeliveryDialog
          open={showPauseDialog}
          onOpenChange={setShowPauseDialog}
          delivery={selectedDelivery}
          date={dateStr}
          customer={customer}
          onSuccess={() => {
            setShowPauseDialog(false);
            onRefresh();
          }}
        />
      )}
    </Dialog>
  );
}

// ==================== ADD DELIVERY DIALOG ====================

function AddDeliveryDialog({ open, onOpenChange, date, customer, onSuccess }) {
  const [form, setForm] = useState({ product_id: '', quantity: 1, shift: 'morning' });

  const handleSubmit = async () => {
    try {
      await api.post(`/phase0-v2/customer/${customer.id}/add-delivery`, {
        date,
        product_id: form.product_id,
        quantity: parseFloat(form.quantity),
        shift: form.shift,
      });
      toast.success('Delivery added');
      setForm({ product_id: '', quantity: 1, shift: 'morning' });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Failed to add delivery');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Delivery for {date}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Product</Label>
            <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="milk-full">Milk - Full Fat</SelectItem>
                <SelectItem value="milk-low">Milk - Low Fat</SelectItem>
                <SelectItem value="curd">Curd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quantity (L)</Label>
            <Input type="number" step="0.5" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>

          <div>
            <Label>Shift</Label>
            <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">🌅 Morning</SelectItem>
                <SelectItem value="evening">🌆 Evening</SelectItem>
                <SelectItem value="both">🌅🌆 Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== EDIT DELIVERY DIALOG ====================

function EditDeliveryDialog({ open, onOpenChange, delivery, date, customer, onSuccess }) {
  const [quantity, setQuantity] = useState(delivery.quantity);
  const [shift, setShift] = useState(delivery.shift);

  const handleSubmit = async () => {
    try {
      await api.post(`/phase0-v2/customer/${customer.id}/update-delivery`, {
        subscription_id: delivery.subscription_id,
        date,
        quantity: parseFloat(quantity),
        shift,
      });
      toast.success('Delivery updated');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Failed to update delivery');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {delivery.product}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Quantity (L)</Label>
            <Input type="number" step="0.5" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          <div>
            <Label>Shift</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">🌅 Morning</SelectItem>
                <SelectItem value="evening">🌆 Evening</SelectItem>
                <SelectItem value="both">🌅🌆 Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== PAUSE DELIVERY DIALOG ====================

function PauseDeliveryDialog({ open, onOpenChange, delivery, date, customer, onSuccess }) {
  const [pauseType, setPauseType] = useState('single'); // single, from_date, range
  const [endDate, setEndDate] = useState('');

  const handleSubmit = async () => {
    try {
      await api.post(`/phase0-v2/customer/${customer.id}/pause-delivery`, {
        subscription_id: delivery.subscription_id,
        pause_type: pauseType,
        start_date: date,
        end_date: pauseType === 'range' ? endDate : null,
      });
      toast.success('Delivery paused');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('Failed to pause delivery');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pause {delivery.product}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Pause Type</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={pauseType === 'single'} onChange={() => setPauseType('single')} />
                <span>This delivery only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={pauseType === 'from_date'} onChange={() => setPauseType('from_date')} />
                <span>From {date} onwards</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={pauseType === 'range'} onChange={() => setPauseType('range')} />
                <span>Range</span>
              </label>
            </div>
          </div>

          {pauseType === 'range' && (
            <div>
              <Label>Until Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Pause</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
