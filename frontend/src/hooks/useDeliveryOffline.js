/**
 * Delivery-specific offline hook
 * Handles delivery data for delivery boys with role-based access
 */

import { useCallback, useEffect, useState } from 'react';
import useOfflineData from './useOfflineData';

export const useDeliveryOffline = () => {
  const { getDeliveries, getDelivery, updateDelivery, cacheData, syncData, isOnline, syncStats } = useOfflineData();
  const [deliveries, setDeliveries] = useState([]);
  const [currentDelivery, setCurrentDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'delivery_boy');

  // Load deliveries on mount
  useEffect(() => {
    loadDeliveries();
  }, []);

  /**
   * Load deliveries based on user role
   */
  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let allDeliveries = await getDeliveries();
      
      // Filter based on user role
      if (userRole === 'delivery_boy') {
        const userId = localStorage.getItem('userId');
        allDeliveries = allDeliveries.filter(d => d.delivery_boy_id === userId);
      } else if (userRole === 'supervisor') {
        const areaId = localStorage.getItem('userAreaId');
        allDeliveries = allDeliveries.filter(d => d.area_id === areaId);
      }
      // admin sees all deliveries

      setDeliveries(allDeliveries);
      console.log('[Delivery Offline] Loaded deliveries:', allDeliveries.length);
    } catch (err) {
      console.error('[Delivery Offline] Error loading deliveries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getDeliveries, userRole]);

  /**
   * Get a specific delivery with edit permissions
   */
  const getDeliveryWithPermissions = useCallback(async (deliveryId) => {
    try {
      const delivery = await getDelivery(deliveryId);
      
      if (!delivery) {
        return null;
      }

      // Check permissions
      let canEdit = false;
      if (userRole === 'admin') {
        canEdit = true;
      } else if (userRole === 'delivery_boy') {
        canEdit = delivery.delivery_boy_id === localStorage.getItem('userId');
      } else if (userRole === 'supervisor') {
        canEdit = delivery.area_id === localStorage.getItem('userAreaId');
      }

      return {
        ...delivery,
        canEdit,
        permissions: {
          canEditStatus: canEdit,
          canEditLocation: userRole === 'delivery_boy' && delivery.delivery_boy_id === localStorage.getItem('userId'),
          canAddPhoto: canEdit,
          canAddSignature: canEdit,
          canAddProof: canEdit,
          canAddRemark: canEdit,
        }
      };
    } catch (error) {
      console.error('[Delivery Offline] Error getting delivery:', error);
      return null;
    }
  }, [getDelivery, userRole]);

  /**
   * Update delivery with permissions check
   */
  const updateDeliveryStatus = useCallback(async (deliveryId, updates) => {
    try {
      const delivery = await getDeliveryWithPermissions(deliveryId);
      
      if (!delivery || !delivery.canEdit) {
        throw new Error('You do not have permission to update this delivery');
      }

      // Add metadata
      const fullUpdate = {
        ...updates,
        last_updated_by: localStorage.getItem('userId'),
        last_updated_by_role: userRole,
        offline_updated: !isOnline,
      };

      const result = await updateDelivery(deliveryId, fullUpdate);
      
      // Reload delivery
      const updated = await getDeliveryWithPermissions(deliveryId);
      setCurrentDelivery(updated);
      
      // Reload all deliveries
      loadDeliveries();

      return result;
    } catch (error) {
      console.error('[Delivery Offline] Error updating delivery:', error);
      throw error;
    }
  }, [getDeliveryWithPermissions, updateDelivery, isOnline, userRole, loadDeliveries]);

  /**
   * Update delivery location (GPS)
   */
  const updateLocation = useCallback(async (deliveryId, latitude, longitude, accuracy) => {
    return updateDeliveryStatus(deliveryId, {
      current_latitude: latitude,
      current_longitude: longitude,
      current_accuracy: accuracy,
      location_updated_at: new Date().toISOString(),
    });
  }, [updateDeliveryStatus]);

  /**
   * Mark delivery as completed
   */
  const completeDelivery = useCallback(async (deliveryId, proofOfDelivery) => {
    return updateDeliveryStatus(deliveryId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      proof_of_delivery: proofOfDelivery,
    });
  }, [updateDeliveryStatus]);

  /**
   * Add remark to delivery
   */
  const addRemark = useCallback(async (deliveryId, remark) => {
    const delivery = await getDelivery(deliveryId);
    const remarks = delivery?.remarks || [];
    remarks.push({
      text: remark,
      added_by: localStorage.getItem('userId'),
      timestamp: new Date().toISOString(),
    });

    return updateDeliveryStatus(deliveryId, { remarks });
  }, [updateDeliveryStatus, getDelivery]);

  /**
   * Sync all deliveries with backend
   */
  const syncDeliveries = useCallback(async () => {
    const result = await syncData();
    if (result.synced > 0) {
      // Refresh deliveries after sync
      loadDeliveries();
    }
    return result;
  }, [syncData, loadDeliveries]);

  return {
    // Data
    deliveries,
    currentDelivery,
    setCurrentDelivery,
    
    // State
    loading,
    error,
    isOnline,
    syncStats,
    userRole,

    // Methods
    loadDeliveries,
    getDeliveryWithPermissions,
    updateDeliveryStatus,
    updateLocation,
    completeDelivery,
    addRemark,
    syncDeliveries,
  };
};

export default useDeliveryOffline;
