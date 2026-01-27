import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import "@/App.css";
import { isAuthenticated, getUserRole } from './utils/auth';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AdminDashboardV2 } from './pages/AdminDashboardV2';
import { MarketingStaff } from './pages/MarketingStaff';
import { MarketingStaffV2 } from './pages/MarketingStaffV2';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import { CustomerManagement } from './pages/CustomerManagement';
import { CompleteDashboard } from './pages/CompleteDashboard';
import { MonthlyBilling } from './pages/MonthlyBilling';
import { DeliveryBoyDashboard } from './pages/DeliveryBoyDashboard';
import { DeliveryListGenerator } from './pages/DeliveryListGenerator';
import { CustomerHome } from './pages/CustomerHome';
import { SupportPortal } from './pages/SupportPortal';
import { SupplierPortal } from './pages/SupplierPortal';
import { StaffEarningsPage } from './pages/StaffEarningsPage';
import { AdminSettings } from './pages/AdminSettings';
import { TestPage } from './pages/TestPage';
import { SharedDeliveryList } from './pages/SharedDeliveryList';
import AdminInventoryPage from './components/AdminInventoryPage';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuth = isAuthenticated();
  const userRole = getUserRole();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/login" element={<Login />} />

          {/* Public Shared Delivery Link - No auth required */}
          <Route path="/shared-delivery/:linkId" element={<SharedDeliveryList />} />
          
          {/* Complete Dashboard - Both Admin and Marketing */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CompleteDashboard />
              </ProtectedRoute>
            }
          />

          {/* Marketing Dashboard */}
          <Route
            path="/marketing"
            element={
              <ProtectedRoute allowedRoles={['marketing_staff']}>
                <CompleteDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Monthly Billing */}
          <Route
            path="/monthly-billing"
            element={
              <ProtectedRoute allowedRoles={['admin', 'marketing_staff']}>
                <MonthlyBilling />
              </ProtectedRoute>
            }
          />

          {/* Admin Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Admin Inventory (Products & Suppliers) */}
          <Route
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminInventoryPage />
              </ProtectedRoute>
            }
          />

          {/* Delivery Boy Dashboard */}
          <Route
            path="/delivery"
            element={
              <ProtectedRoute allowedRoles={['delivery_boy']}>
                <DeliveryBoyDashboard />
              </ProtectedRoute>
            }
          />

          {/* Delivery List Generator */}
          <Route
            path="/delivery-list"
            element={
              <ProtectedRoute allowedRoles={['admin', 'marketing_staff']}>
                <DeliveryListGenerator />
              </ProtectedRoute>
            }
          />
          
          {/* Customer Portal */}
          <Route 
            path="/customer" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerHome />
              </ProtectedRoute>
            } 
          />
          
          {/* Support Portal */}
          <Route 
            path="/support" 
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'marketing_staff']}>
                <SupportPortal />
              </ProtectedRoute>
            } 
          />
          
          {/* Supplier Portal */}
          <Route 
            path="/supplier" 
            element={
              <ProtectedRoute allowedRoles={['supplier', 'admin']}>
                <SupplierPortal />
              </ProtectedRoute>
            } 
          />
          
          {/* Old Customer Management */}
          <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin', 'marketing_staff']}><CustomerManagement /></ProtectedRoute>} />
          
          {/* Old Unified Dashboard */}
          <Route path="/unified" element={<ProtectedRoute allowedRoles={['admin', 'marketing_staff']}><UnifiedDashboard /></ProtectedRoute>} />
          
          {/* V2 routes */}
          <Route path="/admin-v2" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardV2 /></ProtectedRoute>} />
          <Route path="/marketing-v2" element={<ProtectedRoute allowedRoles={['marketing_staff']}><MarketingStaffV2 /></ProtectedRoute>} />
          
          {/* Staff Earnings Page */}
          <Route path="/staff/earnings" element={<ProtectedRoute allowedRoles={['delivery_boy', 'admin']}><StaffEarningsPage /></ProtectedRoute>} />
          
          {/* Old routes */}
          <Route path="/admin-old" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardV2 /></ProtectedRoute>} />
          <Route path="/marketing-old" element={<ProtectedRoute allowedRoles={['marketing_staff']}><MarketingStaffV2 /></ProtectedRoute>} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
