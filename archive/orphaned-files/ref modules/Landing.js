import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Package, Truck, Users, ShoppingBag, BarChart3 } from 'lucide-react';

export const Landing = () => {
  const navigate = useNavigate();

  const roles = [
    {
      name: 'Customer',
      icon: ShoppingBag,
      description: 'Order milk, groceries, and manage subscriptions',
      path: '/customer',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      name: 'Delivery Boy',
      icon: Truck,
      description: 'View routes and manage daily deliveries',
      path: '/delivery',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      name: 'Supplier',
      icon: Package,
      description: 'Manage procurement orders and inventory',
      path: '/supplier',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      name: 'Marketing Staff',
      icon: Users,
      description: 'Track leads, conversions, and commissions',
      path: '/marketing',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
    {
      name: 'Admin',
      icon: BarChart3,
      description: 'Complete system management and analytics',
      path: '/admin',
      color: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50" data-testid="landing-page">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Package className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4" data-testid="landing-title">
            <span className="gradient-text">EarlyBird</span> Delivery Services
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Complete delivery platform for milk, groceries, and daily essentials
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.name}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${role.color}`}
                onClick={() => navigate('/login', { state: { role: role.name.toLowerCase().replace(' ', '_') } })}
                data-testid={`role-card-${role.name.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="h-12 w-12 mb-4 text-gray-700" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{role.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{role.description}</p>
                <Button variant="outline" className="w-full" data-testid={`login-${role.name.toLowerCase().replace(' ', '-')}`}>
                  Login as {role.name}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mt-12">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Smart Subscriptions</h3>
              <p className="text-sm text-gray-600">
                Complex patterns, overrides, pauses, and calendar view
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">AI Recommendations</h3>
              <p className="text-sm text-gray-600">
                Personalized grocery and meal suggestions
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Route Optimization</h3>
              <p className="text-sm text-gray-600">
                Automated delivery routing with mock maps
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Procurement Engine</h3>
              <p className="text-sm text-gray-600">
                Auto-detect shortfall and generate orders
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Multi-Role System</h3>
              <p className="text-sm text-gray-600">
                Customer, delivery, supplier, marketing, and admin
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Mock Services</h3>
              <p className="text-sm text-gray-600">
                Works without any real API keys
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Test Accounts: admin@earlybird.com / admin123 | Customer OTP: 123456
          </p>
        </div>
      </div>
    </div>
  );
};
