import React, { useState } from 'react';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { toast } from 'sonner';
import { Settings, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminSettings() {
  const navigate = useNavigate();

  const [pwaSettings, setPwaSettings] = useState({
    appName: 'EarlyBird',
    shortName: 'EarlyBird',
    themeColor: '#000000',
    backgroundColor: '#ffffff',
    appIcon192: null,
    appIcon512: null,
    appLogo: null
  });

  const [commission, setCommission] = useState({
    deliveryBoyRate: 5,
    marketingStaffRate: 3
  });

  const handlePWASave = () => {
    toast.success('PWA settings saved successfully!');
  };

  const handleImageUpload = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPwaSettings(prev => ({
          ...prev,
          [field]: reader.result
        }));
        toast.success(`${field} uploaded successfully!`);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Admin Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="pwa">
          <TabsList className="mb-6">
            <TabsTrigger value="pwa">PWA Settings</TabsTrigger>
            <TabsTrigger value="users">Users & Customers</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
            <TabsTrigger value="cleanup">Test Data Cleanup</TabsTrigger>
            <TabsTrigger value="import">Import History</TabsTrigger>
          </TabsList>

          {/* PWA Settings Tab */}
          <TabsContent value="pwa">
            <Card>
              <CardHeader>
                <CardTitle>PWA Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label>App Name</Label>
                      <Input
                        value={pwaSettings.appName}
                        onChange={(e) => setPwaSettings({ ...pwaSettings, appName: e.target.value })}
                        placeholder="EarlyBird"
                      />
                    </div>
                    <div>
                      <Label>Short Name</Label>
                      <Input
                        value={pwaSettings.shortName}
                        onChange={(e) => setPwaSettings({ ...pwaSettings, shortName: e.target.value })}
                        placeholder="EarlyBird"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label>Theme Color</Label>
                      <div className="flex gap-2 items-center">
                        <div
                          className="w-12 h-12 rounded border"
                          style={{ backgroundColor: pwaSettings.themeColor }}
                        />
                        <Input
                          type="text"
                          value={pwaSettings.themeColor}
                          onChange={(e) => setPwaSettings({ ...pwaSettings, themeColor: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex gap-2 items-center">
                        <div
                          className="w-12 h-12 rounded border"
                          style={{ backgroundColor: pwaSettings.backgroundColor }}
                        />
                        <Input
                          type="text"
                          value={pwaSettings.backgroundColor}
                          onChange={(e) => setPwaSettings({ ...pwaSettings, backgroundColor: e.target.value })}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label>App Icon (192×192)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        {pwaSettings.appIcon192 ? (
                          <img src={pwaSettings.appIcon192} alt="App Icon 192" className="w-24 h-24 mx-auto mb-2" />
                        ) : (
                          <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        )}
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:underline">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload('appIcon192')}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label>App Icon (512×512)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        {pwaSettings.appIcon512 ? (
                          <img src={pwaSettings.appIcon512} alt="App Icon 512" className="w-24 h-24 mx-auto mb-2" />
                        ) : (
                          <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        )}
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:underline">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload('appIcon512')}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label>App Logo</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        {pwaSettings.appLogo ? (
                          <img src={pwaSettings.appLogo} alt="App Logo" className="w-24 h-24 mx-auto mb-2" />
                        ) : (
                          <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        )}
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:underline">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload('appLogo')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handlePWASave} className="bg-green-600 hover:bg-green-700">
                    Save PWA Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Customers Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users & Customers Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">User and customer management interface will appear here.</p>
                <Button onClick={() => navigate('/admin')} className="mt-4">
                  Go to User Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commission Tab */}
          <TabsContent value="commission">
            <Card>
              <CardHeader>
                <CardTitle>Commission Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Delivery Boy Commission Rate (%)</Label>
                    <Input
                      type="number"
                      value={commission.deliveryBoyRate}
                      onChange={(e) => setCommission({ ...commission, deliveryBoyRate: parseFloat(e.target.value) })}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label>Marketing Staff Commission Rate (%)</Label>
                    <Input
                      type="number"
                      value={commission.marketingStaffRate}
                      onChange={(e) => setCommission({ ...commission, marketingStaffRate: parseFloat(e.target.value) })}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <Button onClick={() => toast.success('Commission rates saved!')} className="bg-blue-600">
                    Save Commission Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Data Cleanup Tab */}
          <TabsContent value="cleanup">
            <Card>
              <CardHeader>
                <CardTitle>Test Data Cleanup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">Clean up test data from the system</p>
                  <Button variant="destructive" onClick={() => toast.warning('This feature is coming soon')}>
                    Clean Test Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import History Tab */}
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">View history of imported data</p>
                <div className="mt-4 text-sm text-gray-500">No import history available</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
