import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { auth } from '../utils/api';
import { setAuth } from '../utils/auth';
import { toast } from 'sonner';
import { Package, Mail, Lock, Phone } from 'lucide-react';
import { initializeModules } from '../utils/modules';

export const Login = () => {
  console.log('✅ Login component rendered');
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Email/Password login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP login
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Login attempt:', { email, password: '***' });
      const response = await auth.login(email, password);
      console.log('✓ Login response received:', response.status, response.data);
      
      const loginData = response.data;
      const { access_token, user } = loginData;
      
      console.log('Extracted data:', { access_token: access_token?.substring(0, 20) + '...', user: user?.email });
      
      if (!access_token || !user) {
        throw new Error(`Invalid response: missing ${!access_token ? 'token' : 'user'}`);
      }
      
      setAuth(access_token, user);
      console.log('✓ Auth set in localStorage');
      
      // Initialize modules with user data
      initializeModules(user);
      console.log('✓ Modules initialized');
      
      toast.success('Login successful!');
      
      // Redirect based on role
      const roleRoutes = {
        customer: '/customer',
        delivery_boy: '/delivery',
        supplier: '/supplier',
        marketing_staff: '/marketing',
        admin: '/admin',
      };
      
      const redirectPath = roleRoutes[user.role] || '/';
      console.log('🚀 Navigating to:', redirectPath);
      navigate(redirectPath);
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(error.response?.data?.detail || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await auth.sendOTP(phone);
      toast.success(`OTP sent! Test OTP: ${response.data.otp}`);
      setOtpSent(true);
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await auth.verifyOTP(phone, otp);
      const { access_token, user } = response.data;
      
      setAuth(access_token, user);
      
      // Initialize modules with user data
      initializeModules(user);
      
      toast.success('Login successful!');
      navigate('/customer');
    } catch (error) {
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Package className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="login-title">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue to EarlyBird</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Choose your login method</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="otp">OTP</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="admin@earlybird.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="email-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="password-input"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="email-login-button">
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Test: admin@earlybird.com / admin123
                  </p>
                </form>
              </TabsContent>
              
              <TabsContent value="otp">
                {!otpSent ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="phone-input"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading} data-testid="send-otp-button">
                      {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Enter OTP</label>
                      <Input
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOTP(e.target.value)}
                        required
                        maxLength={6}
                        data-testid="otp-input"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading} data-testid="verify-otp-button">
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setOtpSent(false)}
                    >
                      Change Number
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Test OTP: 123456
                    </p>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <Button variant="link" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};
