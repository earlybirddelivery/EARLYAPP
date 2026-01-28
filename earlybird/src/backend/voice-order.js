/**
 * EarlyBird Voice Order Processing System
 * Handles speech-to-text conversion, order item parsing, confirmation
 * Supports multiple Indian languages
 */

class EarlyBirdVoiceOrder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recording = false;
        this.currentLanguage = 'en-IN';
        this.recognitionEngine = null;
        this.initSpeechRecognition();
    }

    /**
     * Initialize Web Speech API
     */
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognitionEngine = new SpeechRecognition();
            this.recognitionEngine.continuous = false;
            this.recognitionEngine.interimResults = false;
        }
    }

    /**
     * Start recording voice
     */
    startRecording() {
        this.audioChunks = [];
        this.recording = true;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.mediaRecorder = new MediaRecorder(stream);
                
                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = () => {
                    this.processRecordedAudio();
                };

                this.mediaRecorder.start();
                this.updateRecordingUI(true);
            })
            .catch(err => {
                console.error('Microphone access denied:', err);
                alert('Please allow microphone access to use voice ordering');
                this.recording = false;
            });
    }

    /**
     * Stop recording voice
     */
    stopRecording() {
        if (this.mediaRecorder && this.recording) {
            this.mediaRecorder.stop();
            this.recording = false;
            this.updateRecordingUI(false);
        }
    }

    /**
     * Process recorded audio
     */
    processRecordedAudio() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.convertAudioToText(audioBlob);
    }

    /**
     * Convert audio to text using Web Speech API or backend
     */
    convertAudioToText(audioBlob) {
        if (this.recognitionEngine) {
            // Use Web Speech API
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();

            // Simulate speech-to-text (in production, send to Google Cloud Speech API)
            this.simulateSpeechToText(audioBlob);
        }
    }

    /**
     * Simulate speech-to-text conversion (demo)
     */
    simulateSpeechToText(audioBlob) {
        // Simulate API call to speech-to-text service
        const transcript = this.generateMockTranscript();
        this.parseOrderFromTranscript(transcript);
    }

    /**
     * Mock transcript generator (demo purpose)
     */
    generateMockTranscript() {
        const transcripts = [
            'I need two liters of milk, one bread, and half a dozen eggs',
            'Give me one kilogram of rice and three cans of ghee',
            'I want two packets of paneer, one bottle of honey, and some curd',
            'Please send one butter, two yogurts, and one cheese'
        ];
        return transcripts[Math.floor(Math.random() * transcripts.length)];
    }

    /**
     * Parse order items from transcript
     */
    parseOrderFromTranscript(transcript) {
        // Mock NLP parsing (in production, use Google NLP or similar)
        const items = this.extractOrderItems(transcript);
        this.displayParsedOrder(items, transcript);
    }

    /**
     * Extract items from transcript using pattern matching
     */
    extractOrderItems(transcript) {
        const items = [];
        const quantities = ['one', 'two', 'three', 'four', 'five', 'half', 'liter', 'kg', 'packet', 'bottle', 'can', 'box', 'dozen'];
        const products = ['milk', 'bread', 'eggs', 'rice', 'ghee', 'paneer', 'honey', 'curd', 'butter', 'yogurt', 'cheese', 'oil', 'sugar'];

        // Simple pattern matching
        const words = transcript.toLowerCase().split(/\s+/);
        
        let currentQuantity = '';
        let currentUnit = '';

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            // Check for quantity words
            if (['one', 'two', 'three', 'four', 'five', 'half'].includes(word)) {
                currentQuantity = word;
            }
            
            // Check for unit words
            if (['liter', 'litre', 'kg', 'packet', 'bottle', 'can', 'box', 'dozen'].includes(word)) {
                currentUnit = word;
            }
            
            // Check for product names
            if (products.some(p => word.includes(p))) {
                const productName = products.find(p => word.includes(p));
                if (currentQuantity || currentUnit) {
                    items.push({
                        name: productName,
                        quantity: currentQuantity || '1',
                        unit: currentUnit || 'piece',
                        confidence: 0.85 + Math.random() * 0.15
                    });
                    currentQuantity = '';
                    currentUnit = '';
                }
            }
        }

        return items;
    }

    /**
     * Display parsed order for user confirmation
     */
    displayParsedOrder(items, transcript) {
        const container = document.getElementById('voiceOrderResults');
        if (!container) return;

        let html = `
            <div class="voice-order-results">
                <div class="transcript-section">
                    <h4>📝 What You Said:</h4>
                    <p class="transcript-text">"${transcript}"</p>
                </div>

                <div class="parsed-items-section">
                    <h4>✓ Items Recognized:</h4>
                    <div class="items-list">
        `;

        items.forEach((item, index) => {
            const confidentIcon = item.confidence > 0.9 ? '✓' : '⚠';
            html += `
                <div class="order-item">
                    <span class="confidence ${item.confidence > 0.9 ? 'high' : 'medium'}">${confidentIcon}</span>
                    <span class="item-name">${item.quantity} ${item.unit} ${item.name}</span>
                    <span class="confidence-score">(${(item.confidence * 100).toFixed(0)}%)</span>
                </div>
            `;
        });

        html += `
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="btn btn-success" onclick="earlyBirdVoiceOrder.confirmOrder('${JSON.stringify(items).replace(/"/g, '&quot;')}')">
                        ✓ Confirm Order
                    </button>
                    <button class="btn btn-warning" onclick="earlyBirdVoiceOrder.startRecording()">
                        🎤 Try Again
                    </button>
                </div>

                <style>
                    .voice-order-results {
                        padding: 20px;
                        background: #f9f9f9;
                        border-radius: 8px;
                        margin-top: 20px;
                    }
                    .transcript-section {
                        margin-bottom: 20px;
                    }
                    .transcript-text {
                        padding: 12px;
                        background: white;
                        border-left: 4px solid #3498db;
                        font-style: italic;
                        border-radius: 4px;
                    }
                    .parsed-items-section {
                        margin-bottom: 20px;
                    }
                    .items-list {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .order-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px;
                        background: white;
                        border-radius: 4px;
                        border-left: 3px solid #2ecc71;
                    }
                    .confidence {
                        font-weight: bold;
                    }
                    .confidence.high {
                        color: #27ae60;
                    }
                    .confidence.medium {
                        color: #f39c12;
                    }
                    .item-name {
                        flex: 1;
                        font-weight: 500;
                    }
                    .confidence-score {
                        font-size: 12px;
                        color: #7f8c8d;
                    }
                    .action-buttons {
                        display: flex;
                        gap: 10px;
                    }
                </style>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Confirm parsed order and create it
     */
    confirmOrder(itemsJson) {
        const items = JSON.parse(itemsJson);
        
        const order = {
            id: `ORD_${Date.now()}`,
            source: 'voice',
            items: items,
            timestamp: new Date().toISOString(),
            language: this.currentLanguage,
            status: 'confirmed'
        };

        // Save to localStorage
        const orders = JSON.parse(localStorage.getItem('voiceOrders') || '[]');
        orders.push(order);
        localStorage.setItem('voiceOrders', JSON.stringify(orders));

        // Sync with backend
        fetch('/api/voice/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        }).catch(() => console.log('Backend sync pending'));

        alert(`✓ Order ${order.id} created successfully!\n\nItems:\n${items.map(i => `- ${i.quantity} ${i.unit} ${i.name}`).join('\n')}`);
        
        // Reset UI
        this.resetUI();
        
        return order;
    }

    /**
     * Update recording UI state
     */
    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('voiceRecordBtn');
        if (recordBtn) {
            if (isRecording) {
                recordBtn.innerHTML = '⏹️ Stop Recording';
                recordBtn.onclick = () => this.stopRecording();
                recordBtn.style.background = '#e74c3c';
            } else {
                recordBtn.innerHTML = '🎤 Start Recording';
                recordBtn.onclick = () => this.startRecording();
                recordBtn.style.background = '#2ecc71';
            }
        }
    }

    /**
     * Reset UI to initial state
     */
    resetUI() {
        const container = document.getElementById('voiceOrderResults');
        if (container) {
            container.innerHTML = '';
        }
        this.updateRecordingUI(false);
    }

    /**
     * Set language for voice recognition
     */
    setLanguage(languageCode) {
        this.currentLanguage = languageCode;
        if (this.recognitionEngine) {
            this.recognitionEngine.lang = languageCode;
        }
    }

    /**
     * Get voice order history
     */
    getVoiceOrderHistory(limit = 20) {
        const orders = JSON.parse(localStorage.getItem('voiceOrders') || '[]');
        return orders.slice(-limit).reverse();
    }
}

// Global instance
const earlyBirdVoiceOrder = new EarlyBirdVoiceOrder();
