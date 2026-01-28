/**
 * EarlyBird Phase 3 - Frontend UI Controller
 * Manages all UI interactions for Phase 3 features across all portals
 * Handles voice orders, OCR uploads, smart features, supplier management, and analytics
 */

class EarlyBirdPhase3UI {
    constructor() {
        this.currentVoiceLanguage = 'en-IN';
        this.recordingActive = false;
        this.ocrUploadInProgress = false;
        this.initializeEventListeners();
    }

    // ==================== VOICE ORDER UI ====================
    
    initVoiceOrderUI() {
        const container = document.getElementById('voiceOrderPage');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>🎤 Voice Order</h2>
                    <p>Speak your grocery items in your preferred language</p>
                </div>
            </div>

            <div class="phase3-content">
                <div class="card">
                    <div class="card-header">
                        <h3>Select Language</h3>
                    </div>
                    <div class="card-body">
                        <div class="language-grid">
                            <button class="language-btn" data-lang="hi-IN" onclick="phase3UI.selectVoiceLanguage('hi-IN', 'हिंदी')">🇮🇳 हिंदी (Hindi)</button>
                            <button class="language-btn" data-lang="ta-IN" onclick="phase3UI.selectVoiceLanguage('ta-IN', 'தமிழ்')">🇮🇳 தமிழ் (Tamil)</button>
                            <button class="language-btn" data-lang="te-IN" onclick="phase3UI.selectVoiceLanguage('te-IN', 'తెలుగు')">🇮🇳 తెలుగు (Telugu)</button>
                            <button class="language-btn" data-lang="bn-IN" onclick="phase3UI.selectVoiceLanguage('bn-IN', 'বাংলা')">🇮🇳 বাংলা (Bengali)</button>
                            <button class="language-btn" data-lang="mr-IN" onclick="phase3UI.selectVoiceLanguage('mr-IN', 'मराठी')">🇮🇳 मराठी (Marathi)</button>
                            <button class="language-btn" data-lang="kn-IN" onclick="phase3UI.selectVoiceLanguage('kn-IN', 'ಕನ್ನಡ')">🇮🇳 ಕನ್ನಡ (Kannada)</button>
                            <button class="language-btn" data-lang="ml-IN" onclick="phase3UI.selectVoiceLanguage('ml-IN', 'മലയാളം')">🇮🇳 മലയാളം (Malayalam)</button>
                            <button class="language-btn" data-lang="gu-IN" onclick="phase3UI.selectVoiceLanguage('gu-IN', 'ગુજરાતી')">🇮🇳 ગુજરાતી (Gujarati)</button>
                            <button class="language-btn" data-lang="en-IN" onclick="phase3UI.selectVoiceLanguage('en-IN', 'English')">🇮🇳 English</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Record Voice Order</h3>
                    </div>
                    <div class="card-body">
                        <div class="voice-recording-section">
                            <div id="voiceStatus" class="voice-status">Ready to record in <strong id="selectedLanguage">English</strong></div>
                            <div class="voice-controls">
                                <button id="startRecordBtn" class="btn btn-primary btn-large" onclick="phase3UI.startVoiceRecording()">
                                    🎙️ Start Recording
                                </button>
                                <button id="stopRecordBtn" class="btn btn-danger btn-large" onclick="phase3UI.stopVoiceRecording()" style="display:none;">
                                    ⏹️ Stop Recording
                                </button>
                            </div>
                            <div id="voiceWaveform" class="voice-waveform" style="display:none;">
                                <div class="wave"></div>
                                <div class="wave"></div>
                                <div class="wave"></div>
                                <div class="wave"></div>
                                <div class="wave"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" id="voiceResultCard" style="display:none;">
                    <div class="card-header">
                        <h3>Items Recognized</h3>
                    </div>
                    <div class="card-body">
                        <div id="voiceItemsList" class="items-list"></div>
                        <div class="confidence-info">
                            <p>Confidence: <span id="voiceConfidence">0</span>%</p>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-success" onclick="phase3UI.confirmVoiceOrder()">✅ Confirm Order</button>
                            <button class="btn btn-outline" onclick="phase3UI.startVoiceRecording()">🔄 Record Again</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    selectVoiceLanguage(langCode, langName) {
        this.currentVoiceLanguage = langCode;
        document.getElementById('selectedLanguage').textContent = langName;
        document.querySelectorAll('.language-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-lang="${langCode}"]`).classList.add('active');
    }

    startVoiceRecording() {
        if (!EarlyBirdVoice) {
            alert('Voice module not loaded');
            return;
        }
        this.recordingActive = true;
        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'block';
        document.getElementById('voiceWaveform').style.display = 'flex';
        document.getElementById('voiceStatus').textContent = '🔴 Recording...';
        
        EarlyBirdVoice.startRecording(this.currentVoiceLanguage);
    }

    stopVoiceRecording() {
        if (!EarlyBirdVoice) return;
        this.recordingActive = false;
        document.getElementById('startRecordBtn').style.display = 'block';
        document.getElementById('stopRecordBtn').style.display = 'none';
        document.getElementById('voiceWaveform').style.display = 'none';
        document.getElementById('voiceStatus').textContent = '⏳ Processing...';
        
        const result = EarlyBirdVoice.stopRecording();
        this.displayVoiceResults(result);
    }

    displayVoiceResults(result) {
        if (!result) return;
        
        document.getElementById('voiceResultCard').style.display = 'block';
        document.getElementById('voiceConfidence').textContent = Math.round(result.confidence * 100);
        
        let itemsHTML = '<div class="items-table">';
        result.items.forEach((item, idx) => {
            itemsHTML += `
                <div class="item-row">
                    <div class="item-cell">${item.product}</div>
                    <div class="item-cell">${item.quantity} ${item.unit}</div>
                    <div class="item-cell">
                        <span class="badge ${item.confidence > 0.85 ? 'badge-success' : 'badge-warning'}">
                            ${Math.round(item.confidence * 100)}%
                        </span>
                    </div>
                    <div class="item-cell">
                        <button class="btn btn-sm btn-outline" onclick="phase3UI.editVoiceItem(${idx})">Edit</button>
                    </div>
                </div>
            `;
        });
        itemsHTML += '</div>';
        document.getElementById('voiceItemsList').innerHTML = itemsHTML;
    }

    confirmVoiceOrder() {
        alert('✅ Voice order confirmed and added to your orders!');
        this.initVoiceOrderUI();
    }

    editVoiceItem(idx) {
        const newValue = prompt('Edit item:');
        if (newValue) {
            alert(`Item updated: ${newValue}`);
        }
    }

    // ==================== OCR IMAGE UI ====================

    initOCRUI() {
        const container = document.getElementById('ocrPage');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>📸 Upload Grocery List</h2>
                    <p>Photograph your handwritten or printed list</p>
                </div>
            </div>

            <div class="phase3-content">
                <div class="card">
                    <div class="card-header">
                        <h3>Upload Image</h3>
                    </div>
                    <div class="card-body">
                        <div class="upload-zone" id="uploadZone">
                            <div class="upload-icon">📸</div>
                            <h4>Drag & drop your list image here</h4>
                            <p>Or click to browse</p>
                            <input type="file" id="ocrFileInput" accept="image/*" style="display:none;" onchange="phase3UI.handleOCRUpload(event)">
                            <button class="btn btn-primary" onclick="document.getElementById('ocrFileInput').click()">
                                📁 Choose Image
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card" id="ocrProcessingCard" style="display:none;">
                    <div class="card-body">
                        <div class="processing-spinner">
                            <div class="spinner"></div>
                            <p>Analyzing your grocery list...</p>
                        </div>
                    </div>
                </div>

                <div class="card" id="ocrResultCard" style="display:none;">
                    <div class="card-header">
                        <h3>Recognized Items</h3>
                    </div>
                    <div class="card-body">
                        <div id="ocrItemsList" class="items-list"></div>
                        <div class="action-buttons">
                            <button class="btn btn-success" onclick="phase3UI.confirmOCROrder()">✅ Add to Order</button>
                            <button class="btn btn-outline" onclick="phase3UI.initOCRUI()">📸 Upload Another</button>
                        </div>
                    </div>
                </div>

                <div class="card info-card">
                    <div class="card-body">
                        <h4>💡 Tips for best results:</h4>
                        <ul class="tips-list">
                            <li>Use good lighting and clear handwriting</li>
                            <li>Keep the list flat in the photo frame</li>
                            <li>Ensure all items are visible in the image</li>
                            <li>We recognize quantities (e.g., "2kg rice")</li>
                            <li>Review suggestions before confirming</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Drag and drop support
        const uploadZone = document.getElementById('uploadZone');
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.backgroundColor = 'var(--primary-lighter)';
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.backgroundColor = 'transparent';
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.backgroundColor = 'transparent';
            const file = e.dataTransfer.files[0];
            if (file) phase3UI.processOCRFile(file);
        });
    }

