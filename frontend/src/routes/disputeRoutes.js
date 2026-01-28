/**
 * disputeRoutes.js - Route configuration for dispute module
 * 
 * Usage in your App.js or Router component:
 * 
 * import { disputeRoutes } from './routes/disputeRoutes';
 * 
 * // Add to your routes array:
 * <Route path="/disputes/create" element={<DisputeForm />} />
 * <Route path="/disputes/:id" element={<DisputeDetails />} />
 * <Route path="/disputes/list" element={<DisputeList />} />
 * <Route path="/disputes/admin" element={<AdminDashboard />} />
 */

import { lazy } from 'react';

// Lazy load components for better performance
const DisputeForm = lazy(() => import('../components/DisputeForm'));
const DisputeDetails = lazy(() => import('../components/DisputeDetails'));
const DisputeList = lazy(() => import('../components/DisputeList'));
const AdminDashboard = lazy(() => import('../components/AdminDashboard'));

export const disputeRoutes = [
  {
    path: '/disputes/create',
    element: <DisputeForm />,
    label: 'File Dispute',
    description: 'Create a new dispute for your order',
    requiresAuth: true
  },
  {
    path: '/disputes/:id',
    element: <DisputeDetails />,
    label: 'Dispute Details',
    description: 'View dispute details and messages',
    requiresAuth: true
  },
  {
    path: '/disputes/list',
    element: <DisputeList />,
    label: 'My Disputes',
    description: 'View your disputes',
    requiresAuth: true
  },
  {
    path: '/disputes/admin',
    element: <AdminDashboard />,
    label: 'Admin Dashboard',
    description: 'Manage all disputes',
    requiresAuth: true,
    requiresAdmin: true
  }
];

export default disputeRoutes;
