// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { StorageService } from '../services/capacitorService';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  signup: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await StorageService.getItem('auth_token');
        const storedUser = await StorageService.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          await apiClient.setToken(storedToken);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    try {
      setIsLoading(true);
      const { token: newToken, user: newUser } = await apiClient.login(phone, password);
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, phone: string, password: string) => {
    try {
      setIsLoading(true);
      const { token: newToken, user: newUser } = await apiClient.signup(
        name,
        phone,
        password,
        'customer'
      );
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: any) => {
    try {
      const updatedUser = await apiClient.updateProfile(data);
      setUser(updatedUser);
      await StorageService.setItem('user', updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
