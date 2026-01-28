/**
 * EarlyBird Voice Order Entry System
 * Regional language support: Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati
 * Features: Real-time transcription, NLP parsing, product catalog matching, confidence scoring
 */

const EarlyBirdVoice = {
    // State management
    state: {
        isRecording: false,
        currentLanguage: 'en-IN',
        recognitionEngine: null,
        transcriptionHistory: [],
        voiceOrders: [],
        confidenceThreshold: 0.80,
        supportedLanguages: {
            'hi': { name: 'हिंदी', code: 'hi-IN' },
            'ta': { name: 'தமிழ்', code: 'ta-IN' },
            'te': { name: 'తెలుగు', code: 'te-IN' },
            'bn': { name: 'বাংলা', code: 'bn-IN' },
            'mr': { name: 'मराठी', code: 'mr-IN' },
            'kn': { name: 'ಕನ್ನಡ', code: 'kn-IN' },
            'ml': { name: 'മലയാളം', code: 'ml-IN' },
            'gu': { name: 'ગુજરાતી', code: 'gu-IN' },
            'en': { name: 'English', code: 'en-IN' }
        },
        // Quantity phrases in regional languages
        quantityPhrases: {
            'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
            'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5,
            'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
            'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5
        },
        // Unit conversion
        unitPhrases: {
            'किलो': 'kg', 'किग्रा': 'kg', 'ग्राम': 'g', 'लीटर': 'L', 'मिली': 'ml',
            'கிலோ': 'kg', 'கிராம்': 'g', 'லிட்டர்': 'L',
            'కిలో': 'kg', 'గ్రాం': 'g', 'లీటర్': 'L',
            'কিলো': 'kg', 'গ্রাম': 'g', 'লিটার': 'L'
        },
        mockCatalog: [] // Will be populated from product database
    },

    /**
     * Initialize voice recognition engine
     */
    init() {
        this.loadFromStorage();
        this.state.mockCatalog = this.generateMockCatalog();
        
        // Initialize Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.state.recognitionEngine = new SpeechRecognition();
            this.setupRecognitionEngine();
        } else {
            console.warn('Speech Recognition API not supported in this browser');
        }
    },

    /**
     * Setup speech recognition engine with callbacks
     */
    setupRecognitionEngine() {
        const engine = this.state.recognitionEngine;
        
        engine.continuous = false;
        engine.interimResults = true;
        engine.lang = this.state.currentLanguage;

        engine.onstart = () => {
            this.state.isRecording = true;
            EarlyBirdUtils.showToast('🎤 Listening...', 'info');
        };

        engine.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update interim results in real-time
            if (interimTranscript || finalTranscript) {
                this.updateTranscriptionPreview(interimTranscript || finalTranscript, !finalTranscript);
            }
        };

        engine.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
            EarlyBirdUtils.showToast('❌ Microphone error: ' + event.error, 'error');
            this.state.isRecording = false;
        };

        engine.onend = () => {
            this.state.isRecording = false;
        };
    },

    /**
     * Start voice recording
     */
    startRecording(languageCode = 'hi-IN') {
        if (!this.state.recognitionEngine) {
            EarlyBirdUtils.showToast('❌ Voice recognition not available', 'error');
            return;
        }

        this.state.currentLanguage = languageCode;
        this.state.recognitionEngine.lang = languageCode;
        
        try {
            this.state.recognitionEngine.start();
        } catch (e) {
            console.error('Error starting recording:', e);
        }
    },

    /**
     * Stop voice recording and process
     */
    stopRecording() {
        if (this.state.recognitionEngine) {
            this.state.recognitionEngine.stop();
            this.state.isRecording = false;
        }
    },

    /**
     * Update transcription preview UI
     */
    updateTranscriptionPreview(text, isInterim = false) {
        const previewElement = document.getElementById('voice-transcription-preview');
        if (previewElement) {
            previewElement.innerHTML = `
                <div style="padding: 12px; background: ${isInterim ? '#f0f0f0' : '#e8f5e9'}; border-radius: 4px; margin: 10px 0;">
                    <strong>📝 Transcription (${isInterim ? 'interim' : 'final'}):</strong>
                    <p style="margin: 8px 0; font-size: 14px;">${this.sanitizeText(text)}</p>
                </div>
            `;

            if (!isInterim) {
                this.processVoiceOrder(text);
            }
        }
    },

    /**
     * Process voice input and extract items
     */
    processVoiceOrder(voiceText) {
        // Use backend processor if available, otherwise fallback to frontend processing
        if (typeof EarlyBirdVoiceProcessor !== 'undefined') {
            // Use backend processor
            const processed = EarlyBirdVoiceProcessor.processTranscription(voiceText, this.state.currentLanguage);
            
            // Convert backend format to frontend format
            const matchedItems = processed.items.map(item => {
                const catalogMatch = this.matchItemToCatalog({
                    name: item.productName,
                    quantity: item.quantity,
                    unit: item.unit
                });
                
                return {
                    original: {
                        name: item.productName,
                        quantity: item.quantity,
                        unit: item.unit
                    },
                    matched: catalogMatch?.matched || null,
                    confidence: item.confidence,
                    flagged: item.confidence < 0.7
                };
            });
            
            // Store voice order
            const voiceOrder = {
                id: EarlyBirdUtils.generateId(),
                timestamp: new Date(),
                language: this.state.currentLanguage,
                originalText: voiceText,
                normalizedText: processed.transcription,
                extractedItems: processed.items,
                matchedItems: matchedItems,
                audioClip: null,
                confidence: processed.confidence,
                backendProcessed: true
            };
            
            this.state.voiceOrders.push(voiceOrder);
            this.saveToStorage();
            
            // Show confirmation UI
            this.showConfirmationUI(matchedItems, voiceOrder);
        } else {
            // Fallback to frontend processing
            const normalized = this.normalizeText(voiceText);
            const items = this.extractItemsFromText(normalized);
            const matchedItems = items.map(item => this.matchItemToCatalog(item));
            
            const voiceOrder = {
                id: EarlyBirdUtils.generateId(),
                timestamp: new Date(),
                language: this.state.currentLanguage,
                originalText: voiceText,
                normalizedText: normalized,
                extractedItems: items,
                matchedItems: matchedItems,
                audioClip: null,
                confidence: this.calculateAverageConfidence(matchedItems),
                backendProcessed: false
            };
            
            this.state.voiceOrders.push(voiceOrder);
            this.saveToStorage();
            this.showConfirmationUI(matchedItems, voiceOrder);
        }
    },

    /**
     * Normalize voice text
     */
    normalizeText(text) {
        let normalized = text.toLowerCase().trim();
        
        // Remove extra spaces
        normalized = normalized.replace(/\s+/g, ' ');
        
        // Convert number words to digits
        normalized = this.convertNumberWordsToDigits(normalized);
        
        return normalized;
    },

    /**
     * Convert number words to digits
     */
    convertNumberWordsToDigits(text) {
        let result = text;
        
        for (const [word, num] of Object.entries(this.state.quantityPhrases)) {
            const regex = new RegExp('\\b' + word + '\\b', 'gi');
            result = result.replace(regex, num.toString());
        }
        
        return result;
    },

    /**
     * Extract items from normalized text using simple NLP
     */
    extractItemsFromText(text) {
        const items = [];
        
        // Pattern: [quantity] [unit] [product name]
        // Example: "5 kg rice", "दो लीटर दूध"
        
        const patterns = [
            /(\d+\.?\d*)\s*(kg|किलो|g|लीटर|L|ml|litre|liter)\s+([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+)/gi,
            /([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+)\s+(\d+\.?\d*)\s*(kg|किलो|g|लीटर|L|ml)/gi,
            /(\d+\.?\d*)\s+([a-zA-Z\u0600-\u06FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+)/gi
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                items.push({
                    quantity: match[1] || match[2] || '1',
                    unit: match[2] || match[3] || 'unit',
                    name: match[3] || match[1],
                    confidence: 0.85
                });
            }
        }
        
        return items;
    },

    /**
     * Match extracted item to catalog
     */
    matchItemToCatalog(item) {
        const searchTerm = item.name.toLowerCase();
        
        // Find best match in catalog
        const matches = this.state.mockCatalog.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.aliases.some(alias => alias.toLowerCase().includes(searchTerm))
        );
        
        if (matches.length > 0) {
            const bestMatch = matches[0];
            const confidence = this.calculateMatchConfidence(searchTerm, bestMatch);
            
            return {
                original: item,
                matched: {
                    id: bestMatch.id,
                    name: bestMatch.name,
                    quantity: this.parseQuantity(item.quantity, item.unit),
                    unit: this.normalizeUnit(item.unit),
                    price: bestMatch.price,
                    pricePerUnit: bestMatch.pricePerUnit
                },
                confidence: confidence,
                flagged: confidence < this.state.confidenceThreshold
            };
        }
        
        return {
            original: item,
            matched: null,
            confidence: 0,
            flagged: true,
            error: 'Product not found in catalog'
        };
    },

    /**
     * Calculate match confidence score
     */
    calculateMatchConfidence(searchTerm, catalogItem) {
        let score = 1.0;
        
        // Exact match
        if (catalogItem.name.toLowerCase() === searchTerm) {
            return 0.99;
        }
        
        // Partial match
        if (catalogItem.name.toLowerCase().includes(searchTerm)) {
            score *= 0.90;
        }
        
        // Alias match
        if (catalogItem.aliases.some(a => a.toLowerCase().includes(searchTerm))) {
            score *= 0.85;
        }
        
        // Levenshtein distance-based similarity
        const similarity = this.calculateStringSimilarity(searchTerm, catalogItem.name.toLowerCase());
        score *= similarity;
        
        return Math.min(0.99, Math.max(0.1, score));
    },

    /**
     * Calculate string similarity (Levenshtein-based)
     */
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.calculateLevenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },

    /**
     * Calculate Levenshtein distance
     */
    calculateLevenshteinDistance(s1, s2) {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    },

    /**
     * Parse quantity with unit normalization
     */
    parseQuantity(quantity, unit) {
        const num = parseFloat(quantity);
        
        // Convert to base units (kg, L)
        const normalizedUnit = this.normalizeUnit(unit);
        
        if (normalizedUnit === 'g') return (num / 1000) + ' kg';
        if (normalizedUnit === 'ml') return (num / 1000) + ' L';
        
        return num + ' ' + normalizedUnit;
    },

    /**
     * Normalize unit names
     */
    normalizeUnit(unit) {
        const normalized = unit.toLowerCase().trim();
        
        if (normalized.includes('किलो') || normalized === 'kg') return 'kg';
        if (normalized.includes('ग्राम') || normalized === 'g') return 'g';
        if (normalized.includes('लीटर') || normalized.includes('liter') || normalized === 'l') return 'L';
        if (normalized.includes('मिली') || normalized === 'ml') return 'ml';
        
        return normalized;
    },

    /**
     * Calculate average confidence of matched items
     */
    calculateAverageConfidence(matchedItems) {
        if (matchedItems.length === 0) return 0;
        
        const total = matchedItems.reduce((sum, item) => sum + item.confidence, 0);
        return total / matchedItems.length;
    },

    /**
     * Show confirmation UI for matched items
     */
    showConfirmationUI(matchedItems, voiceOrder) {
        let html = `
            <div id="voice-confirmation" style="padding: 15px; background: white; border: 2px solid #4CAF50; border-radius: 8px; margin: 10px 0;">
                <h4 style="color: #2196F3; margin-top: 0;">✅ Voice Order Extracted</h4>
                <p style="color: #666; font-size: 13px;">Review extracted items. Edit if needed or confirm to add to cart.</p>
                
                <div style="max-height: 300px; overflow-y: auto; margin: 10px 0;">
        `;
        
        matchedItems.forEach((item, index) => {
            const statusColor = item.flagged ? '#ff9800' : '#4CAF50';
            const statusIcon = item.flagged ? '⚠' : '✓';
            
            html += `
                <div style="background: #f5f5f5; padding: 10px; margin: 8px 0; border-left: 4px solid ${statusColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <strong style="color: #333;">${statusIcon} ${item.matched ? item.matched.name : item.original.name}</strong>
                        <span style="color: #999; font-size: 12px;">${(item.confidence * 100).toFixed(0)}% match</span>
                    </div>
                    <div style="color: #666; font-size: 13px; margin-bottom: 4px;">
                        Quantity: <strong>${item.matched ? item.matched.quantity : item.original.quantity} ${item.matched ? item.matched.unit : item.original.unit}</strong>
                    </div>
                    ${item.matched ? `
                        <div style="color: #2196F3; font-size: 13px;">
                            ₹${item.matched.price.toFixed(2)} | ${item.matched.pricePerUnit}/unit
                        </div>
                    ` : `
                        <div style="color: #f44336; font-size: 12px;">
                            ⚠️ Product not found - manual verification needed
                        </div>
                    `}
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button onclick="EarlyBirdVoice.editItems('${voiceOrder.id}')" 
                        style="flex: 1; padding: 10px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✏️ Edit Items
                    </button>
                    <button onclick="EarlyBirdVoice.confirmVoiceOrder('${voiceOrder.id}')" 
                        style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✓ Confirm All
                    </button>
                    <button onclick="EarlyBirdVoice.discardVoiceOrder('${voiceOrder.id}')" 
                        style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✗ Discard
                    </button>
                </div>
            </div>
        `;
        
        const container = document.getElementById('voice-results-container') || 
                         document.querySelector('main') ||
                         document.body;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        container.insertBefore(tempDiv, container.firstChild);
    },

    /**
     * Edit matched items
     */
    editItems(voiceOrderId) {
        const voiceOrder = this.state.voiceOrders.find(v => v.id === voiceOrderId);
        if (!voiceOrder) return;
        
        let html = `<div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin: 10px 0;">
            <h4 style="color: #2196F3; margin-top: 0;">Edit Voice Order Items</h4>
            <div id="edit-items-form" style="display: flex; flex-direction: column; gap: 10px;">
        `;
        
        voiceOrder.matchedItems.forEach((item, index) => {
            html += `
                <div style="background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Product Name:</label>
                    <input type="text" id="product-name-${index}" value="${item.matched ? item.matched.name : item.original.name}" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; box-sizing: border-box;">
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Quantity:</label>
                            <input type="number" id="quantity-${index}" value="${parseFloat(item.matched ? item.matched.quantity : item.original.quantity)}" 
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Unit:</label>
                            <input type="text" id="unit-${index}" value="${item.matched ? item.matched.unit : item.original.unit}" 
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="EarlyBirdVoice.saveEditedItems('${voiceOrderId}')" 
                        style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✓ Save Edits
                    </button>
                    <button onclick="document.getElementById('voice-edit-${voiceOrderId}').remove()" 
                        style="flex: 1; padding: 10px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        const editContainer = document.createElement('div');
        editContainer.id = `voice-edit-${voiceOrderId}`;
        editContainer.innerHTML = html;
        document.body.appendChild(editContainer);
    },

    /**
     * Save edited items
     */
    saveEditedItems(voiceOrderId) {
        const voiceOrder = this.state.voiceOrders.find(v => v.id === voiceOrderId);
        if (!voiceOrder) return;
        
        voiceOrder.matchedItems.forEach((item, index) => {
            const newName = document.getElementById(`product-name-${index}`).value;
            const newQuantity = document.getElementById(`quantity-${index}`).value;
            const newUnit = document.getElementById(`unit-${index}`).value;
            
            item.matched.name = newName;
            item.matched.quantity = newQuantity + ' ' + newUnit;
            item.matched.unit = newUnit;
        });
        
        this.saveToStorage();
        document.getElementById(`voice-edit-${voiceOrderId}`).remove();
        EarlyBirdUtils.showToast('✅ Items updated', 'success');
    },

    /**
     * Confirm voice order and create order
     */
    confirmVoiceOrder(voiceOrderId) {
        const voiceOrder = this.state.voiceOrders.find(v => v.id === voiceOrderId);
        if (!voiceOrder) return;
        
        // Get current customer ID (from auth, context, or support portal selection)
        let customerId = this.state.selectedCustomerId || 'CUST_001'; // Default
        
        // Try to get from support portal customer selection
        if (!customerId || customerId === 'CUST_001') {
            const supportCustomerSelect = document.getElementById('supportCustomerSelect');
            if (supportCustomerSelect && supportCustomerSelect.value) {
                customerId = supportCustomerSelect.value;
            }
        }
        
        // Try auth if still default
        if (customerId === 'CUST_001' && typeof EarlyBirdAuth !== 'undefined') {
            const currentUser = EarlyBirdAuth.getCurrentUser();
            if (currentUser && currentUser.role === 'customer') {
                customerId = currentUser.userId || currentUser.id;
            }
        }
        
        // Use backend processor to create order if available
        if (typeof EarlyBirdVoiceProcessor !== 'undefined' && voiceOrder.backendProcessed && voiceOrder.extractedItems) {
            try {
                const order = EarlyBirdVoiceProcessor.createOrderFromVoice(
                    customerId,
                    voiceOrder.extractedItems,
                    {
                        customerPhone: '',
                        deliveryDate: EarlyBirdUtils.getDateString(new Date()),
                        deliverySlot: 'am',
                        paymentMethod: 'wallet'
                    }
                );
                
                if (order) {
                    EarlyBirdUtils.showToast(`✅ Order created from voice! Order ID: ${order.id}`, 'success');
                    
                    // Log to calendar
                    if (typeof EarlyBirdCalendar !== 'undefined') {
                        EarlyBirdCalendar.addEvent({
                            type: 'VOICE_ORDER_PROCESSED',
                            customerId: customerId,
                            date: order.deliveryDate,
                            orderId: order.id,
                            description: `Voice order: ${voiceOrder.matchedItems.length} items`,
                            confidence: (voiceOrder.confidence * 100).toFixed(1) + '%'
                        });
                    }
                    
                    // Clean up UI
                    document.getElementById('voice-confirmation')?.remove();
                    this.state.voiceOrders = this.state.voiceOrders.filter(v => v.id !== voiceOrderId);
                    this.saveToStorage();
                    return;
                }
            } catch (error) {
                console.error('Error creating order from voice:', error);
                EarlyBirdUtils.showToast('Error creating order. Using fallback method.', 'warning');
            }
        }
        
        // Fallback: Add items to cart manually
        if (typeof EarlyBirdOrders !== 'undefined') {
            voiceOrder.matchedItems.forEach(item => {
                if (item.matched && item.matched.id) {
                    EarlyBirdOrders.addToCart(item.matched.id, item.matched.quantity || 1);
                }
            });
            
            EarlyBirdUtils.showToast('✅ Voice order added to cart!', 'success');
        }
        
        // Log to calendar
        if (typeof EarlyBirdCalendar !== 'undefined') {
            EarlyBirdCalendar.addEvent({
                type: 'VOICE_ORDER_PROCESSED',
                customerId: customerId,
                date: EarlyBirdUtils.getDateString(new Date()),
                description: `Voice order: ${voiceOrder.matchedItems.length} items`,
                confidence: (voiceOrder.confidence * 100).toFixed(1) + '%',
                voiceOrderId: voiceOrderId
            });
        }
        
        // Clean up UI
        document.getElementById('voice-confirmation')?.remove();
        
        // Remove from pending
        this.state.voiceOrders = this.state.voiceOrders.filter(v => v.id !== voiceOrderId);
        this.saveToStorage();
    },

    /**
     * Discard voice order
     */
    discardVoiceOrder(voiceOrderId) {
        this.state.voiceOrders = this.state.voiceOrders.filter(v => v.id !== voiceOrderId);
        this.saveToStorage();
        document.getElementById('voice-confirmation')?.remove();
        EarlyBirdUtils.showToast('🗑️ Voice order discarded', 'info');
    },

    /**
     * Generate mock product catalog
     */
    generateMockCatalog() {
        return [
            { id: 'rice_1', name: 'Rice', aliases: ['चावल', 'അരി', 'అరిసి', 'চাল'], price: 1650, pricePerUnit: 66, category: 'grains' },
            { id: 'atta_1', name: 'Atta', aliases: ['आटा', 'மைதா', 'రొట్టె', 'ময়দা'], price: 450, pricePerUnit: 45, category: 'grains' },
            { id: 'milk_1', name: 'Milk', aliases: ['दूध', 'பால்', 'మెలుకు', 'দুধ'], price: 100, pricePerUnit: 50, category: 'dairy' },
            { id: 'sugar_1', name: 'Sugar', aliases: ['चीनी', 'சர்க்கரை', 'చక్కెర', 'চিনি'], price: 225, pricePerUnit: 45, category: 'pantry' },
            { id: 'oil_1', name: 'Oil', aliases: ['तेल', 'எண்ணெய்', 'నూనె', 'তেল'], price: 890, pricePerUnit: 178, category: 'pantry' },
            { id: 'dal_1', name: 'Toor Dal', aliases: ['तूर दाल', 'துவரம் பருப்பு', 'టూరు దాల్', 'তুর ডাল'], price: 320, pricePerUnit: 160, category: 'pulses' },
            { id: 'turmeric_1', name: 'Turmeric', aliases: ['हल्दी', 'மஞ்சள்', 'నల్లెలు', 'হলুদ'], price: 150, pricePerUnit: 300, category: 'spices' }
        ];
    },

    /**
     * Sanitize text for display
     */
    sanitizeText(text) {
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    /**
     * Save state to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('earlybird_voice_orders', JSON.stringify(this.state.voiceOrders));
            localStorage.setItem('earlybird_transcription_history', JSON.stringify(this.state.transcriptionHistory));
        } catch (e) {
            console.error('Error saving voice state:', e);
        }
    },

    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        try {
            this.state.voiceOrders = JSON.parse(localStorage.getItem('earlybird_voice_orders') || '[]');
            this.state.transcriptionHistory = JSON.parse(localStorage.getItem('earlybird_transcription_history') || '[]');
        } catch (e) {
            console.error('Error loading voice state:', e);
        }
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EarlyBirdVoice.init());
} else {
    EarlyBirdVoice.init();
}
