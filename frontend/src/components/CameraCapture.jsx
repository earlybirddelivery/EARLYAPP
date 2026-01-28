import React, { useRef, useEffect, useState } from 'react';
import styles from './CameraCapture.module.css';

/**
 * CameraCapture Component
 * Captures receipt images using device camera
 * 
 * Props:
 *   onCapture: Callback when photo is captured (receives File object)
 *   onClose: Callback when camera is closed
 *   scanType: Type of scan ('receipt', 'bill', 'invoice', 'menu')
 *   maxRetries: Max photos before auto-submit (default: 5)
 */
const CameraCapture = ({ onCapture, onClose, scanType = 'receipt', maxRetries = 5 }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, setPermission] = useState('pending');
  const [facingMode, setFacingMode] = useState('environment'); // rear camera
  const [retries, setRetries] = useState(0);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Request camera permission and start stream
  useEffect(() => {
    const startCamera = async () => {
      try {
        setError(null);
        
        // Check browser support
        const navigator_mediaDevices = navigator.mediaDevices || (
          navigator.getUserMedia ? {
            getUserMedia: (constraints) => {
              return new Promise((resolve, reject) => {
                navigator.getUserMedia(constraints, resolve, reject);
              });
            }
          } : null
        );

        if (!navigator_mediaDevices) {
          throw new Error('Camera API not supported on this device');
        }

        // Request camera access
        const mediaStream = await navigator_mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1440 }
          },
          audio: false
        });

        setStream(mediaStream);
        setPermission('granted');

        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please enable camera in browser settings.');
          setPermission('denied');
        } else if (err.name === 'NotFoundError') {
          setError('No camera device found on this device.');
          setPermission('unavailable');
        } else {
          setError(`Camera error: ${err.message}`);
          setPermission('error');
        }
      }
    };

    startCamera();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      setError('Camera not ready');
      return;
    }

    try {
      setIsCapturing(true);
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;

      // Set canvas dimensions to match video
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert canvas to blob
      canvasRef.current.toBlob(
        (blob) => {
          // Create File object
          const file = new File([blob], `receipt_${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });

          setPhoto({
            src: canvasRef.current.toDataURL('image/jpeg'),
            file: file,
            timestamp: new Date()
          });

          setIsCapturing(false);
          setRetries(retries + 1);
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture photo');
      setIsCapturing(false);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setPhoto(null);
    setError(null);
  };

  // Submit captured photo
  const submitPhoto = async () => {
    if (!photo) {
      setError('No photo captured');
      return;
    }

    try {
      setIsCapturing(true);
      
      // Call parent callback with file
      if (onCapture) {
        await onCapture(photo.file, scanType);
      }

      // Close after successful upload
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload from gallery
  const uploadFromGallery = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError('Invalid image format. Please use JPG, PNG, or WebP');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum 10MB allowed');
        return;
      }

      // Read file and create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhoto({
          src: e.target.result,
          file: file,
          timestamp: new Date()
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(`Error loading image: ${err.message}`);
    }
  };

  // Toggle camera (front/back)
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setCameraReady(false);
  };

  // Handle permission errors
  if (permission === 'denied') {
    return (
      <div className={styles.container}>
        <div className={styles.permissionError}>
          <div className={styles.errorIcon}>📷</div>
          <h2>Camera Access Denied</h2>
          <p>Please enable camera access in your browser settings to scan receipts.</p>
          <div className={styles.instructions}>
            <h3>How to enable camera:</h3>
            <ol>
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Camera" and change to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    );
  }

  if (permission === 'unavailable') {
    return (
      <div className={styles.container}>
        <div className={styles.permissionError}>
          <div className={styles.errorIcon}>📱</div>
          <h2>No Camera Found</h2>
          <p>This device doesn't have a camera, or it's not accessible.</p>
          <p>Try uploading a photo from your gallery instead:</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={uploadFromGallery}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={styles.galleryBtn}
          >
            📁 Upload from Gallery
          </button>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Scan Receipt</h1>
        <button onClick={onClose} className={styles.closeBtn}>✕</button>
      </div>

      {/* Display captured photo */}
      {photo ? (
        <div className={styles.photoPreview}>
          <img src={photo.src} alt="Captured receipt" />
          <div className={styles.photoInfo}>
            <p>📸 Photo captured at {photo.timestamp.toLocaleTimeString()}</p>
            <p className={styles.fileSize}>
              Size: {(photo.file.size / 1024).toFixed(2)} KB
            </p>
          </div>

          <div className={styles.actions}>
            <button 
              onClick={retakePhoto}
              className={styles.retakeBtn}
              disabled={isCapturing}
            >
              🔄 Retake Photo
            </button>
            <button 
              onClick={submitPhoto}
              className={styles.submitBtn}
              disabled={isCapturing}
            >
              {isCapturing ? '⏳ Processing...' : '✓ Use This Photo'}
            </button>
          </div>

          {retries >= 3 && (
            <div className={styles.retryInfo}>
              <p>💡 Tip: Retakes: {retries}. Make sure the receipt is well-lit and clearly visible.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Camera view */}
          <div className={styles.cameraView}>
            {!cameraReady && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Initializing camera...</p>
              </div>
            )}
            <video
              ref={videoRef}
              className={styles.video}
              playsInline
              autoPlay
              muted
            />
            
            {/* Camera guide overlay */}
            <div className={styles.guideOverlay}>
              <div className={styles.guideFrame}>
                <div className={styles.corner + ' ' + styles.topLeft}></div>
                <div className={styles.corner + ' ' + styles.topRight}></div>
                <div className={styles.corner + ' ' + styles.bottomLeft}></div>
                <div className={styles.corner + ' ' + styles.bottomRight}></div>
              </div>
              <p className={styles.hint}>
                Position receipt within frame
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <button 
              onClick={toggleCamera}
              className={styles.cameraToggle}
              disabled={!cameraReady || isCapturing}
              title="Switch between front and rear camera"
            >
              🔄
            </button>
            
            <button 
              onClick={capturePhoto}
              className={styles.captureBtn}
              disabled={!cameraReady || isCapturing}
            >
              {isCapturing ? '⏳' : '📷'}
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={styles.galleryBtn}
              disabled={isCapturing}
              title="Upload from gallery"
            >
              📁
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={uploadFromGallery}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          {/* Instructions */}
          <div className={styles.instructions}>
            <h3>📋 Tips for better results:</h3>
            <ul>
              <li>📸 Ensure good lighting (natural light is best)</li>
              <li>🎯 Position receipt within the frame</li>
              <li>📐 Keep receipt flat and at eye level</li>
              <li>✨ Avoid shadows and reflections</li>
              <li>🖼️ Make sure all items are visible</li>
            </ul>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className={styles.dismissBtn}
          >
            ✕
          </button>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CameraCapture;
