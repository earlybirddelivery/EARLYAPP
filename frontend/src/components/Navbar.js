import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { clearAuth, getUser } from '../utils/auth';
import { Package, LogOut, User } from 'lucide-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  if (!user) return null;

  const getRoleHome = () => {
    switch (user.role) {
      case 'customer': return '/customer';
      case 'delivery_boy': return '/delivery';
      case 'supplier': return '/supplier';
      case 'marketing_staff': return '/marketing';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to={getRoleHome()} className="flex items-center space-x-2" data-testid="nav-home-link">
            <Package className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-gray-900">EarlyBird</span>
          </Link>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2" data-testid="user-info">
              <User className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-700">{user.name}</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
