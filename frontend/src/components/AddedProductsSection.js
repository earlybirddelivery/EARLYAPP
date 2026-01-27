import React from 'react';
import { Plus, X, Phone, MapPin, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function AddedProductsSection({ addedProducts, onRemove, onRefresh }) {
  if (!addedProducts || addedProducts.length === 0) {
    return null;
  }

  const handleRemove = async (product) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/phase0-v2/delivery/remove-added-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delivery_id: product.id
        })
      });

      if (!res.ok) {
        throw new Error('Failed to remove');
      }

      toast.success('Added product removed');
      if (onRemove) onRemove(product);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Remove failed:', error);
      toast.error('Failed to remove product');
    }
  };

  return (
    <Card className="mt-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Plus className="h-5 w-5" />
          Extra Products Added Today ({addedProducts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {addedProducts.map((product, index) => (
            <div
              key={product.id || index}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {product.customer_name || 'Unknown Customer'}
                  </span>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    +{product.quantity} {product.product_name}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {product.product_name || 'Unknown Product'}
                  </span>
                  {product.customer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {product.customer_phone}
                    </span>
                  )}
                </div>

                {product.customer_address && (
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                    {product.customer_address}
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => handleRemove(product)}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AddedProductsSection;
