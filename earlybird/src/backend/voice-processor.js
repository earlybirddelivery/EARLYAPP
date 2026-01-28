// ============================================
// EarlyBird Voice Order Processing Backend
// Mock NLP processor for voice-to-order conversion
// ============================================

const EarlyBirdVoiceProcessor = {
    
    // Product catalog for matching
    productCatalog: [],
    
    // Regional language patterns
    quantityPatterns: {
        // Hindi
        'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
        'एक किलो': 1, 'दो किलो': 2, 'तीन किलो': 3, 'पांच किलो': 5,
        'एक लीटर': 1, 'दो लीटर': 2, 'तीन लीटर': 3,
        // Tamil
        'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5,
        // Telugu
        'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
        // English
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'half': 0.5, 'quarter': 0.25
    },
    
    unitPatterns: {
        // Hindi
        'किलो': 'kg', 'किग्रा': 'kg', 'ग्राम': 'g', 'लीटर': 'L', 'मिली': 'ml', 'पैकेट': 'pack',
        // Tamil
        'கிலோ': 'kg', 'கிராம்': 'g', 'லிட்டர்': 'L',
        // Telugu
        'కిలో': 'kg', 'గ్రాం': 'g', 'లీటర్': 'L',
        // English
        'kilo': 'kg', 'kilogram': 'kg', 'gram': 'g', 'liter': 'L', 'litre': 'L', 'ml': 'ml', 'pack': 'pack'
    },
    
    productKeywords: {
        // Hindi
        'चावल': 'rice', 'चीनी': 'sugar', 'तेल': 'oil', 'दाल': 'dal', 'आटा': 'atta', 'दूध': 'milk',
        'हल्दी': 'turmeric', 'मिर्च': 'chilli', 'नमक': 'salt', 'मसाला': 'masala',
        // Tamil
        'அரிசி': 'rice', 'சர்க்கரை': 'sugar', 'எண்ணெய்': 'oil', 'பருப்பு': 'dal',
        // Telugu
        'బియ్యం': 'rice', 'చక్కెర': 'sugar', 'నూనె': 'oil', 'పప్పు': 'dal',
        // English
        'rice': 'rice', 'sugar': 'sugar', 'oil': 'oil', 'dal': 'dal', 'atta': 'atta', 'milk': 'milk'
    },
    
    /**
     * Initialize processor
     */
    init() {
        // Load product catalog from utils
        if (typeof EarlyBirdUtils !== 'undefined') {
            this.productCatalog = EarlyBirdUtils.getMockProducts();
        }
        console.log('✅ EarlyBirdVoiceProcessor initialized');
    },
    
    /**
     * Process voice transcription and extract products
     * @param {string} transcription - Raw transcription text
     * @param {string} language - Language code (hi-IN, ta-IN, te-IN, en-IN)
     * @returns {object} Parsed products with confidence scores
     */
    processTranscription(transcription, language = 'en-IN') {
        console.log(`🎤 Processing transcription (${language}):`, transcription);
        
        // Normalize transcription
        const normalized = transcription.toLowerCase().trim();
        
        // Split into potential items (by commas, "and", "aur", etc.)
        const itemDelimiters = [',', ' और ', ' aur ', ' and ', ' तथा ', ' तो ', ' then '];
        let items = [normalized];
        
        itemDelimiters.forEach(delimiter => {
            const newItems = [];
            items.forEach(item => {
                newItems.push(...item.split(delimiter));
            });
            items = newItems;
        });
        
        // Process each item
        const parsedItems = [];
        
        items.forEach((item, index) => {
            item = item.trim();
            if (!item || item.length < 2) return;
            
            const parsed = this.parseItem(item, language);
            if (parsed) {
                parsedItems.push({
                    ...parsed,
                    originalText: item,
                    itemIndex: index
                });
            }
        });
        
        return {
            transcription: transcription,
            language: language,
            items: parsedItems,
            totalItems: parsedItems.length,
            confidence: this.calculateOverallConfidence(parsedItems),
            processedAt: new Date().toISOString()
        };
    },
    
    /**
     * Parse individual item from text
     * @param {string} text - Item text (e.g., "पांच किलो चावल")
     * @param {string} language - Language code
     * @returns {object} Parsed item or null
     */
    parseItem(text, language) {
        text = text.toLowerCase().trim();
        
        // Extract quantity
        let quantity = 1;
        let quantityText = '';
        let unit = 'qty';
        
        // Try to find quantity patterns
        for (const [pattern, value] of Object.entries(this.quantityPatterns)) {
            if (text.includes(pattern.toLowerCase())) {
                quantity = value;
                quantityText = pattern;
                break;
            }
        }
        
        // Try numeric patterns
        const numericMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|L|ml|pack|kilo|gram|liter|litre)?/i);
        if (numericMatch) {
            quantity = parseFloat(numericMatch[1]);
            if (numericMatch[2]) {
                unit = this.normalizeUnit(numericMatch[2]);
            }
        }
        
        // Extract unit if not found
        if (unit === 'qty') {
            for (const [pattern, unitValue] of Object.entries(this.unitPatterns)) {
                if (text.includes(pattern.toLowerCase())) {
                    unit = unitValue;
                    break;
                }
            }
        }
        
        // Extract product name
        let productName = '';
        let productId = null;
        let confidence = 0.7;
        
        // Try keyword matching
        for (const [keyword, englishName] of Object.entries(this.productKeywords)) {
            if (text.includes(keyword.toLowerCase())) {
                productName = englishName;
                break;
            }
        }
        
        // Try catalog matching
        if (!productName) {
            // Remove quantity and unit from text to get product name
            let cleanText = text
                .replace(/\d+/g, '')
                .replace(/kg|g|L|ml|pack|kilo|gram|liter|litre/gi, '')
                .replace(/एक|दो|तीन|चार|पांच|किलो|लीटर/gi, '')
                .trim();
            
            // Match against catalog
            const matched = this.matchToCatalog(cleanText);
            if (matched) {
                productName = matched.name;
                productId = matched.id;
                confidence = matched.confidence;
            } else {
                // Use cleaned text as product name
                productName = cleanText;
                confidence = 0.5; // Lower confidence for unmatched
            }
        } else {
            // Find in catalog
            const catalogMatch = this.productCatalog.find(p => 
                p.name.toLowerCase().includes(productName) || 
                productName.includes(p.name.toLowerCase())
            );
            if (catalogMatch) {
                productId = catalogMatch.id;
                productName = catalogMatch.name;
                confidence = 0.85;
            }
        }
        
        if (!productName || productName.length < 2) {
            return null; // Could not parse
        }
        
        return {
            productName: productName,
            productId: productId,
            quantity: quantity,
            unit: unit,
            confidence: confidence,
            originalText: text
        };
    },
    
    /**
     * Match text to product catalog
     * @param {string} text - Product text
     * @returns {object} Matched product or null
     */
    matchToCatalog(text) {
        if (!this.productCatalog || this.productCatalog.length === 0) {
            return null;
        }
        
        const normalized = text.toLowerCase().trim();
        
        // Exact match
        let match = this.productCatalog.find(p => 
            p.name.toLowerCase() === normalized
        );
        if (match) {
            return { id: match.id, name: match.name, confidence: 0.95 };
        }
        
        // Partial match
        match = this.productCatalog.find(p => 
            normalized.includes(p.name.toLowerCase()) || 
            p.name.toLowerCase().includes(normalized)
        );
        if (match) {
            return { id: match.id, name: match.name, confidence: 0.75 };
        }
        
        // Fuzzy match (contains keywords)
        const keywords = normalized.split(/\s+/);
        match = this.productCatalog.find(p => {
            const productName = p.name.toLowerCase();
            return keywords.some(keyword => productName.includes(keyword));
        });
        if (match) {
            return { id: match.id, name: match.name, confidence: 0.60 };
        }
        
        return null;
    },
    
    /**
     * Normalize unit
     */
    normalizeUnit(unit) {
        const normalized = unit.toLowerCase();
        if (['kg', 'kilogram', 'kilo'].includes(normalized)) return 'kg';
        if (['g', 'gram', 'grams'].includes(normalized)) return 'g';
        if (['l', 'liter', 'litre', 'liters', 'litres'].includes(normalized)) return 'L';
        if (['ml', 'milliliter', 'millilitre'].includes(normalized)) return 'ml';
        if (['pack', 'packet', 'pkt'].includes(normalized)) return 'pack';
        return 'qty';
    },
    
    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(items) {
        if (items.length === 0) return 0;
        
        const totalConfidence = items.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
        return Math.round((totalConfidence / items.length) * 100) / 100;
    },
    
    /**
     * Create order from parsed voice items
     * @param {string} customerId - Customer ID
     * @param {array} parsedItems - Parsed items from processTranscription
     * @param {object} orderData - Additional order data (date, slot, etc.)
     * @returns {object} Created order
     */
    createOrderFromVoice(customerId, parsedItems, orderData = {}) {
        if (!parsedItems || parsedItems.length === 0) {
            throw new Error('No items to create order from');
        }
        
        // Convert parsed items to order items
        const orderItems = parsedItems.map(item => {
            const catalogProduct = this.productCatalog.find(p => 
                p.id === item.productId || 
                p.name.toLowerCase().includes(item.productName.toLowerCase())
            );
            
            return {
                productId: item.productId || catalogProduct?.id || EarlyBirdUtils.generateId(),
                productName: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                price: catalogProduct?.price || 100, // Default price if not found
                confidence: item.confidence
            };
        });
        
        // Calculate total
        const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create order using EarlyBirdOrders
        if (typeof EarlyBirdOrders !== 'undefined') {
            // Add items to cart
            orderItems.forEach(item => {
                EarlyBirdOrders.addToCart(item.productId, item.quantity);
            });
            
            // Submit order
            const order = EarlyBirdOrders.submitOrder({
                customerId: customerId,
                customerPhone: orderData.customerPhone || '',
                deliveryDate: orderData.deliveryDate || EarlyBirdUtils.getDateString(new Date()),
                deliverySlot: orderData.deliverySlot || 'am',
                paymentMethod: orderData.paymentMethod || 'wallet',
                notes: `Voice order - Confidence: ${this.calculateOverallConfidence(parsedItems)}`
            });
            
            return order;
        }
        
        return null;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdVoiceProcessor.init();
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarlyBirdVoiceProcessor;
}
