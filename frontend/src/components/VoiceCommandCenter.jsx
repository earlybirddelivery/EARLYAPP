/**
 * PHASE 4B.7: Voice Integration - Voice Command Center
 * ======================================================
 * 
 * React component for displaying supported voice commands and settings.
 * Features: command suggestions, accessibility options, audio feedback
 * 
 * Usage:
 * <VoiceCommandCenter
 *   onCommandSelect={(command) => {...}}
 *   userId="user_123"
 * />
 */

import React, { useState, useEffect } from 'react';
import voiceService from '../services/voiceService';
import styles from './VoiceCommandCenter.module.css';


const VoiceCommandCenter = ({ onCommandSelect, userId }) => {
  // Commands state
  const [commands, setCommands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Accessibility state
  const [accessibility, setAccessibility] = useState({
    preferred_language: 'en',
    voice_speed: 1.0,
    enable_captions: true,
    enable_audio_feedback: true,
    dark_mode: false,
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  
  useEffect(() => {
    loadCommands();
    loadAccessibilitySettings();
  }, [userId]);
  
  const loadCommands = async () => {
    try {
      setIsLoading(true);
      const response = await voiceService.getCommandsList();
      setCommands(response.commands || []);
    } catch (err) {
      console.error('Failed to load commands:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAccessibilitySettings = async () => {
    try {
      const response = await voiceService.getAccessibilitySettings(userId);
      setAccessibility(response);
    } catch (err) {
      console.error('Failed to load accessibility settings:', err);
    }
  };
  
  // ========================================================================
  // COMMAND FUNCTIONS
  // ========================================================================
  
  const handleCommandSelect = (command) => {
    if (onCommandSelect) {
      onCommandSelect(command);
    }
    playAudioFeedback('select');
  };
  
  const getCommandIcon = (intent) => {
    const icons = {
      'CREATE_ORDER': '🛒',
      'CANCEL_ORDER': '❌',
      'REPEAT_ORDER': '🔄',
      'SEARCH_PRODUCT': '🔍',
      'GET_HELP': '❓',
    };
    return icons[intent] || '🎤';
  };
  
  const filteredCommands = selectedCategory === 'all'
    ? commands
    : commands.filter(cmd => cmd.type === selectedCategory);
  
  // ========================================================================
  // ACCESSIBILITY FUNCTIONS
  // ========================================================================
  
  const handleAccessibilityChange = (setting, value) => {
    const updated = { ...accessibility, [setting]: value };
    setAccessibility(updated);
  };
  
  const handleSaveAccessibility = async () => {
    try {
      setIsSaving(true);
      await voiceService.updateAccessibilitySettings(userId, accessibility);
      setShowSettings(false);
      playAudioFeedback('success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      playAudioFeedback('error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // ========================================================================
  // AUDIO FEEDBACK
  // ========================================================================
  
  const playAudioFeedback = (type) => {
    if (!accessibility.enable_audio_feedback) return;
    
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set frequency and duration based on feedback type
    const feedbackConfig = {
      select: { frequency: 800, duration: 0.1 },
      success: { frequency: 1200, duration: 0.2 },
      error: { frequency: 400, duration: 0.3 },
    };
    
    const config = feedbackConfig[type] || feedbackConfig.select;
    
    oscillator.frequency.value = config.frequency;
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);
  };
  
  // ========================================================================
  // RENDER
  // ========================================================================
  
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p>Loading commands...</p>
      </div>
    );
  }
  
  return (
    <div className={`${styles.container} ${accessibility.dark_mode ? styles.darkMode : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Voice Commands</h2>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className={styles.settingsPanel}>
          <h3>Accessibility Settings</h3>
          
          {/* Language */}
          <div className={styles.setting}>
            <label htmlFor="language">Preferred Language</label>
            <select
              id="language"
              value={accessibility.preferred_language}
              onChange={(e) => handleAccessibilityChange('preferred_language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="en-IN">English (India)</option>
            </select>
          </div>
          
          {/* Voice Speed */}
          <div className={styles.setting}>
            <label htmlFor="speed">Voice Speed</label>
            <div className={styles.sliderContainer}>
              <input
                id="speed"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={accessibility.voice_speed}
                onChange={(e) => handleAccessibilityChange('voice_speed', parseFloat(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>{accessibility.voice_speed.toFixed(1)}x</span>
            </div>
          </div>
          
          {/* Toggles */}
          <div className={styles.toggleContainer}>
            <label>
              <input
                type="checkbox"
                checked={accessibility.enable_captions}
                onChange={(e) => handleAccessibilityChange('enable_captions', e.target.checked)}
              />
              <span>Show Captions</span>
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={accessibility.enable_audio_feedback}
                onChange={(e) => handleAccessibilityChange('enable_audio_feedback', e.target.checked)}
              />
              <span>Audio Feedback</span>
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={accessibility.dark_mode}
                onChange={(e) => handleAccessibilityChange('dark_mode', e.target.checked)}
              />
              <span>Dark Mode</span>
            </label>
          </div>
          
          {/* Save button */}
          <button
            className={styles.saveButton}
            onClick={handleSaveAccessibility}
            disabled={isSaving}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Settings'}\n          </button>
        </div>
      )}\n      \n      {/* Category Filter */}\n      <div className={styles.categoryFilter}>\n        <button\n          className={`${styles.categoryButton} ${selectedCategory === 'all' ? styles.active : ''}`}\n          onClick={() => setSelectedCategory('all')}\n        >\n          All\n        </button>\n        <button\n          className={`${styles.categoryButton} ${selectedCategory === 'order' ? styles.active : ''}`}\n          onClick={() => setSelectedCategory('order')}\n        >\n          🛒 Orders\n        </button>\n        <button\n          className={`${styles.categoryButton} ${selectedCategory === 'search' ? styles.active : ''}`}\n          onClick={() => setSelectedCategory('search')}\n        >\n          🔍 Search\n        </button>\n        <button\n          className={`${styles.categoryButton} ${selectedCategory === 'help' ? styles.active : ''}`}\n          onClick={() => setSelectedCategory('help')}\n        >\n          ❓ Help\n        </button>\n      </div>\n      \n      {/* Commands List */}\n      <div className={styles.commandsList}>\n        {filteredCommands.length === 0 ? (\n          <p className={styles.empty}>No commands available</p>\n        ) : (\n          filteredCommands.map((command) => (\n            <div key={command.intent} className={styles.commandCard}>\n              <div className={styles.commandHeader}>\n                <span className={styles.icon}>\n                  {getCommandIcon(command.intent)}\n                </span>\n                <div className={styles.commandInfo}>\n                  <h4>{command.description}</h4>\n                  <p className={styles.commandType}>{command.type}</p>\n                </div>\n              </div>\n              \n              {/* Examples */}\n              <div className={styles.examples}>\n                <p className={styles.examplesLabel}>Examples:</p>\n                <ul>\n                  {command.examples.map((example, idx) => (\n                    <li key={idx}>\n                      <code>\" {example} \"</code>\n                      <button\n                        className={styles.tryButton}\n                        onClick={() => handleCommandSelect(command)}\n                        title=\"Try this command\"\n                      >\n                        Try →\n                      </button>\n                    </li>\n                  ))}\n                </ul>\n              </div>\n            </div>\n          ))\n        )}\n      </div>\n      \n      {/* Captions Info */}\n      {accessibility.enable_captions && (\n        <div className={styles.captionsNote}>\n          💬 Captions are enabled. You'll see transcriptions in real-time.\n        </div>\n      )}\n    </div>\n  );\n};\n\nexport default VoiceCommandCenter;