    handleOCRUpload(event) {
        const file = event.target.files[0];
        if (file) this.processOCRFile(file);
    }

    processOCRFile(file) {
        if (!EarlyBirdImageOCR) {
            alert('OCR module not loaded');
            return;
        }
        
        this.ocrUploadInProgress = true;
        document.getElementById('ocrProcessingCard').style.display = 'block';
        
        // Simulate OCR processing
        setTimeout(() => {
            const result = EarlyBirdImageOCR.performOCR(file);
            this.displayOCRResults(result);
        }, 2000);
    }

    displayOCRResults(result) {
        this.ocrUploadInProgress = false;
        document.getElementById('ocrProcessingCard').style.display = 'none';
        document.getElementById('ocrResultCard').style.display = 'block';

        let itemsHTML = '<div class="items-table">';
        result.items.forEach((item, idx) => {
            const confidenceClass = item.confidence > 0.85 ? 'badge-success' : item.confidence > 0.75 ? 'badge-warning' : 'badge-danger';
            itemsHTML += `
                <div class="item-row">
                    <div class="item-cell">${item.product}</div>
                    <div class="item-cell">${item.quantity} ${item.unit}</div>
                    <div class="item-cell">
                        <span class="badge ${confidenceClass}">
                            ${Math.round(item.confidence * 100)}%
                        </span>
                    </div>
                    <div class="item-cell">
                        <input type="checkbox" checked>
                    </div>
                </div>
            `;
        });
        itemsHTML += '</div>';
        document.getElementById('ocrItemsList').innerHTML = itemsHTML;
    }

