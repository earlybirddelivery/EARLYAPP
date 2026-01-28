// ============================================
// EarlyBird OCR Processing Backend
// Mock OCR processor for image-to-order conversion
// ============================================

const EarlyBirdOCRProcessor = {
    
    // Product catalog for matching
    productCatalog: [],
    
    // Mock OCR patterns (simulating handwriting recognition)
    handwritingPatterns: {
        // Common product names in various scripts
        products: {
            // Hindi/English mixed
            'चावल|rice': 'rice',
            'चीनी|sugar': 'sugar',
            'तेल|oil': 'oil',
            'दाल|dal': 'dal',
            'आटा|atta': 'atta',
            'दूध|milk': 'milk',
            // Tamil
            'அரிசி': 'rice',
            'சர்க்கரை': 'sugar',
            'எண்ணெய்': 'oil',
            // Telugu
            'బియ్యం': 'rice',
            'చక్కెర': 'sugar',
            'నూనె': 'oil'
        },
        
        // Quantity patterns
        quantities: {
            '25': 25, '10': 10, '5': 5, '2': 2, '1': 1,
            '२५': 25, '१०': 10, '५': 5, '२': 2, '१': 1,
            '25kg': 25, '10kg': 10, '5kg': 5, '2kg': 2, '1kg': 1,
            '25 किलो': 25, '10 किलो': 10, '5 किलो': 5
        },
        
        // Unit patterns
        units: {
            'kg|किलो|கிலோ|కిలో': 'kg',
            'g|ग्राम|கிராம்|గ్రాం': 'g',
            'L|लीटर|லிட்டர்|లీటర్': 'L',
            'ml|मिली|மில்லி|మిల్లీ': 'ml',
            'pack|पैकेट|பேக்கெட்|ప్యాకెట్': 'pack'
        }
    },
    
    /**
     * Initialize processor
     */
    init() {
        // Load product catalog from utils
        if (typeof EarlyBirdUtils !== 'undefined') {
            this.productCatalog = EarlyBirdUtils.getMockProducts();
        }
        console.log('✅ EarlyBirdOCRProcessor initialized');
    },
    
    /**
     * Process image and extract text (mock OCR)
     * @param {File|string} imageFile - Image file or base64 data
     * @returns {Promise<object>} Extracted text and parsed items
     */
    async processImage(imageFile) {
        console.log('📸 Processing image with OCR...');
        
        // Simulate OCR processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock OCR: Simulate text extraction
        // In real implementation, this would call Google Vision API or Tesseract
        const mockExtractedText = this.simulateOCRExtraction(imageFile);
        
        // Parse extracted text
        const parsedItems = this.parseExtractedText(mockExtractedText);
        
        return {
            extractedText: mockExtractedText,
            items: parsedItems,
            totalItems: parsedItems.length,
            confidence: this.calculateOverallConfidence(parsedItems),
            processedAt: new Date().toISOString()
        };
    },
    
    /**
     * Simulate OCR text extraction (mock)
     * In production, this would use actual OCR service
     */
    simulateOCRExtraction(imageFile) {
        // Mock extracted text - simulating common grocery list formats
        const mockTexts = [
            'Rice - 25kg\nSugar - 10kg\nOil - 5L\nDal - 2kg\nAtta - 10kg',
            'चावल - 25 किलो\nचीनी - 10 किलो\nतेल - 5 लीटर\nदाल - 2 किलो',
            'Rice 25kg\nSugar 10kg\nOil 5L\nMilk 2L',
            '25kg Rice\n10kg Sugar\n5L Oil\n2kg Dal\n10kg Atta',
            'Rice: 25kg\nSugar: 10kg\nOil: 5L\nDal: 2kg'
        ];
        
        // Return random mock text (in production, this would be actual OCR result)
        const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        
        console.log('📝 Mock OCR extracted text:', randomText);
        return randomText;
    },
    
    /**
     * Parse extracted text into structured items
     * @param {string} text - OCR extracted text
     * @returns {array} Parsed items
     */
    parseExtractedText(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const parsedItems = [];
        
        lines.forEach((line, index) => {
            const parsed = this.parseLine(line);
            if (parsed) {
                parsedItems.push({
                    ...parsed,
                    originalLine: line,
                    lineNumber: index + 1
                });
            }
        });
        
        return parsedItems;
    },
    
    /**
     * Parse a single line of text
     * @param {string} line - Single line (e.g., "Rice - 25kg" or "चावल - 25 किलो")
     * @returns {object} Parsed item or null
     */
    parseLine(line) {
        line = line.trim();
        if (!line || line.length < 2) return null;
        
        // Pattern 1: "Product - Quantity Unit" or "Product: Quantity Unit"
        let match = line.match(/^(.+?)\s*[-:]\s*(\d+(?:\.\d+)?)\s*(kg|g|L|ml|pack|किलो|लीटर|ग्राम)?/i);
        
        // Pattern 2: "Quantity Unit Product"
        if (!match) {
            match = line.match(/^(\d+(?:\.\d+)?)\s*(kg|g|L|ml|pack|किलो|लीटर|ग्राम)?\s*(.+)$/i);
            if (match) {
                // Rearrange: product is last, quantity is first
                match = [match[0], match[3], match[1], match[2]];
            }
        }
        
        // Pattern 3: "Product Quantity Unit"
        if (!match) {
            match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|L|ml|pack|किलो|लीटर|ग्राम)?$/i);
        }
        
        let productName = '';
        let quantity = 1;
        let unit = 'qty';
        
        if (match) {
            productName = match[1]?.trim() || '';
            quantity = parseFloat(match[2]) || 1;
            unit = this.normalizeUnit(match[3] || 'qty');
        } else {
            // Fallback: try to extract product name and quantity separately
            const parts = line.split(/\s+/);
            const numericParts = parts.filter(p => /^\d+/.test(p));
            const textParts = parts.filter(p => !/^\d+/.test(p));
            
            if (numericParts.length > 0) {
                quantity = parseFloat(numericParts[0]);
            }
            
            // Try to find unit
            const unitMatch = line.match(/(kg|g|L|ml|pack|किलो|लीटर|ग्राम)/i);
            if (unitMatch) {
                unit = this.normalizeUnit(unitMatch[1]);
            }
            
            // Product name is everything else
            productName = textParts
                .filter(p => !/(kg|g|L|ml|pack|किलो|लीटर|ग्राम)/i.test(p))
                .join(' ')
                .replace(/[-:]/g, '')
                .trim();
        }
        
        if (!productName || productName.length < 2) {
            return null;
        }
        
        // Match product to catalog
        const catalogMatch = this.matchToCatalog(productName);
        let productId = null;
        let confidence = 0.7;
        
        if (catalogMatch) {
            productId = catalogMatch.id;
            productName = catalogMatch.name;
            confidence = catalogMatch.confidence;
        } else {
            // Lower confidence for unmatched products
            confidence = 0.5;
        }
        
        return {
            productName: productName,
            productId: productId,
            quantity: quantity,
            unit: unit,
            confidence: confidence,
            originalLine: line
        };
    },
    
    /**
     * Match product name to catalog
     */
    matchToCatalog(productName) {
        if (!this.productCatalog || this.productCatalog.length === 0) {
            return null;
        }
        
        const normalized = productName.toLowerCase().trim();
        
        // Exact match
        let match = this.productCatalog.find(p => 
            p.name.toLowerCase() === normalized
        );
        if (match) {
            return { id: match.id, name: match.name, confidence: 0.95 };
        }
        
        // Partial match
        match = this.productCatalog.find(p => {
            const catalogName = p.name.toLowerCase();
            return normalized.includes(catalogName) || catalogName.includes(normalized);
        });
        if (match) {
            return { id: match.id, name: match.name, confidence: 0.80 };
        }
        
        // Keyword match
        const keywords = normalized.split(/\s+/);
        match = this.productCatalog.find(p => {
            const catalogName = p.name.toLowerCase();
            return keywords.some(keyword => 
                catalogName.includes(keyword) && keyword.length > 2
            );
        });
        if (match) {
            return { id: match.id, name: match.name, confidence: 0.65 };
        }
        
        return null;
    },
    
    /**
     * Normalize unit
     */
    normalizeUnit(unit) {
        if (!unit) return 'qty';
        
        const normalized = unit.toLowerCase();
        if (['kg', 'kilogram', 'kilo', 'किलो', 'கிலோ', 'కిలో'].includes(normalized)) return 'kg';
        if (['g', 'gram', 'grams', 'ग्राम', 'கிராம்', 'గ్రాం'].includes(normalized)) return 'g';
        if (['l', 'liter', 'litre', 'liters', 'litres', 'लीटर', 'லிட்டர்', 'లీటర్'].includes(normalized)) return 'L';
        if (['ml', 'milliliter', 'millilitre', 'मिली', 'மில்லி', 'మిల్లీ'].includes(normalized)) return 'ml';
        if (['pack', 'packet', 'pkt', 'पैकेट', 'பேக்கெட்', 'ప్యాకెట్'].includes(normalized)) return 'pack';
        return 'qty';
    },
    
    /**
     * Calculate overall confidence
     */
    calculateOverallConfidence(items) {
        if (items.length === 0) return 0;
        
        const totalConfidence = items.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
        return Math.round((totalConfidence / items.length) * 100) / 100;
    },
    
    /**
     * Create order from parsed OCR items
     * @param {string} customerId - Customer ID
     * @param {array} parsedItems - Parsed items from processImage
     * @param {object} orderData - Additional order data
     * @returns {object} Created order
     */
    createOrderFromOCR(customerId, parsedItems, orderData = {}) {
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
                price: catalogProduct?.price || 100,
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
                notes: `OCR order - Confidence: ${this.calculateOverallConfidence(parsedItems)}`
            });
            
            return order;
        }
        
        return null;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdOCRProcessor.init();
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarlyBirdOCRProcessor;
}
