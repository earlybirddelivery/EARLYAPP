/**
 * PHASE 4B.7: Voice Integration - Voice Input Component
 * ======================================================
 * 
 * React component for voice recording and transcription.
 * Features: microphone recording, real-time waveform, transcription display
 * 
 * Usage:
 * <VoiceInput
 *   onTranscription={(transcription) => {...}}
 *   onError={(error) => {...}}
 *   customerId="cust_123"
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import voiceService from '../services/voiceService';
import styles from './VoiceInput.module.css';


const VoiceInput = ({ onTranscription, onError, customerId, autoStop = true }) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Transcription state
  const [transcription, setTranscription] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Waveform state
  const [waveformData, setWaveformData] = useState([]);
  
  // Permission state
  const [permissionStatus, setPermissionStatus] = useState(null);
  
  // Error state
  const [error, setError] = useState(null);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  
  // Constants
  const MAX_RECORDING_SECONDS = 60;
  const WAVEFORM_SAMPLES = 50;
  
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  
  useEffect(() => {
    // Check microphone permission on mount
    checkMicrophonePermission();
    
    return () => {
      // Cleanup
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (microStreamRef.current) {
        microStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Update recording timer
  useEffect(() => {
    if (!isRecording) return;
    
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        
        // Auto-stop after max duration
        if (autoStop && newTime >= MAX_RECORDING_SECONDS) {
          handleStopRecording();
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, autoStop]);
  
  // ========================================================================
  // MICROPHONE PERMISSION
  // ========================================================================
  
  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      setPermissionStatus(permission.state);
      
      permission.addEventListener('change', () => {
        setPermissionStatus(permission.state);
      });
    } catch (err) {
      console.log('Permissions API not available, will request on first use');
      setPermissionStatus('prompt');
    }
  };
  
  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      microStreamRef.current = stream;
      setPermissionStatus('granted');
      setError(null);
      
      return stream;
    } catch (err) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please enable it in settings.'
        : 'Microphone not available on this device.';
      
      setError(errorMsg);
      setPermissionStatus('denied');
      
      if (onError) {
        onError(errorMsg);
      }
      
      return null;
    }
  };
  
  // ========================================================================
  // RECORDING FUNCTIONS
  // ========================================================================
  
  const handleStartRecording = async () => {
    try {
      setError(null);
      
      // Request microphone if not already granted
      if (permissionStatus !== 'granted') {
        const stream = await requestMicrophoneAccess();
        if (!stream) return;
      } else if (!microStreamRef.current) {
        const stream = await requestMicrophoneAccess();
        if (!stream) return;
      }
      
      // Create audio context for waveform visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const stream = microStreamRef.current;
      
      // Create analyser for waveform
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
      
      // When recording stops
      mediaRecorder.onstop = async () => {
        await handleRecordingComplete();
      };
      
      // Start recording and visualization
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setConfidence(0);
      setWaveformData([]);
      
      // Start waveform visualization
      visualizeWaveform();
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
      if (onError) onError(err.message);
    }
  };
  
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };
  
  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Restart waveform visualization
      visualizeWaveform();
    }
  };
  
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };
  
  const handleCancelRecording = () => {
    // Stop recording without processing
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setTranscription('');
    setConfidence(0);
    setWaveformData([]);
    chunksRef.current = [];
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };
  
  const handleRecordingComplete = async () => {
    try {
      setIsProcessing(true);
      
      // Create blob from audio chunks
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
      
      if (audioBlob.size === 0) {
        setError('No audio recorded. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Create FormData and upload
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('customer_id', customerId);
      formData.append('duration_ms', recordingTime * 1000);
      formData.append('language', 'en');
      
      // Upload and get transcription
      const response = await voiceService.uploadReceipt(audioBlob, {
        customer_id: customerId,
        duration_ms: recordingTime * 1000,
        language: 'en'
      });
      
      // Update state with transcription
      setTranscription(response.transcription);
      setConfidence(response.confidence_score);
      
      // Call callback
      if (onTranscription) {
        onTranscription(response.transcription, response.confidence_score);
      }
      
      setError(null);
    } catch (err) {
      const errorMsg = 'Failed to process audio: ' + err.message;
      setError(errorMsg);
      
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsProcessing(false);
      chunksRef.current = [];
    }
  };
  
  // ========================================================================
  // WAVEFORM VISUALIZATION
  // ========================================================================
  
  const visualizeWaveform = () => {
    if (!analyserRef.current || !isRecording) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Sample and normalize data
    const step = Math.floor(bufferLength / WAVEFORM_SAMPLES);
    const samples = [];
    
    for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
      const index = i * step;
      samples.push((dataArray[index] || 0) / 255);
    }
    
    setWaveformData(samples);
    
    // Continue animation
    requestAnimationFrame(visualizeWaveform);
  };
  
  // ========================================================================
  // FORMATTING FUNCTIONS
  // ========================================================================
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const getConfidenceColor = (score) => {
    if (score >= 85) return '#10b981'; // Green
    if (score >= 70) return '#f59e0b'; // Amber
    if (score >= 50) return '#ef6444'; // Orange
    return '#dc2626'; // Red
  };
  
  const getConfidenceBadge = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };
  
  // ========================================================================
  // RENDER
  // ========================================================================
  
  // Permission denied screen
  if (permissionStatus === 'denied') {
    return (
      <div className={styles.permissionError}>
        <div className={styles.errorIcon}>🔒</div>
        <h3>Microphone Access Denied</h3>
        <p>Please enable microphone access in your browser settings to use voice ordering.</p>
        <p className={styles.instructions}>
          <strong>Instructions:</strong><br/>
          1. Click the lock icon in the address bar<br/>
          2. Find "Microphone" and set it to "Allow"<br/>
          3. Refresh the page and try again
        </p>
      </div>
    );
  }
  
  // Recording interface
  if (isRecording || isPaused) {
    return (
      <div className={styles.recordingContainer}>
        <div className={styles.header}>
          <h3>Recording Voice Order</h3>
          <p className={styles.timer}>{formatTime(recordingTime)}</p>
        </div>
        
        {/* Waveform visualization */}
        <div className={styles.waveformContainer}>
          <div className={styles.waveform}>
            {waveformData.map((sample, idx) => (
              <div
                key={idx}
                className={styles.waveformBar}
                style={{
                  height: `${sample * 100}%`,
                  backgroundColor: isRecording ? '#10b981' : '#6b7280'
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Instructions */}
        <div className={styles.instructions}>
          <p>
            {isRecording && '🎤 Speak clearly. Describe what you want to order.'}
            {isPaused && '⏸️ Recording paused. Click resume to continue.'}
          </p>
        </div>
        
        {/* Controls */}
        <div className={styles.controls}>
          {isRecording && (
            <>
              <button
                className={styles.buttonPause}
                onClick={handlePauseRecording}
                title="Pause recording"
              >
                ⏸️ Pause
              </button>
              <button
                className={styles.buttonStop}
                onClick={handleStopRecording}
                title="Stop and process recording"
              >
                ⏹️ Submit
              </button>
            </>
          )}
          
          {isPaused && (
            <>
              <button
                className={styles.buttonResume}
                onClick={handleResumeRecording}
                title="Resume recording"
              >
                ▶️ Resume
              </button>
              <button
                className={styles.buttonStop}
                onClick={handleStopRecording}
                title="Stop and process recording"
              >
                ⏹️ Submit
              </button>
            </>
          )}
          
          <button
            className={styles.buttonCancel}
            onClick={handleCancelRecording}
            title="Cancel recording"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  }
  
  // Processing state
  if (isProcessing) {
    return (
      <div className={styles.processingContainer}>
        <div className={styles.spinner} />
        <p>Processing your voice order...</p>
        <div className={styles.progressBar} />
      </div>
    );
  }
  
  // Transcription result
  if (transcription) {
    return (
      <div className={styles.resultContainer}>
        <div className={styles.header}>
          <h3>Voice Transcription</h3>
          <div className={styles.confidenceBadge} style={{backgroundColor: getConfidenceColor(confidence)}}>
            {getConfidenceBadge(confidence)} - {confidence.toFixed(1)}%
          </div>
        </div>
        
        {/* Confidence bar */}
        <div className={styles.confidenceBar}>
          <div
            className={styles.confidenceFill}
            style={{
              width: `${confidence}%`,
              backgroundColor: getConfidenceColor(confidence)
            }}
          />
        </div>
        
        {/* Transcription text */}
        <div className={styles.transcriptionBox}>
          <p className={styles.transcriptionText}>{transcription}</p>
        </div>
        
        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.buttonPrimary}
            onClick={() => {
              setTranscription('');
              setConfidence(0);
              handleStartRecording();
            }}
            title="Record again"
          >
            🎤 Record Again
          </button>
          <button
            className={styles.buttonSecondary}
            onClick={() => {
              setTranscription('');
              setConfidence(0);
            }}
            title="Clear and start over"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }
  
  // Initial state
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Voice Order</h3>
        <p className={styles.subtitle}>Tap to speak your order</p>
      </div>
      
      {/* Error message */}
      {error && (
        <div className={styles.errorMessage}>
          <p>⚠️ {error}</p>
        </div>
      )}
      
      {/* Main button */}
      <button
        className={styles.recordButton}
        onClick={handleStartRecording}
        disabled={permissionStatus === 'denied'}
        title="Start voice recording"
      >
        <span className={styles.micIcon}>🎤</span>
        <span className={styles.buttonText}>Start Speaking</span>
      </button>
      
      {/* Permissions info */}
      {permissionStatus === 'prompt' && (
        <p className={styles.permissionNote}>
          Click the button above to enable microphone access
        </p>
      )}
    </div>
  );
};

export default VoiceInput;
