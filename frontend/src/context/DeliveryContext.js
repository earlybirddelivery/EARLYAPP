import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DeliveryContext = createContext(null);

export function DeliveryProvider({ children }) {
  // Main delivery data
  const [deliveries, setDeliveries] = useState([]);
  const [pausedDeliveries, setPausedDeliveries] = useState([]);
  const [addedProducts, setAddedProducts] = useState([]); // One-time added products

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Pending approvals (staff changes)
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Get auth token
  const getToken = () => localStorage.getItem('token');

  // Add to undo stack
  const pushUndo = useCallback((action) => {
    setUndoStack(prev => [...prev.slice(-19), action]); // Keep last 20 actions
    setRedoStack([]); // Clear redo on new action
  }, []);

  // Undo last action
  const undo = useCallback(async () => {
    if (undoStack.length === 0) {
      toast.info('Nothing to undo');
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    try {
      const token = getToken();

      switch (lastAction.type) {
        case 'pause':
          // Reverse pause - call unpause endpoint
          await fetch(`${API_URL}/api/phase0-v2/delivery/unpause`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_id: lastAction.customer_id,
              product_id: lastAction.product_id,
              date: lastAction.date
            })
          });

          // Move back to active deliveries
          setPausedDeliveries(prev => prev.filter(d =>
            !(d.customer_id === lastAction.customer_id &&
              d.product_id === lastAction.product_id &&
              d.date === lastAction.date)
          ));

          // Re-add to deliveries
          if (lastAction.originalDelivery) {
            setDeliveries(prev => [...prev, lastAction.originalDelivery]);
          }

          toast.success('Pause reversed');
          break;

        case 'add_product':
          // Remove added product
          await fetch(`${API_URL}/api/phase0-v2/delivery/remove-added-product`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              delivery_id: lastAction.delivery_id
            })
          });

          setAddedProducts(prev => prev.filter(p => p.id !== lastAction.delivery_id));
          toast.success('Added product removed');
          break;

        case 'shift_change':
          // Revert shift
          await fetch(`${API_URL}/api/phase0-v2/delivery/override-shift`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_id: lastAction.customer_id,
              product_id: lastAction.product_id,
              date: lastAction.date,
              shift: lastAction.previousValue
            })
          });

          // Update local state
          setDeliveries(prev => prev.map(d => {
            if (d.customer_id === lastAction.customer_id) {
              return { ...d, shift: lastAction.previousValue };
            }
            return d;
          }));

          toast.success('Shift change reversed');
          break;

        case 'quantity_change':
          // Revert quantity
          await fetch(`${API_URL}/api/phase0-v2/delivery/override-quantity`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer_id: lastAction.customer_id,
              product_id: lastAction.product_id,
              date: lastAction.date,
              quantity: lastAction.previousValue
            })
          });

          toast.success('Quantity change reversed');
          break;

        default:
          toast.error('Cannot undo this action');
      }

      // Add to redo stack
      setRedoStack(prev => [...prev, lastAction]);

    } catch (error) {
      console.error('Undo failed:', error);
      toast.error('Failed to undo action');
      // Re-add to undo stack if failed
      setUndoStack(prev => [...prev, lastAction]);
    }
  }, [undoStack]);

  // Pause a delivery (instant UI update)
  const pauseDelivery = useCallback(async (delivery, product, date, endDate = null) => {
    const token = getToken();

    // Optimistic update - move to paused section immediately
    const pausedItem = {
      ...delivery,
      product_id: product.product_id,
      product_name: product.product_name,
      quantity: product.quantity,
      date: date,
      end_date: endDate,
      paused_at: new Date().toISOString(),
      status: 'paused'
    };

    // Remove from active deliveries
    setDeliveries(prev => prev.filter(d =>
      !(d.customer_id === delivery.customer_id && d.serial === delivery.serial)
    ));

    // Add to paused section
    setPausedDeliveries(prev => [...prev, pausedItem]);

    // Push to undo stack
    pushUndo({
      type: 'pause',
      customer_id: delivery.customer_id,
      product_id: product.product_id,
      date: date,
      end_date: endDate,
      originalDelivery: delivery,
      timestamp: Date.now()
    });

    try {
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: delivery.customer_id,
          product_id: product.product_id,
          start_date: date,
          end_date: endDate
        })
      });

      if (!res.ok) {
        throw new Error('Failed to pause delivery');
      }

      toast.success('Delivery paused', {
        action: {
          label: 'Undo',
          onClick: () => undo()
        }
      });

    } catch (error) {
      console.error('Pause failed:', error);
      // Rollback optimistic update
      setPausedDeliveries(prev => prev.filter(p =>
        !(p.customer_id === delivery.customer_id && p.product_id === product.product_id)
      ));
      setDeliveries(prev => [...prev, delivery]);
      setUndoStack(prev => prev.slice(0, -1));
      toast.error('Failed to pause delivery');
    }
  }, [pushUndo, undo]);

  // Add product to delivery (instant UI update)
  const addProductToDelivery = useCallback(async (customerId, productId, productName, quantity, date) => {
    const token = getToken();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update - show added product immediately
    const newProduct = {
      id: tempId,
      customer_id: customerId,
      product_id: productId,
      product_name: productName,
      quantity: quantity,
      date: date,
      added_at: new Date().toISOString(),
      status: 'pending_delivery'
    };

    setAddedProducts(prev => [...prev, newProduct]);

    try {
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/add-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          product_id: productId,
          date: date,
          quantity: quantity
        })
      });

      if (!res.ok) {
        throw new Error('Failed to add product');
      }

      const data = await res.json();

      // Update with real ID
      setAddedProducts(prev => prev.map(p =>
        p.id === tempId ? { ...p, id: data.delivery_id } : p
      ));

      // Push to undo stack
      pushUndo({
        type: 'add_product',
        delivery_id: data.delivery_id,
        customer_id: customerId,
        product_id: productId,
        quantity: quantity,
        date: date,
        timestamp: Date.now()
      });

      toast.success('Product added to delivery', {
        action: {
          label: 'Undo',
          onClick: () => undo()
        }
      });

    } catch (error) {
      console.error('Add product failed:', error);
      // Rollback
      setAddedProducts(prev => prev.filter(p => p.id !== tempId));
      toast.error('Failed to add product');
    }
  }, [pushUndo, undo]);

  // Change shift (instant UI update)
  const changeShift = useCallback(async (delivery, product, date, newShift, previousShift) => {
    const token = getToken();

    // Optimistic update
    setDeliveries(prev => prev.map(d => {
      if (d.customer_id === delivery.customer_id && d.serial === delivery.serial) {
        return { ...d, shift: newShift };
      }
      return d;
    }));

    // Push to undo stack
    pushUndo({
      type: 'shift_change',
      customer_id: delivery.customer_id,
      product_id: product.product_id,
      date: date,
      previousValue: previousShift,
      newValue: newShift,
      timestamp: Date.now()
    });

    try {
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/override-shift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: delivery.customer_id,
          product_id: product.product_id,
          date: date,
          shift: newShift
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update shift');
      }

      toast.success(`Shift changed to ${newShift}`, {
        action: {
          label: 'Undo',
          onClick: () => undo()
        }
      });

    } catch (error) {
      console.error('Shift change failed:', error);
      // Rollback
      setDeliveries(prev => prev.map(d => {
        if (d.customer_id === delivery.customer_id) {
          return { ...d, shift: previousShift };
        }
        return d;
      }));
      setUndoStack(prev => prev.slice(0, -1));
      toast.error('Failed to change shift');
    }
  }, [pushUndo, undo]);

  // Submit change for approval (staff workflow)
  const submitForApproval = useCallback(async (changeType, changeData, reason) => {
    const token = getToken();

    const approvalRequest = {
      id: `approval-${Date.now()}`,
      type: changeType,
      data: changeData,
      reason: reason,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      submitted_by: JSON.parse(localStorage.getItem('user') || '{}')
    };

    // Add to local pending list
    setPendingApprovals(prev => [...prev, approvalRequest]);

    try {
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/submit-approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          change_type: changeType,
          change_data: changeData,
          reason: reason
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit for approval');
      }

      const data = await res.json();

      // Update with real ID
      setPendingApprovals(prev => prev.map(a =>
        a.id === approvalRequest.id ? { ...a, id: data.approval_id } : a
      ));

      toast.success('Change submitted for approval');

    } catch (error) {
      console.error('Submit approval failed:', error);
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalRequest.id));
      toast.error('Failed to submit for approval');
    }
  }, []);

  // Load pending approvals
  const loadPendingApprovals = useCallback(async () => {
    const token = getToken();

    try {
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/pending-approvals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data);
      }
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    }
  }, []);

  // Approve/Reject a pending change (admin only)
  const handleApproval = useCallback(async (approvalId, approved, adminNotes = '') => {
    const token = getToken();

    try {
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/handle-approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_id: approvalId,
          approved: approved,
          admin_notes: adminNotes
        })
      });

      if (!res.ok) {
        throw new Error('Failed to handle approval');
      }

      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      toast.success(approved ? 'Change approved' : 'Change rejected');

    } catch (error) {
      console.error('Handle approval failed:', error);
      toast.error('Failed to process approval');
    }
  }, []);

  // Set deliveries from parent (for initial load)
  const setDeliveriesData = useCallback((data) => {
    setDeliveries(data);
  }, []);

  // Clear paused deliveries (for refresh)
  const clearPausedDeliveries = useCallback(() => {
    setPausedDeliveries([]);
  }, []);

  // Clear added products (for refresh)
  const clearAddedProducts = useCallback(() => {
    setAddedProducts([]);
  }, []);

  const value = {
    // Data
    deliveries,
    pausedDeliveries,
    addedProducts,
    pendingApprovals,
    undoStack,
    redoStack,
    loading,

    // Actions
    setDeliveriesData,
    pauseDelivery,
    addProductToDelivery,
    changeShift,
    undo,
    submitForApproval,
    loadPendingApprovals,
    handleApproval,
    clearPausedDeliveries,
    clearAddedProducts,

    // Helpers
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
}

export default DeliveryContext;
