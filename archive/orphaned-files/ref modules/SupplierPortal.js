import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Package, Truck, Plus, Edit, Trash2, LogOut, RefreshCw,
  AlertCircle, CheckCircle, Clock, MapPin, Phone
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const SupplierPortal = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [filterStatus, setFilterStatus] = useState('pending');
  
  // New request modal
  const [newRequestModal, setNewRequestModal] = useState({
    open: false,
    product_id: '',
    quantity: '',
    delivery_date: '',
    notes: ''
  });
  
  // Inventory modal
  const [inventoryModal, setInventoryModal] = useState({
    open: false,
    product_id: '',
    quantity: '',
    unit_price: '',
    expiry_date: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (activeTab === 'requests') {
        const res = await fetch(
          `${API_URL}/api/supplier/requests?status=${filterStatus}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!res.ok) throw new Error('Failed to load requests');
        const data = await res.json();
        setRequests(data.requests || []);
      } else if (activeTab === 'inventory') {
        const res = await fetch(
          `${API_URL}/api/supplier/inventory`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!res.ok) throw new Error('Failed to load inventory');
        const data = await res.json();
        setInventory(data.inventory || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/supplier/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: newRequestModal.product_id,
          quantity: parseFloat(newRequestModal.quantity),
          delivery_date: newRequestModal.delivery_date,
          notes: newRequestModal.notes
        })
      });
      
      if (!res.ok) throw new Error('Failed to create request');
      
      toast.success('Procurement request created');
      setNewRequestModal({ open: false, product_id: '', quantity: '', delivery_date: '', notes: '' });
      loadData();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    }
  };

  const handleUpdateInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/supplier/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: inventoryModal.product_id,
          quantity: parseFloat(inventoryModal.quantity),
          unit_price: parseFloat(inventoryModal.unit_price),
          expiry_date: inventoryModal.expiry_date
        })
      });
      
      if (!res.ok) throw new Error('Failed to update inventory');
      
      toast.success('Inventory updated');
      setInventoryModal({ open: false, product_id: '', quantity: '', unit_price: '', expiry_date: '' });
      loadData();
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/supplier/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to accept request');
      
      toast.success('Request accepted');
      loadData();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId, reason) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/supplier/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      if (!res.ok) throw new Error('Failed to reject request');
      
      toast.success('Request rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'accepted': return 'text-blue-600 bg-blue-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold">Supplier Portal</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/login')} variant="outline">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-2 px-4 font-medium border-b-2 transition ${
              activeTab === 'requests'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Procurement Requests
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-2 px-4 font-medium border-b-2 transition ${
              activeTab === 'inventory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Inventory Management
          </button>
        </div>

        {/* Procurement Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={() => setNewRequestModal({ ...newRequestModal, open: true })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>

            <div className="grid gap-4">
              {requests.length > 0 ? (
                requests.map(request => (
                  <div key={request.id} className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold">{request.product_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Quantity: <span className="font-medium">{request.quantity} units</span>
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status === 'pending' && <Clock className="w-3 h-3" />}
                        {request.status === 'accepted' && <CheckCircle className="w-3 h-3" />}
                        {request.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                        {request.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-4 py-2 border-t border-b">
                      <div>
                        <span className="text-gray-600">Required By:</span>
                        <p className="font-medium">{new Date(request.delivery_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Price:</span>
                        <p className="font-medium">₹{request.unit_price?.toFixed(2) || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <p className="font-medium">₹{(request.quantity * (request.unit_price || 0)).toFixed(2)}</p>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="text-sm mb-3 p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Notes:</span>
                        <p className="text-gray-900 mt-1">{request.notes}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleRejectRequest(request.id, 'Out of stock')}
                          variant="outline"
                          className="flex-1"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No {filterStatus} requests</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Management Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setInventoryModal({ ...inventoryModal, open: true })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium">Unit Price</th>
                    <th className="px-4 py-3 text-left font-medium">Expiry Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3">₹{item.unit_price?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          item.quantity > 10 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.quantity > 10 ? 'In Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <Button
                          onClick={() => setInventoryModal({ 
                            open: true, 
                            product_id: item.product_id,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            expiry_date: item.expiry_date
                          })}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {inventory.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No inventory items</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Dialog open={newRequestModal.open} onOpenChange={(open) => 
        setNewRequestModal({ ...newRequestModal, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Procurement Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Product</Label>
              <Input
                placeholder="Product name or ID"
                value={newRequestModal.product_id}
                onChange={(e) => setNewRequestModal({ ...newRequestModal, product_id: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newRequestModal.quantity}
                  onChange={(e) => setNewRequestModal({ ...newRequestModal, quantity: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Delivery Date</Label>
                <Input
                  type="date"
                  value={newRequestModal.delivery_date}
                  onChange={(e) => setNewRequestModal({ ...newRequestModal, delivery_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                placeholder="Special requirements..."
                value={newRequestModal.notes}
                onChange={(e) => setNewRequestModal({ ...newRequestModal, notes: e.target.value })}
                className="mt-1 h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setNewRequestModal({ ...newRequestModal, open: false })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={!newRequestModal.product_id || !newRequestModal.quantity}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Modal */}
      <Dialog open={inventoryModal.open} onOpenChange={(open) => 
        setInventoryModal({ ...inventoryModal, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Inventory</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Product</Label>
              <Input
                placeholder="Product name or ID"
                value={inventoryModal.product_id}
                onChange={(e) => setInventoryModal({ ...inventoryModal, product_id: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={inventoryModal.quantity}
                  onChange={(e) => setInventoryModal({ ...inventoryModal, quantity: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Unit Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  step="0.01"
                  value={inventoryModal.unit_price}
                  onChange={(e) => setInventoryModal({ ...inventoryModal, unit_price: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Expiry Date</Label>
              <Input
                type="date"
                value={inventoryModal.expiry_date}
                onChange={(e) => setInventoryModal({ ...inventoryModal, expiry_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setInventoryModal({ ...inventoryModal, open: false })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateInventory}
              disabled={!inventoryModal.product_id || !inventoryModal.quantity}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
