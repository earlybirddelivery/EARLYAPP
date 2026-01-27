/**
 * EarlyBird Handwritten List Image OCR System
 * Features: Image upload, handwriting recognition, confidence scoring, ML feedback loop
 * Supports: Hindi, English, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati
 */

const EarlyBirdOCR = {
    // State management
    state: {
        ocrJobs: [],
        extractedItems: [],
        confidenceThreshold: 0.75,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        mlFeedback: [],
        accuracy: { totalItems: 0, correctItems: 0 },
        mockCatalog: []
    },

    /**
     * Initialize OCR system
     */
    init() {
        this.loadFromStorage();
        this.state.mockCatalog = this.generateMockCatalog();
        this.setupImageUploadHandler();
    },

    /**
     * Setup image upload handler
     */
    setupImageUploadHandler() {
        const uploadInput = document.getElementById('ocr-image-upload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
    },

    /**
     * Handle image upload
     */
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this.state.supportedFormats.includes(file.type)) {
            EarlyBirdUtils.showToast('❌ Unsupported format. Use JPEG, PNG, or WebP', 'error');
            return;
        }

        if (file.size > this.state.maxImageSize) {
            EarlyBirdUtils.showToast('❌ Image too large (max 5MB)', 'error');
            return;
        }

        // Read and process image
        const reader = new FileReader();
        reader.onload = (e) => this.processImage(e.target.result, file.name);
        reader.readAsDataURL(file);
    },

    /**
     * Process uploaded image
     */
    async processImage(imageData, fileName) {
        EarlyBirdUtils.showToast('🔄 Processing image...', 'info');

        const ocrJob = {
            id: EarlyBirdUtils.generateId(),
            fileName: fileName,
            imageData: imageData,
            uploadTime: new Date(),
            status: 'processing',
            rawOCRText: '',
            extractedItems: [],
            confidence: 0,
            feedback: null,
            backendProcessed: false
        };

        this.state.ocrJobs.push(ocrJob);

        // Use backend processor if available
        if (typeof EarlyBirdOCRProcessor !== 'undefined') {
            try {
                const processed = await EarlyBirdOCRProcessor.processImage(imageData);
                
                ocrJob.rawOCRText = processed.extractedText;
                ocrJob.status = 'processing_items';
                
                // Convert backend format to frontend format
                const matchedItems = processed.items.map(item => {
                    const catalogMatch = this.matchOCRItemToCatalog({
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
                
                ocrJob.extractedItems = matchedItems;
                ocrJob.confidence = processed.confidence;
                ocrJob.status = 'completed';
                ocrJob.backendProcessed = true;
                ocrJob.backendItems = processed.items; // Store for order creation
                
                this.saveToStorage();
                this.showOCRConfirmationUI(ocrJob.id);
                EarlyBirdUtils.showToast('✅ Image processed successfully', 'success');
            } catch (error) {
                console.error('Error processing image with backend:', error);
                // Fallback to frontend processing
                setTimeout(() => this.performOCR(ocrJob.id), 500);
            }
        } else {
            // Fallback to frontend processing
            setTimeout(() => this.performOCR(ocrJob.id), 500);
        }
    },

    /**
     * Perform OCR on image
     */
    performOCR(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        // Simulate OCR result (in production, this would call Google Cloud Vision API)
        const simulatedOCRResult = this.simulateOCRExtraction(job.imageData);

        job.rawOCRText = simulatedOCRResult.text;
        job.status = 'processing_items';

        // Extract structured items from OCR text
        const items = this.extractItemsFromOCRText(simulatedOCRResult.text);

        // Match items to catalog
        const matchedItems = items.map(item => this.matchOCRItemToCatalog(item));

        job.extractedItems = matchedItems;
        job.confidence = this.calculateAverageConfidence(matchedItems);
        job.status = 'completed';

        this.saveToStorage();
        this.showOCRConfirmationUI(ocrJobId);

        EarlyBirdUtils.showToast('✅ Image processed successfully', 'success');
    },

    /**
     * Simulate OCR extraction (mock - would use real OCR API)
     */
    simulateOCRExtraction(imageData) {
        // In production, this would call Google Cloud Vision API
        // For now, return realistic mock data
        const mockResults = [
            {
                text: 'Rice - 25kg\nAtta - 10kg\nSugar - 5kg\nOil - 2L\nMilk - 1L\nDal - 2kg',
                language: 'en',
                confidence: 0.92
            },
            {
                text: 'चावल - 25 किलो\nआटा - 10 किलो\nचीनी - 5 किलो\nतेल - 2 लीटर\nदूध - 1 लीटर',
                language: 'hi',
                confidence: 0.88
            },
            {
                text: 'அரிசி - 25 கிலோ\nமாவு - 10 கிலோ\nசர்க்கரை - 5 கிலோ\nஎண்ணெய் - 2 லிட்டர்',
                language: 'ta',
                confidence: 0.85
            }
        ];

        // Return a random mock result
        return mockResults[Math.floor(Math.random() * mockResults.length)];
    },

    /**
     * Extract items from OCR text
     */
    extractItemsFromOCRText(ocrText) {
        const items = [];
        
        // Split by common delimiters
        const lines = ocrText.split(/[\n,;|]/);
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            // Parse line: "Product - Quantity Unit" or "Quantity Unit Product"
            const parsed = this.parseOCRLine(line);
            if (parsed) {
                items.push(parsed);
            }
        });

        return items;
    },

    /**
     * Parse individual OCR line
     */
    parseOCRLine(line) {
        // Pattern: "Product - Quantity Unit" or "Quantity Unit Product"
        
        // Try dash separator first: "Rice - 25kg"
        const dashMatch = /^(.+?)\s*-\s*(\d+\.?\d*)\s*(kg|g|l|ml|litre|liter|किलो|ग्राम|लीटर|मिली|कि.लो|ाम|ीटर)/i.exec(line);
        if (dashMatch) {
            return {
                name: dashMatch[1].trim(),
                quantity: dashMatch[2],
                unit: dashMatch[3],
                confidence: 0.90
            };
        }

        // Try quantity first: "25 kg Rice"
        const quantityFirstMatch = /^(\d+\.?\d*)\s+(kg|g|l|ml|litre|liter|किलो|ग्राम|लीटर|मिली)\s+(.+)$/i.exec(line);
        if (quantityFirstMatch) {
            return {
                name: quantityFirstMatch[3].trim(),
                quantity: quantityFirstMatch[1],
                unit: quantityFirstMatch[2],
                confidence: 0.85
            };
        }

        // Try quantity at end: "Rice 25kg"
        const quantityEndMatch = /^(.+?)\s+(\d+\.?\d*)\s*(kg|g|l|ml|litre|liter|किलो|ग्राम|लीटर|मिली)$/i.exec(line);
        if (quantityEndMatch) {
            return {
                name: quantityEndMatch[1].trim(),
                quantity: quantityEndMatch[2],
                unit: quantityEndMatch[3],
                confidence: 0.80
            };
        }

        return null;
    },

    /**
     * Match OCR item to catalog
     */
    matchOCRItemToCatalog(item) {
        const searchTerm = item.name.toLowerCase();

        // Find best match
        const matches = this.state.mockCatalog.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.aliases.some(alias => alias.toLowerCase().includes(searchTerm))
        );

        if (matches.length > 0) {
            const bestMatch = matches[0];
            const confidence = this.calculateOCRMatchConfidence(searchTerm, bestMatch, item);

            return {
                original: item,
                matched: {
                    id: bestMatch.id,
                    name: bestMatch.name,
                    quantity: this.normalizeQuantity(item.quantity, item.unit),
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
            confidence: Math.min(item.confidence || 0.75, 0.60),
            flagged: true,
            error: 'Not found in catalog'
        };
    },

    /**
     * Calculate OCR match confidence
     */
    calculateOCRMatchConfidence(searchTerm, catalogItem, ocrItem) {
        let score = ocrItem.confidence || 0.75;

        // Product match confidence
        const productMatch = this.calculateStringSimilarity(searchTerm, catalogItem.name.toLowerCase());
        score *= productMatch;

        // Quality boost for exact quantity units
        if (ocrItem.unit && this.isValidUnit(ocrItem.unit)) {
            score *= 0.95;
        }

        return Math.min(0.99, Math.max(0.1, score));
    },

    /**
     * Calculate string similarity
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
     * Normalize quantity
     */
    normalizeQuantity(quantity, unit) {
        const num = parseFloat(quantity);
        const normalized = this.normalizeUnit(unit);

        if (normalized === 'g') return (num / 1000) + ' kg';
        if (normalized === 'ml') return (num / 1000) + ' L';

        return num + ' ' + normalized;
    },

    /**
     * Normalize unit
     */
    normalizeUnit(unit) {
        const normalized = unit.toLowerCase().trim();

        if (normalized.includes('किलो') || normalized === 'kg') return 'kg';
        if (normalized.includes('ग्राम') || normalized === 'g') return 'g';
        if (normalized.includes('लीटर') || normalized.includes('liter')) return 'L';
        if (normalized.includes('मिली') || normalized === 'ml') return 'ml';

        return normalized;
    },

    /**
     * Check if unit is valid
     */
    isValidUnit(unit) {
        const validUnits = ['kg', 'g', 'l', 'ml', 'litre', 'liter', 'किलो', 'ग्राम', 'लीटर', 'मिली'];
        return validUnits.includes(unit.toLowerCase());
    },

    /**
     * Calculate average confidence
     */
    calculateAverageConfidence(items) {
        if (items.length === 0) return 0;
        const total = items.reduce((sum, item) => sum + item.confidence, 0);
        return total / items.length;
    },

    /**
     * Show OCR confirmation UI
     */
    showOCRConfirmationUI(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        let html = `
            <div id="ocr-confirmation-${ocrJobId}" style="padding: 15px; background: white; border: 2px solid #2196F3; border-radius: 8px; margin: 10px 0;">
                <h4 style="color: #2196F3; margin-top: 0;">📷 Image OCR Results</h4>
                <p style="color: #666; font-size: 13px;">File: <strong>${job.fileName}</strong> | Confidence: <strong>${(job.confidence * 100).toFixed(1)}%</strong></p>
                
                <div style="display: flex; gap: 10px; margin: 10px 0;">
                    <button onclick="EarlyBirdOCR.showImagePreview('${ocrJobId}')" 
                        style="padding: 8px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                        👁 View Image
                    </button>
                    <button onclick="EarlyBirdOCR.showRawText('${ocrJobId}')" 
                        style="padding: 8px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                        📄 View Raw Text
                    </button>
                </div>
                
                <div style="max-height: 350px; overflow-y: auto; margin: 10px 0;">
        `;

        job.extractedItems.forEach((item, index) => {
            const statusColor = item.flagged ? '#ff9800' : '#4CAF50';
            const statusIcon = item.flagged ? '⚠' : '✓';

            html += `
                <div style="background: #f5f5f5; padding: 10px; margin: 8px 0; border-left: 4px solid ${statusColor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <strong style="color: #333;">${statusIcon} ${item.matched ? item.matched.name : item.original.name}</strong>
                        <span style="color: #999; font-size: 12px;">${(item.confidence * 100).toFixed(0)}% confidence</span>
                    </div>
                    <div style="color: #666; font-size: 13px; margin-bottom: 4px;">
                        OCR: <strong>${item.original.quantity} ${item.original.unit}</strong> → 
                        Matched: <strong>${item.matched ? item.matched.quantity : 'N/A'}</strong>
                    </div>
                    ${item.matched ? `
                        <div style="color: #2196F3; font-size: 13px;">
                            ₹${item.matched.price.toFixed(2)}
                        </div>
                    ` : `
                        <div style="color: #f44336; font-size: 12px;">
                            ⚠️ Not found in catalog
                        </div>
                    `}
                </div>
            `;
        });

        html += `
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button onclick="EarlyBirdOCR.editOCRItems('${ocrJobId}')" 
                        style="flex: 1; padding: 10px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✏️ Edit
                    </button>
                    <button onclick="EarlyBirdOCR.confirmOCROrder('${ocrJobId}')" 
                        style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✓ Confirm
                    </button>
                    <button onclick="EarlyBirdOCR.discardOCRJob('${ocrJobId}')" 
                        style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✗ Discard
                    </button>
                </div>
            </div>
        `;

        const container = document.getElementById('ocr-results-container') ||
                         document.querySelector('main') ||
                         document.body;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        container.insertBefore(tempDiv, container.firstChild);
    },

    /**
     * Show image preview
     */
    showImagePreview(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow: auto;">
                <h4 style="margin-top: 0; color: #2196F3;">Image Preview</h4>
                <img src="${job.imageData}" style="max-width: 100%; max-height: 500px; border-radius: 4px; margin: 10px 0;">
                <div style="margin-top: 10px; text-align: right;">
                    <button onclick="this.parentElement.parentElement.remove()" 
                        style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    /**
     * Show raw OCR text
     */
    showRawText(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow: auto;">
                <h4 style="margin-top: 0; color: #2196F3;">Raw OCR Text</h4>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 13px;">
${this.sanitizeText(job.rawOCRText)}
                </pre>
                <div style="margin-top: 10px; text-align: right;">
                    <button onclick="this.parentElement.parentElement.remove()" 
                        style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    /**
     * Edit OCR items
     */
    editOCRItems(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        let html = `<div style="padding: 15px; background: #f9f9f9; border-radius: 8px; margin: 10px 0;">
            <h4 style="color: #2196F3; margin-top: 0;">✏️ Edit OCR Items</h4>
            <div id="edit-ocr-form" style="display: flex; flex-direction: column; gap: 10px;">
        `;

        job.extractedItems.forEach((item, index) => {
            html += `
                <div style="background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Product Name:</label>
                    <input type="text" id="ocr-product-name-${index}" value="${item.matched ? item.matched.name : item.original.name}" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; box-sizing: border-box;">
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Quantity:</label>
                            <input type="number" id="ocr-quantity-${index}" value="${parseFloat(item.matched ? item.matched.quantity : item.original.quantity)}" 
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Unit:</label>
                            <select id="ocr-unit-${index}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                                <option value="kg" ${(item.matched?.unit || item.original.unit) === 'kg' ? 'selected' : ''}>kg</option>
                                <option value="g" ${(item.matched?.unit || item.original.unit) === 'g' ? 'selected' : ''}>g</option>
                                <option value="L" ${(item.matched?.unit || item.original.unit) === 'L' ? 'selected' : ''}>L</option>
                                <option value="ml" ${(item.matched?.unit || item.original.unit) === 'ml' ? 'selected' : ''}>ml</option>
                                <option value="unit" ${(item.matched?.unit || item.original.unit) === 'unit' ? 'selected' : ''}>unit</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="EarlyBirdOCR.saveOCREdits('${ocrJobId}')" 
                        style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✓ Save Edits
                    </button>
                    <button onclick="document.getElementById('ocr-edit-${ocrJobId}').remove()" 
                        style="flex: 1; padding: 10px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        const editContainer = document.createElement('div');
        editContainer.id = `ocr-edit-${ocrJobId}`;
        editContainer.innerHTML = html;
        document.body.appendChild(editContainer);
    },

    /**
     * Save OCR edits
     */
    saveOCREdits(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        job.extractedItems.forEach((item, index) => {
            const newName = document.getElementById(`ocr-product-name-${index}`).value;
            const newQuantity = document.getElementById(`ocr-quantity-${index}`).value;
            const newUnit = document.getElementById(`ocr-unit-${index}`).value;

            if (item.matched) {
                item.matched.name = newName;
                item.matched.quantity = newQuantity + ' ' + newUnit;
                item.matched.unit = newUnit;
            }
        });

        this.recordMLFeedback(ocrJobId, job.extractedItems);
        this.saveToStorage();
        document.getElementById(`ocr-edit-${ocrJobId}`).remove();
        EarlyBirdUtils.showToast('✅ Edits saved', 'success');
    },

    /**
     * Confirm OCR order and create order
     */
    confirmOCROrder(ocrJobId) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        // Get current customer ID (from context or support portal selection)
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
        if (typeof EarlyBirdOCRProcessor !== 'undefined' && job.backendProcessed && job.backendItems) {
            try {
                const order = EarlyBirdOCRProcessor.createOrderFromOCR(
                    customerId,
                    job.backendItems,
                    {
                        customerPhone: '',
                        deliveryDate: EarlyBirdUtils.getDateString(new Date()),
                        deliverySlot: 'am',
                        paymentMethod: 'wallet'
                    }
                );
                
                if (order) {
                    EarlyBirdUtils.showToast(`✅ Order created from image! Order ID: ${order.id}`, 'success');
                    
                    // Log to calendar
                    if (typeof EarlyBirdCalendar !== 'undefined') {
                        EarlyBirdCalendar.addEvent({
                            type: 'IMAGE_ORDER_PROCESSED',
                            customerId: customerId,
                            date: order.deliveryDate,
                            orderId: order.id,
                            description: `OCR order: ${job.extractedItems.length} items from ${job.fileName}`,
                            confidence: (job.confidence * 100).toFixed(1) + '%'
                        });
                    }
                    
                    // Cleanup
                    const confirmationEl = document.getElementById(`ocr-confirmation-${ocrJobId}`);
                    if (confirmationEl) confirmationEl.remove();
                    
                    this.state.ocrJobs = this.state.ocrJobs.filter(j => j.id !== ocrJobId);
                    this.saveToStorage();
                    return;
                }
            } catch (error) {
                console.error('Error creating order from OCR:', error);
                EarlyBirdUtils.showToast('Error creating order. Using fallback method.', 'warning');
            }
        }

        // Fallback: Add items to cart manually
        if (typeof EarlyBirdOrders !== 'undefined') {
            job.extractedItems.forEach(item => {
                if (item.matched && item.matched.id) {
                    EarlyBirdOrders.addToCart(item.matched.id, item.matched.quantity || 1);
                }
            });
            
            EarlyBirdUtils.showToast('✅ OCR order added to cart!', 'success');
        }

        // Log to calendar
        if (typeof EarlyBirdCalendar !== 'undefined') {
            EarlyBirdCalendar.addEvent({
                type: 'IMAGE_ORDER_PROCESSED',
                customerId: customerId,
                date: EarlyBirdUtils.getDateString(new Date()),
                description: `OCR order: ${job.extractedItems.length} items from ${job.fileName}`,
                confidence: (job.confidence * 100).toFixed(1) + '%',
                ocrJobId: ocrJobId
            });
        }

        // Cleanup
        const confirmationEl = document.getElementById(`ocr-confirmation-${ocrJobId}`);
        if (confirmationEl) confirmationEl.remove();

        // Remove from pending
        this.state.ocrJobs = this.state.ocrJobs.filter(j => j.id !== ocrJobId);
        this.saveToStorage();
    },

    /**
     * Discard OCR job
     */
    discardOCRJob(ocrJobId) {
        this.state.ocrJobs = this.state.ocrJobs.filter(j => j.id !== ocrJobId);
        this.saveToStorage();
        document.getElementById(`ocr-confirmation-${ocrJobId}`).remove();
        EarlyBirdUtils.showToast('🗑️ OCR result discarded', 'info');
    },

    /**
     * Record ML feedback for model improvement
     */
    recordMLFeedback(ocrJobId, correctedItems) {
        const job = this.state.ocrJobs.find(j => j.id === ocrJobId);
        if (!job) return;

        correctedItems.forEach((item, index) => {
            if (item.original.name !== (item.matched?.name || '')) {
                this.state.mlFeedback.push({
                    timestamp: new Date(),
                    originalOCR: item.original.name,
                    correctedName: item.matched?.name,
                    correctQuantity: item.matched?.quantity,
                    jobId: ocrJobId,
                    accuracy: item.confidence
                });

                // Update accuracy metrics
                this.state.accuracy.totalItems++;
                if (item.confidence > 0.80) {
                    this.state.accuracy.correctItems++;
                }
            }
        });

        this.saveToStorage();
    },

    /**
     * Generate mock catalog
     */
    generateMockCatalog() {
        return [
            { id: 'rice_1', name: 'Rice', aliases: ['चावल', 'அரிசி', 'అరిసి', 'চাল'], price: 1650, pricePerUnit: 66, category: 'grains' },
            { id: 'atta_1', name: 'Atta', aliases: ['आटा', 'மாவு', 'రొట్టె', 'ময়দা'], price: 450, pricePerUnit: 45, category: 'grains' },
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
            localStorage.setItem('earlybird_ocr_jobs', JSON.stringify(this.state.ocrJobs));
            localStorage.setItem('earlybird_ml_feedback', JSON.stringify(this.state.mlFeedback));
            localStorage.setItem('earlybird_ocr_accuracy', JSON.stringify(this.state.accuracy));
        } catch (e) {
            console.error('Error saving OCR state:', e);
        }
    },

    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        try {
            this.state.ocrJobs = JSON.parse(localStorage.getItem('earlybird_ocr_jobs') || '[]');
            this.state.mlFeedback = JSON.parse(localStorage.getItem('earlybird_ml_feedback') || '[]');
            this.state.accuracy = JSON.parse(localStorage.getItem('earlybird_ocr_accuracy') || '{"totalItems":0,"correctItems":0}');
        } catch (e) {
            console.error('Error loading OCR state:', e);
        }
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EarlyBirdOCR.init());
} else {
    EarlyBirdOCR.init();
}
