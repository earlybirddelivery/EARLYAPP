// @ts-nocheck
import axios, { AxiosInstance, AxiosError } from 'axios';
import { StorageService } from './capacitorService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, clear and redirect to login
          await StorageService.clear();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async setToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async clearToken() {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Auth Endpoints
  async login(phone: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', { phone, password });
      const { token, user } = response.data.data;
      await this.setToken(token);
      await StorageService.setItem('auth_token', token);
      await StorageService.setItem('user', user);
      return { token, user };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signup(name: string, phone: string, password: string, role: string = 'customer') {
    try {
      const response = await this.client.post('/auth/signup', {
        name,
        phone,
        password,
        role,
      });
      const { token, user } = response.data.data;
      await this.setToken(token);
      await StorageService.setItem('auth_token', token);
      await StorageService.setItem('user', user);
      return { token, user };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
      await this.clearToken();
      await StorageService.clear();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Products Endpoints
  async getProducts(page: number = 1, limit: number = 20, category?: string) {
    try {
      const params: any = { page, limit };
      if (category) params.category = category;
      const response = await this.client.get('/products', { params });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProduct(id: string) {
    try {
      const response = await this.client.get(`/products/${id}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchProducts(query: string) {
    try {
      const response = await this.client.get('/products/search', {
        params: { q: query },
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Orders Endpoints
  async createOrder(items: any[], deliveryAddress: string, paymentMethod: string) {
    try {
      const response = await this.client.post('/orders', {
        items,
        deliveryAddress,
        paymentMethod,
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOrders(status?: string) {
    try {
      const params: any = {};
      if (status) params.status = status;
      const response = await this.client.get('/orders', { params });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOrder(id: string) {
    try {
      const response = await this.client.get(`/orders/${id}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelOrder(id: string, reason: string) {
    try {
      const response = await this.client.post(`/orders/${id}/cancel`, { reason });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Cart Endpoints
  async addToCart(productId: string, quantity: number) {
    try {
      const response = await this.client.post('/cart', { productId, quantity });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCart() {
    try {
      const response = await this.client.get('/cart');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCart(productId: string, quantity: number) {
    try {
      const response = await this.client.put(`/cart/${productId}`, { quantity });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromCart(productId: string) {
    try {
      const response = await this.client.delete(`/cart/${productId}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async clearCart() {
    try {
      const response = await this.client.post('/cart/clear');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Profile Endpoints
  async getProfile() {
    try {
      const response = await this.client.get('/users/profile');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(data: any) {
    try {
      const response = await this.client.put('/users/profile', data);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadProfilePhoto(base64Image: string) {
    try {
      const response = await this.client.post('/users/profile/photo', {
        image: base64Image,
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Addresses Endpoints
  async getAddresses() {
    try {
      const response = await this.client.get('/users/addresses');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addAddress(address: any) {
    try {
      const response = await this.client.post('/users/addresses', address);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateAddress(id: string, address: any) {
    try {
      const response = await this.client.put(`/users/addresses/${id}`, address);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteAddress(id: string) {
    try {
      const response = await this.client.delete(`/users/addresses/${id}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Gamification Endpoints
  async getGamificationData() {
    try {
      const response = await this.client.get('/gamification/dashboard/overview');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLeaderboard(type: string = 'global') {
    try {
      const response = await this.client.get(`/gamification/leaderboard/${type}`, {
        params: { limit: 50 },
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error Handling
  private handleError(error: any) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const code = error.response?.status || error.code;
      return { message, code, error };
    }
    return error;
  }
}

export const apiClient = new APIClient();
export default apiClient;
