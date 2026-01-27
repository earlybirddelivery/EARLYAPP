import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

console.log('🔧 API Configuration:', { BACKEND_URL, API_BASE });

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 400,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  sendOTP: (phone) => api.post('/auth/otp/send', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/otp/verify', { phone, otp }),
  getMe: () => api.get('/auth/me'),
};

export const products = {
  getAll: () => api.get('/products/'),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const customers = {
  getAddresses: () => api.get('/customers/addresses'),
  createAddress: (data) => api.post('/customers/addresses', data),
  updateAddress: (id, data) => api.put(`/customers/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/customers/addresses/${id}`),
  getFamilyProfile: () => api.get('/customers/family-profile'),
  createFamilyProfile: (data) => api.post('/customers/family-profile', data),
  getAIRecommendations: (type) => api.post('/customers/ai/recommendations', { recommendation_type: type }),
};

export const subscriptions = {
  getAll: () => api.get('/subscriptions'),
  getOne: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  addOverride: (id, data) => api.post(`/subscriptions/${id}/override`, data),
  addPause: (id, data) => api.post(`/subscriptions/${id}/pause`, data),
  getCalendar: (id, days = 30) => api.get(`/subscriptions/${id}/calendar?days=${days}`),
};

export const orders = {
  getAll: () => api.get('/orders'),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  getHistory: (limit = 50) => api.get(`/orders/history?limit=${limit}`),
};

export const delivery = {
  generateRoutes: (date) => api.post('/delivery/routes/generate', null, { params: { target_date: date } }),
  getTodayRoute: () => api.get('/delivery/routes/today'),
  getRoute: (id) => api.get(`/delivery/routes/${id}`),
  reorderStops: (id, stopOrder) => api.put(`/delivery/routes/${id}/reorder`, { stop_order: stopOrder }),
  updateDelivery: (data) => api.post('/delivery/delivery/update', data),
  getTodaySummary: () => api.get('/delivery/delivery/today-summary'),
};

export const admin = {
  getUsers: (role) => api.get('/admin/users', { params: { role } }),
  createUser: (data) => api.post('/admin/users/create', data),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getDeliveryBoyStats: () => api.get('/admin/dashboard/delivery-boys'),
  getProcurementRequirements: (date) => api.get(`/admin/procurement/requirements/${date}`),
  getShortfall: (date) => api.get(`/admin/procurement/shortfall/${date}`),
  autoGenerateProcurementOrder: (date, supplierId) => 
    api.post('/admin/procurement/auto-order', null, { params: { target_date: date, supplier_id: supplierId } }),
  getProcurementOrders: () => api.get('/admin/procurement/orders'),
  getOrdersReport: (startDate, endDate) => 
    api.get('/admin/reports/orders', { params: { start_date: startDate, end_date: endDate } }),
};

export const suppliers = {
  getAll: () => api.get('/suppliers'),
  create: (data) => api.post('/suppliers', data),
  getMyOrders: () => api.get('/suppliers/my-orders'),
  updateOrderStatus: (id, status) => api.put(`/suppliers/orders/${id}/status`, null, { params: { status } }),
};

export const marketing = {
  createLead: (data) => api.post('/marketing/leads', data),
  getMyLeads: () => api.get('/marketing/leads'),
  updateLeadStatus: (id, status, notes) => 
    api.put(`/marketing/leads/${id}`, null, { params: { status, notes } }),
  convertLead: (id, customerId) => api.post(`/marketing/leads/${id}/convert`, null, { params: { customer_id: customerId } }),
  getMyCommissions: () => api.get('/marketing/commissions'),
  getDashboard: () => api.get('/marketing/dashboard'),
};

export { api };
export default api;
