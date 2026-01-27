import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { products, subscriptions, orders, customers } from '../utils/api';
import { toast } from 'sonner';
import { Package, Calendar, ShoppingCart, Sparkles, User, MapPin, Mic, Image } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { VoiceOrderModal } from '../components/VoiceOrderModal';
import { ImageUploadModal } from '../components/ImageUploadModal';
import { useVoiceOrder, useImageOCR } from '../utils/modules';

export const CustomerHome = () => {
  const navigate = useNavigate();
  const [productList, setProductList] = useState([]);
  const [subsList, setSubsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Module hooks for advanced features
  const { processVoiceOrder } = useVoiceOrder();
  const { scanReceipt } = useImageOCR();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, subsRes, ordersRes] = await Promise.all([
        products.getAll(),
        subscriptions.getAll(),
        orders.getAll(),
      ]);
      setProductList(productsRes.data);
      setSubsList(subsRes.data);
      setOrdersList(ordersRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: Package, label: 'Browse Products', path: '/customer/products', color: 'bg-green-50 text-green-600' },
    { icon: Calendar, label: 'My Subscriptions', path: '/customer/subscriptions', color: 'bg-blue-50 text-blue-600' },
    { icon: ShoppingCart, label: 'My Orders', path: '/customer/orders', color: 'bg-purple-50 text-purple-600' },
    { icon: Sparkles, label: 'AI Recommendations', path: '/customer/ai', color: 'bg-orange-50 text-orange-600' },
    { icon: Mic, label: 'Voice Order', action: 'voice', color: 'bg-cyan-50 text-cyan-600' },
    { icon: Image, label: 'Scan Receipt', action: 'image', color: 'bg-teal-50 text-teal-600' },
    { icon: User, label: 'Family Profile', path: '/customer/profile', color: 'bg-pink-50 text-pink-600' },
    { icon: MapPin, label: 'Addresses', path: '/customer/addresses', color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="customer-home">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="customer-hero rounded-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to EarlyBird</h1>
          <p className="text-gray-600">Your daily essentials, delivered fresh</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const handleClick = () => {
              if (action.action === 'voice') {
                setShowVoiceModal(true);
              } else if (action.action === 'image') {
                setShowImageModal(true);
              } else {
                navigate(action.path);
              }
            };
            return (
              <Card
                key={action.label}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={handleClick}
                data-testid={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className={`${action.color} p-3 rounded-full mb-2`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {subsList.filter(s => s.is_active).length}
              </div>
              <p className="text-sm text-gray-600 mt-2">Subscriptions running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {ordersList.length}
              </div>
              <p className="text-sm text-gray-600 mt-2">Orders placed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {productList.length}
              </div>
              <p className="text-sm text-gray-600 mt-2">Items to choose from</p>
            </CardContent>
          </Card>
        </div>

        {ordersList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordersList.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/customer/orders/${order.id}`)}
                    data-testid={`recent-order-${order.id}`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.items.length} items
                      </p>
                      <p className="text-sm text-gray-600">
                        Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{order.total_amount}</p>
                      <span className={`text-xs px-2 py-1 rounded badge ${
                        order.status === 'delivered' ? 'badge-success' :
                        order.status === 'pending' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/customer/orders')}
                data-testid="view-all-orders-button"
              >
                View All Orders
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Voice Order Modal */}
      <VoiceOrderModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onOrderCreate={(orderData) => {
          console.log('Voice order created:', orderData);
          toast.success('Order created from voice');
        }}
      />

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onExtractItems={(items) => {
          console.log('Items extracted from receipt:', items);
          toast.success(`${items.length} items added to order`);
        }}
      />
    </div>
  );
};
