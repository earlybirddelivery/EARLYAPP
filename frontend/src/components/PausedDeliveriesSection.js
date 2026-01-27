import React from 'react';
import { PauseCircle, Play, Phone, MapPin, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function PausedDeliveriesSection({ pausedDeliveries, onUnpause, onRefresh }) {
  if (!pausedDeliveries || pausedDeliveries.length === 0) {
    return null;
  }

  const handleUnpause = async (pause) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/unpause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: pause.customer_id,
          product_id: pause.product_id,
          date: pause.date
        })
      });

      if (!res.ok) {
        throw new Error('Failed to unpause');
      }

      toast.success('Delivery resumed');
      if (onUnpause) onUnpause(pause);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Unpause failed:', error);
      toast.error('Failed to resume delivery');
    }
  };

  return (
    <Card className="mt-6 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <PauseCircle className="h-5 w-5" />
          Paused Deliveries ({pausedDeliveries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pausedDeliveries.map((pause, index) => (
            <div
              key={pause.id || index}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {pause.customer_name || 'Unknown Customer'}
                  </span>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Paused
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {pause.product_name || 'Unknown Product'}
                  </span>
                  {pause.customer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {pause.customer_phone}
                    </span>
                  )}
                  {pause.area && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {pause.area}
                    </span>
                  )}
                </div>

                {pause.customer_address && (
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                    {pause.customer_address}
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => handleUnpause(pause)}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PausedDeliveriesSection;
