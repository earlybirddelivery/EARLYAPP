/**
 * EarlyBird Module Integration Layer
 * Bridges vanilla JS modules with React app
 * Provides hooks and utilities for using modules in React components
 */

// ============================================
// CORE MODULES - Access Control
// ============================================

import AccessControl from '../modules/core/access-control.js';
import SharedAccess from '../modules/core/shared-access.js';

// ============================================
// FEATURE MODULES
// ============================================

import Voice from '../modules/features/voice.js';
import ImageOCR from '../modules/features/image-ocr.js';
import Analytics from '../modules/features/analytics.js';
import Supplier from '../modules/features/supplier.js';
import SmartFeatures from '../modules/features/smart-features.js';

// ============================================
// BUSINESS MODULES
// ============================================

import DemandForecast from '../modules/business/demand-forecast.js';
import PauseDetection from '../modules/business/pause-detection.js';
import StaffWallet from '../modules/business/staff-wallet.js';

// ============================================
// MODULE INITIALIZATION
// ============================================

export const initializeModules = (user) => {
  console.log('🚀 Initializing EarlyBird modules...');
  
  try {
    // 1. Initialize core modules
    if (AccessControl && AccessControl.setCurrentUser) {
      AccessControl.setCurrentUser({
        id: user?.id || 'unknown',
        name: user?.name || 'User',
        role: user?.role || 'customer',
        assignedCustomers: user?.assignedCustomers || [],
        assignedOrders: user?.assignedOrders || []
      });
      console.log('✅ Access Control initialized');
    }
    
    // 2. Initialize shared access
    if (SharedAccess) {
      const sharedAccess = new SharedAccess();
      console.log('✅ Shared Access initialized');
    }
    
    // 3. Initialize feature modules
    if (Voice && Voice.init) {
      Voice.init();
      console.log('✅ Voice module initialized');
    }
    
    if (ImageOCR && ImageOCR.init) {
      ImageOCR.init();
      console.log('✅ Image OCR initialized');
    }
    
    // 4. Initialize business modules
    if (DemandForecast && DemandForecast.init) {
      DemandForecast.init();
      console.log('✅ Demand Forecast initialized');
    }
    
    if (PauseDetection && PauseDetection.init) {
      PauseDetection.init();
      console.log('✅ Pause Detection initialized');
    }
    
    if (StaffWallet && StaffWallet.init) {
      StaffWallet.init();
      console.log('✅ Staff Wallet initialized');
    }
    
    console.log('✅ All modules initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing modules:', error);
    return false;
  }
};

// ============================================
// REACT HOOKS FOR MODULES
// ============================================

import { useEffect, useState } from 'react';

/**
 * Hook: Use Access Control
 * Provides user permissions and role-based filtering
 */
export const useAccessControl = () => {
  const [permissions, setPermissions] = useState(null);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (AccessControl) {
      const currentUser = AccessControl.getCurrentUser();
      setUser(currentUser);
      
      const userPermissions = {
        canViewAllOrders: AccessControl.hasPermission('canViewAllOrders'),
        canViewAllCustomers: AccessControl.hasPermission('canViewAllCustomers'),
        canEditOrders: AccessControl.hasPermission('canEditOrders'),
        canEditCustomers: AccessControl.hasPermission('canEditCustomers'),
        canManageStaff: AccessControl.hasPermission('canManageStaff'),
        canViewAnalytics: AccessControl.hasPermission('canViewAnalytics'),
        canViewSuppliers: AccessControl.hasPermission('canViewSuppliers'),
        canApprovePayments: AccessControl.hasPermission('canApprovePayments')
      };
      
      setPermissions(userPermissions);
    }
  }, []);
  
  return {
    user,
    permissions,
    hasPermission: (permission) => AccessControl?.hasPermission(permission),
    getVisibleCustomers: () => AccessControl?.getVisibleCustomers(),
    getVisibleOrders: () => AccessControl?.getVisibleOrders(),
    filterCalendarEvents: (events) => AccessControl?.filterCalendarEvents(events)
  };
};

/**
 * Hook: Use Demand Forecast
 * Get demand predictions and inventory alerts
 */
