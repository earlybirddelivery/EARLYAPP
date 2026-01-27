import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LogOut, TrendingUp, Wallet, Trophy, Zap, Download, Calendar } from 'lucide-react';
import { logout } from '../utils/auth';
import { useStaffWallet } from '../utils/modules';
import { toast } from 'sonner';

export function StaffEarningsPage() {
  const navigate = useNavigate();
  const { earnings, commissions, leaderboard } = useStaffWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  const [staffData] = useState({
    name: 'John Delivery',
    role: 'delivery_boy',
    joinDate: '2024-01-15',
    totalDeliveries: 245,
  });

  const [earningsData] = useState({
    balance: 12500,
    todayEarnings: 450,
    weekEarnings: 2100,
    monthEarnings: 8900,
  });

  const [commissionBreakdown] = useState([
    { category: 'Per Delivery', amount: 7500, icon: '🚚', color: 'bg-blue-50' },
    { category: 'Performance Bonus', amount: 3000, icon: '⭐', color: 'bg-yellow-50' },
    { category: 'On-Time Bonus', amount: 1200, icon: '⏱️', color: 'bg-green-50' },
    { category: 'Referral Bonus', amount: 800, icon: '👥', color: 'bg-purple-50' },
  ]);

  const [topPerformers] = useState([
    { rank: 1, name: 'Rajesh Kumar', earnings: 45000, deliveries: 380, badge: '🥇' },
    { rank: 2, name: 'Priya Sharma', earnings: 42000, deliveries: 350, badge: '🥈' },
    { rank: 3, name: 'Amit Singh', earnings: 38500, deliveries: 320, badge: '🥉' },
    { rank: 4, name: 'Maya Patel', earnings: 35200, deliveries: 295, badge: '' },
    { rank: 5, name: 'John Delivery', earnings: 12500, deliveries: 245, badge: '👤' },
  ]);

  const [monthlyData] = useState([
    { month: 'January', earnings: 5200, deliveries: 87 },
    { month: 'February', earnings: 6100, deliveries: 102 },
    { month: 'March', earnings: 8900, deliveries: 148 },
    { month: 'Current (March 24)', earnings: 8900, deliveries: 245 },
  ]);

  const handleWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > earningsData.balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (amount < 100) {
      toast.error('Minimum withdrawal is ₹100');
      return;
    }

    // Process withdrawal
    toast.success(`Withdrawal request of ₹${amount} submitted. It will be processed within 2-3 business days.`);
    setWithdrawalAmount('');
    setShowWithdrawalForm(false);
  };

  const handleDownloadStatement = () => {
    toast.success('Earnings statement downloaded');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Earnings</h1>
                <p className="text-sm text-gray-500">{staffData.name} • {staffData.role.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>
            <Button onClick={() => { logout(); navigate('/login'); }} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Current Balance */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ₹{earningsData.balance.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-green-700 mt-2">Available for withdrawal</p>
            </CardContent>
          </Card>

          {/* Today's Earnings */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                ₹{earningsData.todayEarnings}
              </div>
              <p className="text-xs text-blue-700 mt-2">From deliveries & bonuses</p>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                ₹{earningsData.weekEarnings.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-purple-700 mt-2">7-day total</p>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ₹{earningsData.monthEarnings.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-orange-700 mt-2">30-day total</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Withdrawal Section */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Withdraw Earnings
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Request a withdrawal from your current balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showWithdrawalForm ? (
                  <Button
                    onClick={() => setShowWithdrawalForm(true)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Wallet className="h-4 w-4" />
                    Request Withdrawal
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Withdrawal Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Enter amount (min ₹100)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Available: ₹{earningsData.balance.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="bg-blue-100 border border-blue-300 rounded-md p-3 text-sm text-blue-900">
                      ℹ️ Withdrawals are processed within 2-3 business days to your registered bank account.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleWithdrawal}
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      >
                        Confirm Withdrawal
                      </Button>
                      <Button
                        onClick={() => {
                          setShowWithdrawalForm(false);
                          setWithdrawalAmount('');
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Earnings Trend
                </CardTitle>
                <CardDescription>Your earnings over the last few months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyData.map((item, idx) => (
                    <div key={idx} className="flex items-end justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.month}</p>
                        <p className="text-sm text-gray-600">
                          {item.deliveries} deliveries
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ₹{item.earnings.toLocaleString('en-IN')}
                        </p>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(item.earnings / 10000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Download Statement */}
            <Button
              onClick={handleDownloadStatement}
              className="w-full gap-2 bg-gray-600 hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              Download Earnings Statement
            </Button>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {commissionBreakdown.map((item, idx) => (
                <Card key={idx} className={`${item.color} border-gray-200`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        <span className="mr-2">{item.icon}</span>
                        {item.category}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {((item.amount / earningsData.balance) * 100).toFixed(1)}% of total
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Breakdown Details */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border-b">
                    <span className="text-gray-900">Base commission per delivery</span>
                    <span className="font-medium">₹30</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border-b">
                    <span className="text-gray-900">On-time bonus (per delivery)</span>
                    <span className="font-medium">₹10</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border-b">
                    <span className="text-gray-900">Instant order bonus (per delivery)</span>
                    <span className="font-medium">₹20</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-gray-900">Performance tier status</span>
                    <span className="font-bold text-green-600">Tier 1 Achieved</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Top Performers This Month
                </CardTitle>
                <CardDescription>Your position and earnings ranking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((performer) => (
                    <div
                      key={performer.rank}
                      className={`flex items-center justify-between p-4 rounded-lg border transition ${
                        performer.rank === 5
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl font-bold text-gray-400 w-8 text-center">
                          {performer.badge || `#${performer.rank}`}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{performer.name}</p>
                          <p className="text-sm text-gray-600">
                            {performer.deliveries} deliveries
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ₹{performer.earnings.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <Zap className="h-4 w-4 inline mr-2" />
                    <strong>Next tier unlock:</strong> Complete 55 more deliveries to reach Tier 2 (₹7000 bonus)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Recent Earnings
                </CardTitle>
                <CardDescription>Your last 10 earnings events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { date: 'Mar 24, 2024', type: 'Delivery', amount: 30, details: 'Order #12345' },
                    { date: 'Mar 24, 2024', type: 'On-Time Bonus', amount: 10, details: 'Delivered on time' },
                    { date: 'Mar 23, 2024', type: 'Delivery', amount: 50, details: 'Order #12340' },
                    { date: 'Mar 23, 2024', type: 'Instant Order', amount: 20, details: 'Order #12339' },
                    { date: 'Mar 22, 2024', type: 'Delivery', amount: 30, details: 'Order #12338' },
                    { date: 'Mar 22, 2024', type: 'Performance', amount: 100, details: 'Weekly bonus' },
                    { date: 'Mar 21, 2024', type: 'Delivery', amount: 40, details: 'Order #12335' },
                    { date: 'Mar 20, 2024', type: 'Delivery', amount: 30, details: 'Order #12330' },
                    { date: 'Mar 20, 2024', type: 'Referral', amount: 500, details: 'Ref: Rajesh' },
                    { date: 'Mar 19, 2024', type: 'Delivery', amount: 35, details: 'Order #12328' },
                  ].map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{entry.type}</p>
                        <p className="text-sm text-gray-600">{entry.details}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">+₹{entry.amount}</p>
                        <p className="text-xs text-gray-500">{entry.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