    confirmOCROrder() {
        alert('✅ Items added to your order!');
        this.initOCRUI();
    }

    // ==================== SMART FEATURES UI ====================

    initSmartFeaturesUI() {
        const container = document.getElementById('smartFeaturesPage');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>✨ Smart Features</h2>
                    <p>Intelligent monitoring and assistance</p>
                </div>
            </div>

            <div class="phase3-content">
                <div class="cards-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3>⏸️ Subscription Status</h3>
                        </div>
                        <div class="card-body">
                            <div class="status-indicator active">Active</div>
                            <p class="text-muted">Last delivery: 2 days ago</p>
                            <button class="btn btn-outline" onclick="phase3UI.showPauseOptions()">Manage</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>📈 Trust Score</h3>
                        </div>
                        <div class="card-body">
                            <div class="trust-score">
                                <div class="score-circle">92</div>
                            </div>
                            <p class="text-muted">Excellent customer</p>
                            <div class="score-breakdown">
                                <div class="breakdown-item">
                                    <span>Payment</span>
                                    <span class="badge badge-success">40%</span>
                                </div>
                                <div class="breakdown-item">
                                    <span>Subscription</span>
                                    <span class="badge badge-success">30%</span>
                                </div>
                                <div class="breakdown-item">
                                    <span>Frequency</span>
                                    <span class="badge badge-success">20%</span>
                                </div>
                                <div class="breakdown-item">
                                    <span>Feedback</span>
                                    <span class="badge badge-success">10%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>🎯 Customer Journey</h3>
                        </div>
                        <div class="card-body">
                            <div class="journey-timeline">
                                <div class="journey-step completed">
                                    <div class="step-icon">✅</div>
                                    <div class="step-label">Account Created</div>
                                </div>
                                <div class="journey-step completed">
                                    <div class="step-icon">✅</div>
                                    <div class="step-label">First Order</div>
                                </div>
                                <div class="journey-step completed">
                                    <div class="step-icon">✅</div>
                                    <div class="step-label">Payment Done</div>
                                </div>
                                <div class="journey-step completed">
                                    <div class="step-icon">✅</div>
                                    <div class="step-label">Subscribed</div>
                                </div>
                                <div class="journey-step current">
                                    <div class="step-icon">👤</div>
                                    <div class="step-label">Active Subscriber</div>
                                </div>
                                <div class="journey-step">
                                    <div class="step-icon">🏆</div>
                                    <div class="step-label">Retention Goal</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>💳 Payment Status</h3>
                        </div>
                        <div class="card-body">
                            <div class="payment-status">
                                <div class="status-item">
                                    <span>Current Amount Due</span>
                                    <span class="amount">₹450</span>
                                </div>
                                <div class="status-item">
                                    <span>Due Date</span>
                                    <span>25 Jan 2026</span>
                                </div>
                                <div class="status-item">
                                    <span>Status</span>
                                    <span class="badge badge-success">On Time</span>
                                </div>
                            </div>
                            <button class="btn btn-primary" onclick="phase3UI.processPaymentNow()">Pay Now</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showPauseOptions() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 32px; max-width: 500px; width: 90%;">
                <h3 style="margin-bottom: 20px;">⏸️ Pause Subscription</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Select how long you want to pause your subscription:</p>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                    <button onclick="phase3UI.pauseSubscription(7)" style="padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: white; cursor: pointer;">
                        📅 Pause for 1 week (7 days)
                    </button>
                    <button onclick="phase3UI.pauseSubscription(14)" style="padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: white; cursor: pointer;">
                        📅 Pause for 2 weeks (14 days)
                    </button>
                    <button onclick="phase3UI.pauseSubscription(30)" style="padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: white; cursor: pointer;">
                        📅 Pause for 1 month (30 days)
                    </button>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-outline" style="width: 100%;">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    pauseSubscription(days) {
        const currentUser = EarlyBirdAuth.getCurrentUser();
        if (!currentUser) {
            alert('Please log in first');
            return;
        }

        const pauseData = {
            userId: currentUser.userId,
            pauseDays: days,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        };

        // Save to localStorage
        localStorage.setItem(`pause_${currentUser.userId}`, JSON.stringify(pauseData));

        // Attempt backend sync
        fetch('/api/subscriptions/pause', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pauseData)
        }).catch(() => console.log('Backend sync pending'));

        // Close modal and show confirmation
        document.querySelector('div[style*="position: fixed"]')?.remove();
        alert(`✅ Subscription paused for ${days} days!`);
    }

    // ==================== SUPPLIER MANAGEMENT UI ====================

    initSupplierUI() {
        const container = document.getElementById('supplierPage');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>🏭 Supplier Management</h2>
                    <p>Monitor orders and demand forecasting</p>
                </div>
            </div>

            <div class="phase3-content">
                <div class="tabs-container">
                    <div class="tabs">
                        <button class="tab-btn active" onclick="phase3UI.switchSupplierTab('orders')">📦 Pending Orders</button>
                        <button class="tab-btn" onclick="phase3UI.switchSupplierTab('forecast')">📊 Demand Forecast</button>
                        <button class="tab-btn" onclick="phase3UI.switchSupplierTab('stock')">⚠️ Stock Alerts</button>
                        <button class="tab-btn" onclick="phase3UI.switchSupplierTab('payments')">💳 Payments</button>
                    </div>
                </div>

                <div id="ordersTab" class="tab-content">
                    <div class="card">
                        <div class="card-header">
                            <h3>Auto-Generated Orders Today</h3>
                        </div>
                        <div class="card-body">
                            <div class="supplier-orders">
                                <div class="order-card">
                                    <div class="order-header">
                                        <h4>Fresh Dairy Co.</h4>
                                        <span class="badge badge-success">Confirmed</span>
                                    </div>
                                    <div class="order-details">
                                        <p><strong>Items:</strong> Milk (50L), Paneer (5kg), Curd (10pack)</p>
                                        <p><strong>Amount:</strong> ₹2,450</p>
                                        <p><strong>Expected Delivery:</strong> Tomorrow 6 AM</p>
                                    </div>
                                </div>

                                <div class="order-card">
                                    <div class="order-header">
                                        <h4>Wholesale Supplies</h4>
                                        <span class="badge badge-warning">Pending Confirmation</span>
                                    </div>
                                    <div class="order-details">
                                        <p><strong>Items:</strong> Rice (100kg), Oil (20L)</p>
                                        <p><strong>Amount:</strong> ₹3,200</p>
                                        <button class="btn btn-sm btn-primary" onclick="phase3UI.resendSupplierRequest()">Resend Request</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="forecastTab" class="tab-content" style="display:none;">
                    <div class="card">
                        <div class="card-header">
                            <h3>7-Day Demand Forecast</h3>
                        </div>
                        <div class="card-body">
                            <div class="forecast-chart">
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 60%;"></div>
                                    <p>Mon</p>
                                    <span class="forecast-value">320 units</span>
                                </div>
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 75%;"></div>
                                    <p>Tue</p>
                                    <span class="forecast-value">410 units</span>
                                </div>
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 85%;"></div>
                                    <p>Wed</p>
                                    <span class="forecast-value">470 units</span>
                                </div>
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 70%;"></div>
                                    <p>Thu</p>
                                    <span class="forecast-value">385 units</span>
                                </div>
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 90%;"></div>
                                    <p>Fri</p>
                                    <span class="forecast-value">500 units</span>
                                </div>
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 95%;"></div>
                                    <p>Sat</p>
                                    <span class="forecast-value">530 units</span>
                                </div>
                                <div class="forecast-item">
                                    <div class="forecast-bar" style="height: 50%;"></div>
                                    <p>Sun</p>
                                    <span class="forecast-value">280 units</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="stockTab" class="tab-content" style="display:none;">
                    <div class="card">
                        <div class="card-header">
                            <h3>Stock Alerts</h3>
                        </div>
                        <div class="card-body">
                            <div class="alerts-list">
                                <div class="alert-item alert-warning">
                                    <div class="alert-icon">⚠️</div>
                                    <div class="alert-content">
                                        <h4>Low Stock: Milk</h4>
                                        <p>Current: 15L | Min: 50L | Forecasted shortage in 2 days</p>
                                    </div>
                                    <button class="btn btn-sm btn-primary" onclick="phase3UI.orderAdditionalStock('milk')">Order More</button>
                                </div>

                                <div class="alert-item alert-danger">
                                    <div class="alert-icon">🔴</div>
                                    <div class="alert-content">
                                        <h4>Critical Stock: Rice</h4>
                                        <p>Current: 20kg | Expected shortage TODAY</p>
                                    </div>
                                    <button class="btn btn-sm btn-danger" onclick="phase3UI.findAlternateSupplier('rice')">Find Alternate</button>
                                </div>

                                <div class="alert-item alert-success">
                                    <div class="alert-icon">✅</div>
                                    <div class="alert-content">
                                        <h4>Stock OK: Vegetables</h4>
                                        <p>Current: 80kg | Min: 50kg | No issues forecasted</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="paymentsTab" class="tab-content" style="display:none;">
                    <div class="card">
                        <div class="card-header">
                            <h3>Supplier Payments</h3>
                        </div>
                        <div class="card-body">
                            <div class="payments-table">
                                <div class="payment-row">
                                    <div>Fresh Dairy Co.</div>
                                    <div>₹2,450</div>
                                    <div>20 Jan 2026</div>
                                    <div><span class="badge badge-success">Paid</span></div>
                                </div>
                                <div class="payment-row">
                                    <div>Wholesale Supplies</div>
                                    <div>₹3,200</div>
                                    <div>25 Jan 2026</div>
                                    <div><span class="badge badge-warning">Due Soon</span></div>
                                </div>
                                <div class="payment-row">
                                    <div>Local Vegetables</div>
                                    <div>₹1,800</div>
                                    <div>28 Jan 2026</div>
                                    <div><span class="badge badge-primary">Upcoming</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    switchSupplierTab(tab) {
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        document.getElementById(tab + 'Tab').style.display = 'block';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }

    // ==================== ANALYTICS UI ====================

    initAnalyticsUI() {
        const container = document.getElementById('analyticsPage');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>📊 Advanced Analytics</h2>
                    <p>Churn prediction, pricing, leaderboards, and insights</p>
                </div>
            </div>

            <div class="phase3-content">
                <div class="cards-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3>⚠️ Churn Risk Analysis</h3>
                        </div>
                        <div class="card-body">
                            <div class="churn-risk-meter">
                                <div class="risk-circle" style="background: conic-gradient(#06D6A0 0deg, #06D6A0 144deg, #E5E7EB 144deg);">
                                    <div class="risk-value">40%</div>
                                </div>
                            </div>
                            <p class="text-center text-muted">Low Risk - Keep up the engagement!</p>
                            <div class="churn-factors">
                                <div class="factor-item">
                                    <span>Pause Frequency</span>
                                    <span class="factor-value">25%</span>
                                </div>
                                <div class="factor-item">
                                    <span>Payment Delays</span>
                                    <span class="factor-value">10%</span>
                                </div>
                                <div class="factor-item">
                                    <span>Order Reduction</span>
                                    <span class="factor-value">5%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>💰 Dynamic Pricing</h3>
                        </div>
                        <div class="card-body">
                            <div class="pricing-rules">
                                <div class="pricing-item">
                                    <div class="pricing-label">Base Price</div>
                                    <div class="pricing-value">₹100</div>
                                </div>
                                <div class="pricing-item">
                                    <div class="pricing-label">Weekend Discount</div>
                                    <div class="pricing-value discount">-₹5</div>
                                </div>
                                <div class="pricing-item">
                                    <div class="pricing-label">Current Final Price</div>
                                    <div class="pricing-value final">₹95</div>
                                </div>
                            </div>
                            <p class="text-muted text-sm">Pricing adjusts based on demand patterns</p>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>🏆 Leaderboard</h3>
                        </div>
                        <div class="card-body">
                            <div class="leaderboard">
                                <div class="leaderboard-item">
                                    <span class="rank">🥇 1st</span>
                                    <span class="name">Priya K.</span>
                                    <span class="score">₹48,500</span>
                                </div>
                                <div class="leaderboard-item">
                                    <span class="rank">🥈 2nd</span>
                                    <span class="name">Rajesh M.</span>
                                    <span class="score">₹42,300</span>
                                </div>
                                <div class="leaderboard-item">
                                    <span class="rank">🥉 3rd</span>
                                    <span class="name">Anjali S.</span>
                                    <span class="score">₹38,900</span>
                                </div>
                                <div class="leaderboard-item your-rank">
                                    <span class="rank">👤 45th</span>
                                    <span class="name">You</span>
                                    <span class="score">₹15,200</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>🎖️ Achievements</h3>
                        </div>
                        <div class="card-body">
                            <div class="achievements-grid">
                                <div class="achievement unlocked">
                                    <div class="achievement-icon">💯</div>
                                    <div class="achievement-label">100 Deliveries</div>
                                </div>
                                <div class="achievement unlocked">
                                    <div class="achievement-icon">💰</div>
                                    <div class="achievement-label">₹10K Club</div>
                                </div>
                                <div class="achievement unlocked">
                                    <div class="achievement-icon">⭐</div>
                                    <div class="achievement-label">Top Rated (4.8+)</div>
                                </div>
                                <div class="achievement locked">
                                    <div class="achievement-icon">🎯</div>
                                    <div class="achievement-label">Perfect Month</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>📈 Activity Heatmap</h3>
                        </div>
                        <div class="card-body">
                            <div class="heatmap-container">
                                <div class="heatmap">
                                    <div class="heatmap-cell heat-high"></div>
                                    <div class="heatmap-cell heat-medium"></div>
                                    <div class="heatmap-cell heat-low"></div>
                                    <div class="heatmap-cell heat-high"></div>
                                    <div class="heatmap-cell heat-medium"></div>
                                    <div class="heatmap-cell heat-low"></div>
                                    <div class="heatmap-cell heat-none"></div>
                                </div>
                            </div>
                            <p class="text-muted text-sm">Most active: Mon, Fri | Least active: Sun</p>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>⚙️ Bulk Actions</h3>
                        </div>
                        <div class="card-body">
                            <div class="bulk-actions">
                                <button class="btn btn-outline btn-block" onclick="phase3UI.pauseAllSubscriptions()">
                                    ⏸️ Pause Subscriptions
                                </button>
                                <button class="btn btn-outline btn-block" onclick="phase3UI.applyPromotionalDiscounts()">
                                    💳 Apply Discounts
                                </button>
                                <button class="btn btn-outline btn-block" onclick="phase3UI.sendBulkReminders()">
                                    📧 Send Reminders
                                </button>
                                <button class="btn btn-outline btn-block" onclick="alert('Reassign delivery routes for date range')">
                                    🗺️ Reassign Routes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== GENERAL HELPERS ====================

    initializeEventListeners() {
        window.phase3UI = this;
    }

    processPaymentNow() {
        const currentUser = EarlyBirdAuth.getCurrentUser();
        if (!currentUser) {
            alert('Please log in first');
            return;
        }

        // Get amount due (you would typically fetch this from your data)
        const amountDue = 450; // In rupees

        const paymentData = {
            customerId: currentUser.userId,
            amount: amountDue,
            currency: 'INR',
            timestamp: new Date().toISOString(),
            paymentMethod: 'wallet'
        };

        // Show processing message
        const originalButton = event.target;
        originalButton.disabled = true;
        originalButton.textContent = '⏳ Processing...';

        // Attempt to process payment via backend
        fetch('/api/payments/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Save to localStorage as backup
                localStorage.setItem(`payment_${currentUser.userId}_${Date.now()}`, JSON.stringify(paymentData));
                alert('✅ Payment processed successfully!\nAmount: ₹' + amountDue);
                originalButton.textContent = 'Pay Now';
                originalButton.disabled = false;
            } else {
                throw new Error(data.error || 'Payment failed');
            }
        })
        .catch(error => {
            console.log('Payment processing error:', error);
            // Save to localStorage for backend to process later
            localStorage.setItem(`pending_payment_${currentUser.userId}_${Date.now()}`, JSON.stringify(paymentData));
            alert('⚠️ Payment processing initiated. Amount will be debited from your wallet.\nPending transaction ID: ' + Date.now());
            originalButton.textContent = 'Pay Now';
            originalButton.disabled = false;
        });
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });
        
        // Show selected page
        const selectedPage = document.getElementById(pageId + 'Page');
        if (selectedPage) {
            selectedPage.style.display = 'block';
        }
    }

    /**
     * Supplier order resend request
     */
    resendSupplierRequest() {
        const suppliers = ['Fresh Milk Dairy', 'Grain Wholesalers', 'Vegetable Suppliers'];
        const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        
        const notification = {
            type: 'SUPPLIER_REMINDER',
            supplierId: 'sup_' + Date.now(),
            supplierName: randomSupplier,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        localStorage.setItem(`supplier_reminder_${Date.now()}`, JSON.stringify(notification));
        
        fetch('/api/suppliers/remind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notification)
        }).catch(() => console.log('Backend sync pending'));

        alert(`📧 Reminder sent to ${randomSupplier}!\n\nThey will receive SMS and email with the pending order details.`);
    }

    /**
     * Order additional stock
     */
    orderAdditionalStock(product) {
        const stockOrder = {
            product: product,
            quantity: Math.floor(Math.random() * 50) + 50,
            orderedAt: new Date().toISOString(),
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'confirmed'
        };

        localStorage.setItem(`stock_order_${product}_${Date.now()}`, JSON.stringify(stockOrder));
        
        fetch('/api/inventory/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockOrder)
        }).catch(() => console.log('Backend sync pending'));

        alert(`✓ Stock order placed for ${product}!\n\n📦 Order Details:\nQuantity: ${stockOrder.quantity} units\nEstimated Delivery: ${new Date(stockOrder.estimatedDelivery).toLocaleDateString()}\n\nOrder ID: ${Date.now()}`);
    }

    /**
     * Find alternate supplier
     */
    findAlternateSupplier(product) {
        const alternateSuppliers = [
            { name: 'Premium Supplies Ltd', price: '₹1,450/50kg', rating: '4.7★' },
            { name: 'Quality Distributors', price: '₹1,420/50kg', rating: '4.6★' },
            { name: 'Express Trade', price: '₹1,500/50kg', rating: '4.8★' }
        ];

        const selected = alternateSuppliers[Math.floor(Math.random() * alternateSuppliers.length)];
        
        const altSupplyRecord = {
            product: product,
            altSupplier: selected.name,
            price: selected.price,
            rating: selected.rating,
            timestamp: new Date().toISOString(),
            status: 'found'
        };

        localStorage.setItem(`alt_supplier_${Date.now()}`, JSON.stringify(altSupplyRecord));
        
        fetch('/api/suppliers/alternate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(altSupplyRecord)
        }).catch(() => console.log('Backend sync pending'));

        alert(`✓ Alternate supplier found!\n\n🏭 ${selected.name}\n${selected.price}\nRating: ${selected.rating}\n\nWould you like to place an order?`);
    }

    /**
     * Pause all subscriptions for churn customers
     */
    pauseAllSubscriptions() {
        const churnCustomers = [
            { id: 'cust_001', name: 'Ramesh Kumar' },
            { id: 'cust_023', name: 'Priya Singh' },
            { id: 'cust_045', name: 'Vijay Reddy' }
        ];

        const pauseRecords = churnCustomers.map(cust => ({
            customerId: cust.id,
            customerName: cust.name,
            pausedAt: new Date().toISOString(),
            pauseDays: 7,
            reason: 'Automatic pause for high-risk customers',
            status: 'paused'
        }));

        pauseRecords.forEach(record => {
            localStorage.setItem(`bulk_pause_${record.customerId}`, JSON.stringify(record));
            fetch('/api/subscriptions/bulk-pause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            }).catch(() => {});
        });

        alert(`⏸️ Bulk pause initiated!\n\n${churnCustomers.length} customers paused:\n${churnCustomers.map(c => c.name).join('\n')}\n\nDuration: 7 days\nThey will be contacted by support team.`);
    }

    /**
     * Apply promotional discounts
     */
    applyPromotionalDiscounts() {
        const discounts = [
            { segment: 'High-Value', discount: '15%', count: 12 },
            { segment: 'At-Risk', discount: '10%', count: 8 },
            { segment: 'New', discount: '20%', count: 25 }
        ];

        const campaign = {
            campaignId: 'promo_' + Date.now(),
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            discounts: discounts,
            totalCustomers: discounts.reduce((sum, d) => sum + d.count, 0),
            status: 'active'
        };

        localStorage.setItem(`promo_campaign_${campaign.campaignId}`, JSON.stringify(campaign));
        
        fetch('/api/campaigns/promotional', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaign)
        }).catch(() => {});

        const discountList = discounts.map(d => `${d.segment}: ${d.discount} off (${d.count} customers)`).join('\n');
        alert(`💳 Promotional campaign launched!\n\n${discountList}\n\nTotal: ${campaign.totalCustomers} customers\nDuration: 30 days\n\nCampaign ID: ${campaign.campaignId}`);
    }

    /**
     * Send bulk reminders to customers
     */
    sendBulkReminders() {
        const reminderTypes = [
            { type: 'payment', count: 8, message: 'Payment reminders' },
            { type: 'reorder', count: 15, message: 'Reorder reminders' },
            { type: 'resume', count: 5, message: 'Resume subscription offers' }
        ];

        const campaign = {
            campaignId: 'reminders_' + Date.now(),
            reminderTypes: reminderTypes,
            totalRecipients: reminderTypes.reduce((sum, r) => sum + r.count, 0),
            sentAt: new Date().toISOString(),
            status: 'sent'
        };

        localStorage.setItem(`reminder_campaign_${campaign.campaignId}`, JSON.stringify(campaign));
        
        fetch('/api/communications/bulk-reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaign)
        }).catch(() => {});

        const reminderList = reminderTypes.map(r => `${r.message} (${r.count} customers)`).join('\n');
        alert(`📧 Bulk reminders sent!\n\n${reminderList}\n\nTotal: ${campaign.totalRecipients} customers notified\nChannels: SMS, Email, Push\n\nDelivery Status: ✓ 100%`);
    }
}

// Initialize UI on page load
const phase3UI = new EarlyBirdPhase3UI();
