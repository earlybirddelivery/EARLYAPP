import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Mic, Square, Volume2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function VoiceOrderModal({ isOpen, onClose, onOrderCreate }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognitionEngine, setRecognitionEngine] = useState(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [language, setLanguage] = useState('en-IN');
  const [confidence, setConfidence] = useState(0);

  // Regional language support
  const languages = {
    'en-IN': { name: 'English', flag: '🇮🇳' },
    'hi-IN': { name: 'हिंदी', flag: '🇮🇳' },
    'ta-IN': { name: 'தமிழ்', flag: '🇮🇳' },
    'te-IN': { name: 'తెలుగు', flag: '🇮🇳' },
  };

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (final) {
          setTranscript(prev => prev + final);
          setInterimTranscript('');
          // Parse and preview order
          parseVoiceOrder(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event) => {
        toast.error(`Microphone error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognitionEngine(recognition);
    } else {
      toast.error('Speech Recognition not supported in this browser');
    }

    return () => {
      if (recognitionEngine) {
        recognitionEngine.abort();
      }
    };
  }, [language]);

  const parseVoiceOrder = (text) => {
    // Simple parsing logic - extract quantities and product names
    // In production, this would use NLP
    const items = [];
    const words = text.toLowerCase().split(' ');

    // Mock product database
    const mockProducts = [
      { id: 1, name: 'milk', variants: ['milk', 'दूध'] },
      { id: 2, name: 'bread', variants: ['bread', 'ब्रेड'] },
      { id: 3, name: 'yogurt', variants: ['yogurt', 'दही'] },
      { id: 4, name: 'butter', variants: ['butter', 'मक्खन'] },
    ];

    // Very basic parsing
    const numberMap = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
    };

    mockProducts.forEach(product => {
      product.variants.forEach(variant => {
        if (text.toLowerCase().includes(variant)) {
          let qty = 1;
          const index = text.toLowerCase().indexOf(variant);
          const beforeText = text.substring(0, index).toLowerCase();
          
          Object.entries(numberMap).forEach(([word, num]) => {
            if (beforeText.includes(word)) {
              qty = num;
            }
          });

          items.push({
            id: product.id,
            name: product.name,
            quantity: qty,
            unit: 'L' // Default to liters
          });
        }
      });
    });

    if (items.length > 0) {
      setOrderPreview({
        items: items,
        total: items.length,
        confidence: 0.85
      });
      setConfidence(0.85);
    }
  };

  const handleStartRecording = () => {
    if (recognitionEngine && !isRecording) {
      recognitionEngine.start();
    }
  };

  const handleStopRecording = () => {
    if (recognitionEngine && isRecording) {
      recognitionEngine.stop();
    }
  };

  const handleConfirmOrder = () => {
    if (orderPreview && orderPreview.items.length > 0) {
      onOrderCreate(orderPreview);
      toast.success('Order created from voice');
      onClose();
      // Reset state
      setTranscript('');
      setOrderPreview(null);
      setConfidence(0);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
    setOrderPreview(null);
    setConfidence(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            Voice Order
          </DialogTitle>
          <DialogDescription>
            Speak to create your order. Supports multiple regional languages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Language Selection */}
          <div className="flex gap-2">
            {Object.entries(languages).map(([code, { name, flag }]) => (
              <Button
                key={code}
                variant={language === code ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage(code)}
              >
                {flag} {name}
              </Button>
            ))}
          </div>

          {/* Recording Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recording</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recording Status */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">
                      {isRecording ? '🔴 Recording...' : '⚪ Ready to record'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {isRecording ? 'Speak now' : 'Click Start to begin'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recording Buttons */}
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Mic className="h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopRecording}
                    className="flex-1 gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <Square className="h-4 w-4" />
                    Stop Recording
                  </Button>
                )}
                {transcript && (
                  <Button
                    onClick={handleClear}
                    variant="outline"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Transcription Display */}
              {(transcript || interimTranscript) && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {transcript}
                    <span className="text-gray-400 italic ml-1">{interimTranscript}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Preview Section */}
          {orderPreview && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle className="h-5 w-5" />
                  Order Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {orderPreview.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2 bg-white rounded border border-green-100"
                    >
                      <span className="font-medium text-gray-900">
                        {item.name}
                      </span>
                      <span className="text-gray-600">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confidence Indicator */}
                <div className="pt-3 border-t border-green-200">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${confidence * 100}%` }}
                      />
                    </div>
                    <span className="font-medium text-gray-700">
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Confidence in recognized items
                  </p>
                </div>

                {/* Confirmation Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleConfirmOrder}
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Order
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                  >
                    Retake
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Tips for best results:</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                <li>Speak clearly and at a normal pace</li>
                <li>Mention quantities (e.g., "2 liters milk")</li>
                <li>Noisy environments may reduce accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