export const useDemandForecast = () => {
  const [forecast, setForecast] = useState(null);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const loadForecast = async (orders, daysAhead = 7) => {
    setLoading(true);
    try {
      if (DemandForecast) {
        const aggregated = DemandForecast.aggregateDemand(orders, daysAhead);
        setForecast(aggregated);
        
        const shortageAlerts = DemandForecast.checkStockShortage();
        setShortages(shortageAlerts);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return {
    forecast,
    shortages,
    loading,
    loadForecast,
    generateAutoOrder: (supplierId) => DemandForecast?.generateAutoOrder(supplierId),
    getSuppliersNeedingReorder: () => DemandForecast?.getSuppliersNeedingReorder()
  };
};

/**
 * Hook: Use Pause Detection
 * Monitor customer subscription pauses and churn risk
 */
export const usePauseDetection = () => {
  const [churnRisks, setChurnRisks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    if (PauseDetection) {
      const risks = PauseDetection.getChurnRiskCustomers();
      setChurnRisks(risks);
      
      const systemAlerts = PauseDetection.state?.pauseAlerts || [];
      setAlerts(systemAlerts);
    }
  }, []);
  
  return {
    churnRisks,
    alerts,
    recordPause: (customerId, reason) => PauseDetection?.recordPause(customerId, undefined, reason),
    recordResume: (customerId) => PauseDetection?.recordResume(customerId),
    generateReactivationOffer: (customerId) => PauseDetection?.generateReactivationOffer(customerId)
  };
};

/**
 * Hook: Use Staff Wallet
 * Get staff earnings, commissions, and performance
 */
export const useStaffWallet = () => {
  const [staffWallet, setStaffWallet] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const getStaffEarnings = (staffId) => {
    if (StaffWallet) {
      return StaffWallet.getStaffEarnings(staffId);
    }
    return null;
  };
  
  useEffect(() => {
    if (StaffWallet) {
      const lb = StaffWallet.getLeaderboard();
      setLeaderboard(lb);
    }
  }, []);
  
  return {
    staffWallet,
    leaderboard,
    getStaffEarnings,
    addCommission: (staffId, amount, reason) => StaffWallet?.addCommission(staffId, amount, reason),
    recordWithdrawal: (staffId, amount) => StaffWallet?.recordWithdrawal(staffId, amount),
    getMonthlyEarnings: (staffId) => StaffWallet?.getMonthlyEarnings(staffId)
  };
};

/**
 * Hook: Use Voice Orders
 * Integrate voice ordering into app
 */
export const useVoiceOrder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceOrders, setVoiceOrders] = useState([]);
  
  useEffect(() => {
    if (Voice && Voice.state) {
      setVoiceOrders(Voice.state.voiceOrders || []);
    }
  }, []);
  
  return {
    isRecording,
    voiceOrders,
    startRecording: (language = 'hi-IN') => {
      if (Voice) {
        Voice.startRecording(language);
        setIsRecording(true);
      }
    },
    stopRecording: () => {
      if (Voice) {
        Voice.stopRecording();
        setIsRecording(false);
      }
    },
    processVoiceOrder: (text) => Voice?.processVoiceOrder(text),
    confirmVoiceOrder: (voiceOrderId) => Voice?.confirmVoiceOrder(voiceOrderId),
    discardVoiceOrder: (voiceOrderId) => Voice?.discardVoiceOrder(voiceOrderId)
  };
};

/**
 * Hook: Use Image OCR
 * Image processing and OCR integration
 */
export const useImageOCR = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);

  const processImage = async (imageData) => {
    if (ImageOCR) {
      setIsProcessing(true);
      try {
        const result = await ImageOCR.processImage(imageData);
        setOcrResults(prev => [...prev, result]);
        return result;
      } finally {
        setIsProcessing(false);
      }
    }
    return null;
  };

  return {
    isProcessing,
    ocrResults,
    processImage,
    extractData: (text) => ImageOCR?.extractData(text)
  };
};

/**
 * Hook: Use Shared Access
 * Multi-user account access with audit trail
 */
export const useSharedAccess = () => {
  const [sharedAccounts, setSharedAccounts] = useState({});
  
  const createInvitation = (customerId, role, inviterInfo) => {
    if (SharedAccess) {
      const sharedAccess = new SharedAccess();
      return sharedAccess.createInvitation(customerId, role, inviterInfo);
    }
  };
  
  const getAuditLog = (customerId) => {
    if (SharedAccess) {
      const sharedAccess = new SharedAccess();
      return sharedAccess.getAuditLog(customerId);
    }
  };
  
  return {
    sharedAccounts,
    createInvitation,
    getAuditLog,
    logAction: (customerId, role, action, details) => {
      if (SharedAccess) {
        const sharedAccess = new SharedAccess();
        return sharedAccess.logAction(customerId, role, action, details);
      }
    }
  };
};

// ============================================
// MODULE UTILITIES
// ============================================

/**
 * Get all visible customers for current user based on role
 */
export const getVisibleCustomers = () => {
  if (AccessControl) {
    return AccessControl.getVisibleCustomers();
  }
  return [];
};

/**
 * Get all visible orders for current user based on role
 */
export const getVisibleOrders = () => {
  if (AccessControl) {
    return AccessControl.getVisibleOrders();
  }
  return [];
};

/**
 * Check if user has specific permission
 */
export const checkPermission = (permission) => {
  if (AccessControl) {
    return AccessControl.hasPermission(permission);
  }
  return false;
};

/**
 * Get current user info
 */
export const getCurrentUser = () => {
  if (AccessControl) {
    return AccessControl.getCurrentUser();
  }
  return null;
};

/**
 * Update UI based on user role
 */
export const updateUIForRole = () => {
  if (AccessControl) {
    return AccessControl.updateUIForRole();
  }
};

/**
 * Get churn risk customers
 */
export const getChurnRiskCustomers = () => {
  if (PauseDetection) {
    return PauseDetection.getChurnRiskCustomers();
  }
  return [];
};

/**
 * Get demand forecast for supplier
 */
export const getSupplierForecast = (supplierId, daysAhead = 7) => {
  if (DemandForecast) {
    return DemandForecast.getSupplierForecast(supplierId, daysAhead);
  }
  return null;
};

/**
 * Get staff leaderboard
 */
export const getLeaderboard = (role = null) => {
  if (StaffWallet) {
    return StaffWallet.getLeaderboard(role);
  }
  return [];
};

// ============================================
// EXPORT ALL MODULES
// ============================================

export {
  AccessControl,
  SharedAccess,
  Voice,
  ImageOCR,
  Analytics,
  Supplier,
  SmartFeatures,
  DemandForecast,
  PauseDetection,
  StaffWallet
};

export default {
  initializeModules,
  useAccessControl,
  useDemandForecast,
  usePauseDetection,
  useStaffWallet,
  useVoiceOrder,
  useSharedAccess,
  getVisibleCustomers,
  getVisibleOrders,
  checkPermission,
  getCurrentUser,
  updateUIForRole,
  getChurnRiskCustomers,
  getSupplierForecast,
  getLeaderboard
};
