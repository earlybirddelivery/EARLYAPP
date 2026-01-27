/**
 * EarlyBird Modules - Master Index
 * Central entry point for all module imports
 * 
 * Folder Structure:
 * src/modules/
 * ├── core/              - Authentication & Authorization
 * ├── features/          - Customer-facing features
 * ├── business/          - Business logic & analytics
 * └── ui/                - UI components & utilities
 */

// ============================================
// CORE MODULES - Access Control & Sharing
// ============================================

const modules = {
  core: {
    // Role-based access control and filtering
    accessControl: () => import('./core/access-control.js'),
    
    // Multi-user shared access with audit trail
    sharedAccess: () => import('./core/shared-access.js'),
  },

  // ============================================
  // FEATURE MODULES - Customer Features
  // ============================================
  
  features: {
    // Voice order entry system (multi-language)
    voice: () => import('./features/voice.js'),
    
    // Image recognition & bill upload
    imageOcr: () => import('./features/image-ocr.js'),
    
    // Analytics & reporting dashboards
    analytics: () => import('./features/analytics.js'),
    
    // Supplier management & ordering
    supplier: () => import('./features/supplier.js'),
    
    // Smart features - AI recommendations, personalization
    smartFeatures: () => import('./features/smart-features.js'),
  },

  // ============================================
  // BUSINESS LOGIC MODULES
  // ============================================
  
  business: {
    // AI demand forecasting & auto-ordering
    demandForecast: () => import('./business/demand-forecast.js'),
    
    // Churn detection & retention alerts
    pauseDetection: () => import('./business/pause-detection.js'),
    
    // Staff wallet & commission tracking
    staffWallet: () => import('./business/staff-wallet.js'),
  },

  // ============================================
  // UI MODULES - Components & Utilities
  // ============================================
  
  ui: {
    // Kirana UI components & styles
    kiranUI: () => import('./ui/kirana-ui.js'),
  }
};

/**
 * QUICK START: Using Modules
 * 
 * In your React components or vanilla JS:
 * 
 * // Access control
 * EarlyBirdAccessControl.setCurrentUser({ id: '123', role: 'admin' });
 * EarlyBirdAccessControl.hasPermission('canViewAllOrders');
 * 
 * // Voice orders
 * EarlyBirdVoice.startRecording('hi-IN');
 * 
 * // Demand forecasting
 * EarlyBirdDemandForecast.aggregateDemand(orders, 7);
 * 
 * // Churn detection
 * EarlyBirdPauseDetection.checkPauseAlerts(customerId);
 * 
 * // Staff commissions
 * EarlyBirdStaffWallet.getStaffEarnings(staffId);
 * 
 * // Shared access
 * const access = new EarlyBirdSharedAccess();
 * access.createInvitation(customerId, 'support', inviterInfo);
 */

export default modules;
