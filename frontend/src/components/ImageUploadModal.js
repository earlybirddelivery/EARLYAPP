import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Image, Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ImageUploadModal({ isOpen, onClose, onExtractItems }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState(null);
  const [extractedItems, setExtractedItems] = useState([]);
  const fileInputRef = useRef(null);

  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate format
    if (!supportedFormats.includes(selectedFile.type)) {
      toast.error('❌ Unsupported format. Use JPEG, PNG, or WebP');
      return;
    }

    // Validate size
    if (selectedFile.size > maxFileSize) {
      toast.error('❌ File too large. Maximum size is 5MB');
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const event = { target: { files: [droppedFile] } };
      handleFileSelect(event);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processImage = async () => {
    if (!file) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    toast.loading('Processing image with OCR...');

    try {
      // Simulate OCR processing
      // In production, this would call a backend OCR API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock OCR extraction results
      const mockResults = {
        rawText: `Milk - 2 liters
Bread - 1 loaf
Yogurt - 3 cups
Butter - 500g
Cheese - 2 pieces`,
        items: [
          { name: 'Milk', quantity: 2, unit: 'L', confidence: 0.95 },
          { name: 'Bread', quantity: 1, unit: 'loaf', confidence: 0.92 },
          { name: 'Yogurt', quantity: 3, unit: 'cup', confidence: 0.88 },
          { name: 'Butter', quantity: 500, unit: 'g', confidence: 0.90 },
          { name: 'Cheese', quantity: 2, unit: 'piece', confidence: 0.87 },
        ],
        overallConfidence: 0.90,
        processingTime: 2.3
      };

      setOcrResults(mockResults);
      setExtractedItems(mockResults.items);
      toast.dismiss();
      toast.success('✅ Image processed successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Failed to process image: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleItem = (index) => {
    setExtractedItems(prev => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  };

  const handleConfirmExtraction = () => {
    const selectedItems = extractedItems.filter(item => item.selected !== false);

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    onExtractItems(selectedItems);
    toast.success('✅ Items added to order');
    handleClear();
    onClose();
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setOcrResults(null);
    setExtractedItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-blue-600" />
            Scan Receipt
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your shopping list or receipt to extract items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDragDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-900 mb-1">
                Drop image here or click to upload
              </p>
              <p className="text-sm text-gray-600 mb-3">
                Supports JPEG, PNG, WebP (max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" size="sm">
                Select Image
              </Button>
            </div>
          ) : (
            <>
              {/* Image Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="w-full h-auto max-h-80 object-contain"
                  />
                  <Button
                    onClick={handleClear}
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Process Button */}
              {!ocrResults && (
                <Button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Extract Items from Image
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {/* OCR Results Section */}
          {ocrResults && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Extracted Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Raw OCR Text */}
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">RAW OCR TEXT:</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {ocrResults.rawText}
                  </p>
                </div>

                {/* Items List with Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Items</p>
                    <span className="text-xs text-gray-600">
                      Confidence: {Math.round(ocrResults.overallConfidence * 100)}%
                    </span>
                  </div>

                  {extractedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 cursor-pointer transition"
                      onClick={() => handleToggleItem(idx)}
                    >
                      <input
                        type="checkbox"
                        checked={item.selected !== false}
                        onChange={() => handleToggleItem(idx)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${item.confidence * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.round(item.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Processing Info */}
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 flex gap-2 text-sm text-blue-900">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Processing complete</p>
                    <p className="text-xs text-blue-800">
                      Processed in {ocrResults.processingTime}s. Select items to add to order.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    onClick={handleConfirmExtraction}
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Add Items to Order
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                  >
                    Try Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Text */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-900 mb-2">Tips:</p>
            <ul className="text-xs text-amber-800 space-y-1">
              <li>• Ensure good lighting and clear handwriting</li>
              <li>• Keep the image straight and well-centered</li>
              <li>• Check extracted items for accuracy before confirming</li>
              <li>• Items marked with checkmarks will be added to your order</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
