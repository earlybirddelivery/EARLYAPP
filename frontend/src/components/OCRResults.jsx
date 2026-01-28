import React, { useState, useEffect } from 'react';
import styles from './OCRResults.module.css';

/**
 * OCRResults Component
 * Displays OCR extraction results and allows product matching
 * 
 * Props:
 *   scanId: ID of the OCR scan
 *   extractedText: Raw OCR text
 *   matchedProducts: Matched products from OCR
 *   confidence: Overall confidence score
 *   onConfirm: Callback when results are confirmed
 *   onEdit: Callback when text is edited
 *   onClose: Callback when component is closed
 */
const OCRResults = ({ 
  scanId, 
  extractedText, 
  matchedProducts = [],
  confidence = 0,
  onConfirm,
  onEdit,
  onClose 
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState(extractedText);
  const [selectedProducts, setSelectedProducts] = useState(matchedProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all, high, medium, low

  // Update selected products when props change
  useEffect(() => {
    setSelectedProducts(matchedProducts);
  }, [matchedProducts]);

  // Get confidence color
  const getConfidenceColor = (conf) => {
    if (conf >= 85) return '#4CAF50'; // green
    if (conf >= 70) return '#FFC107'; // amber
    if (conf >= 50) return '#FF9800'; // orange
    return '#F44336'; // red
  };

  // Get confidence badge
  const getConfidenceBadge = (conf) => {
    if (conf >= 85) return '✓ High';
    if (conf >= 70) return '~ Medium';
    if (conf >= 50) return '! Low';
    return '✗ Very Low';
  };

  // Filter products by confidence
  const filteredProducts = selectedProducts.filter(product => {
    const conf = product.confidence || 0;
    if (filter === 'high') return conf >= 85;
    if (filter === 'medium') return conf >= 70 && conf < 85;
    if (filter === 'low') return conf < 70;
    return true;
  });

  // Toggle product selection
  const toggleProduct = (index) => {
    const updated = [...selectedProducts];
    updated[index].selected = !updated[index].selected;
    setSelectedProducts(updated);
  };

  // Remove product
  const removeProduct = (index) => {
    const updated = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updated);
  };

  // Update product details
  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
  };

  // Toggle expanded item
  const toggleExpanded = (index) => {
    const updated = new Set(expandedItems);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setExpandedItems(updated);
  };

  // Save edits
  const saveEdits = async () => {
    try {
      setLoading(true);
      setError(null);

      if (onEdit) {
        await onEdit({
          scanId,
          editedText,
          products: selectedProducts
        });
      }

      setEditMode(false);
    } catch (err) {
      setError(`Error saving edits: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add to cart
  const addToCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const selectedItems = selectedProducts.filter(p => p.selected !== false);

      if (selectedItems.length === 0) {
        setError('Please select at least one product');
        return;
      }

      if (onConfirm) {
        await onConfirm({
          scanId,
          products: selectedItems,
          totalAmount: selectedItems.reduce((sum, p) => sum + (p.total_price || 0), 0)
        });
      }
    } catch (err) {
      setError(`Error adding to cart: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Receipt Scan Results</h1>
        <button onClick={onClose} className={styles.closeBtn}>✕</button>
      </div>

      {/* Confidence Score */}
      <div className={styles.confidenceBar}>
        <div className={styles.scoreInfo}>
          <span className={styles.label}>Overall Confidence:</span>
          <div className={styles.score}>
            <div 
              className={styles.scoreBar}
              style={{
                width: `${confidence}%`,
                backgroundColor: getConfidenceColor(confidence)
              }}
            />
            <span className={styles.scoreText}>{confidence.toFixed(1)}%</span>
          </div>
          <span className={styles.badge} style={{ color: getConfidenceColor(confidence) }}>
            {getConfidenceBadge(confidence)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={styles.tab + ' ' + (!editMode ? styles.active : '')}
          onClick={() => setEditMode(false)}
        >
          📋 Results ({selectedProducts.length})
        </button>
        <button 
          className={styles.tab + ' ' + (editMode ? styles.active : '')}
          onClick={() => setEditMode(true)}
        >
          ✏️ Edit Text
        </button>
      </div>

      {/* Main Content */}
      {editMode ? (
        // Text Editor
        <div className={styles.editorSection}>
          <label>Edit extracted text:</label>
          <textarea
            className={styles.textEditor}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Edit OCR text here if needed..."
            disabled={loading}
          />
          <div className={styles.charCount}>
            {editedText.length} characters
          </div>
          <div className={styles.editorActions}>
            <button 
              onClick={saveEdits}
              className={styles.saveBtn}
              disabled={loading || editedText === extractedText}
            >
              {loading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
            <button 
              onClick={() => {
                setEditedText(extractedText);
                setEditMode(false);
              }}
              className={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Results Display
        <div className={styles.resultsSection}>
          {/* Filter */}
          <div className={styles.filterBar}>
            <span>Filter by confidence:</span>
            <button 
              className={filter === 'all' ? styles.filterActive : ''}
              onClick={() => setFilter('all')}
            >
              All ({selectedProducts.length})
            </button>
            <button 
              className={filter === 'high' ? styles.filterActive : ''}
              onClick={() => setFilter('high')}
            >
              High (≥85%)
            </button>
            <button 
              className={filter === 'medium' ? styles.filterActive : ''}
              onClick={() => setFilter('medium')}
            >
              Medium (70-85%)
            </button>
            <button 
              className={filter === 'low' ? styles.filterActive : ''}
              onClick={() => setFilter('low')}
            >
              Low (&lt;70%)
            </button>
          </div>

          {/* Product List */}
          <div className={styles.productsList}>
            {filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>📭 No products found</p>
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <div 
                  key={index}
                  className={styles.productCard + ' ' + (expandedItems.has(index) ? styles.expanded : '')}
                >
                  <div className={styles.productHeader}>
                    <input
                      type="checkbox"
                      defaultChecked={product.selected !== false}
                      onChange={() => toggleProduct(index)}
                      className={styles.checkbox}
                    />

                    <div className={styles.productInfo}>
                      <h3>{product.product_name}</h3>
                      <p className={styles.category}>
                        {product.category && <span className={styles.categoryBadge}>{product.category}</span>}
                        {product.brand && <span className={styles.brandBadge}>{product.brand}</span>}
                      </p>
                    </div>

                    <div className={styles.productScore}>
                      <div 
                        className={styles.confidenceDot}
                        style={{ backgroundColor: getConfidenceColor(product.confidence) }}
                        title={`${product.confidence}% confidence`}
                      >
                        {product.confidence}%
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleExpanded(index)}
                      className={styles.expandBtn}
                    >
                      {expandedItems.has(index) ? '▼' : '▶'}
                    </button>

                    <button 
                      onClick={() => removeProduct(index)}
                      className={styles.removeBtn}
                      title="Remove this product"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedItems.has(index) && (
                    <div className={styles.productDetails}>
                      <div className={styles.detailRow}>
                        <label>Quantity:</label>
                        <div className={styles.inputGroup}>
                          <input
                            type="number"
                            value={product.quantity || 1}
                            onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value))}
                            min="0.1"
                            step="0.1"
                          />
                          <select 
                            value={product.unit || 'unit'}
                            onChange={(e) => updateProduct(index, 'unit', e.target.value)}
                          >
                            <option value="unit">pieces</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="l">liters</option>
                            <option value="ml">ml</option>
                            <option value="pack">pack</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <label>Unit Price (₹):</label>
                        <input
                          type="number"
                          value={product.unit_price || 0}
                          onChange={(e) => updateProduct(index, 'unit_price', parseFloat(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className={styles.detailRow}>
                        <label>Total Price (₹):</label>
                        <span className={styles.totalPrice}>
                          ₹{((product.quantity || 1) * (product.unit_price || 0)).toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.detailRow}>
                        <label>Confidence:</label>
                        <span className={styles.confidence}>
                          {product.confidence}% - {getConfidenceBadge(product.confidence)}
                        </span>
                      </div>

                      <div className={styles.detailRow}>
                        <label>Match Method:</label>
                        <span className={styles.matchMethod}>
                          {product.match_method === 'exact_match' ? '✓ Exact Match' : '~ Fuzzy Match'}
                        </span>
                      </div>

                      {product.alternative_matches && product.alternative_matches.length > 0 && (
                        <div className={styles.alternatives}>
                          <label>Alternative matches:</label>
                          <ul>
                            {product.alternative_matches.map((alt, i) => (
                              <li key={i} className={styles.alternative}>
                                <span>{alt.product_name}</span>
                                <span className={styles.altConfidence}>{alt.confidence}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {selectedProducts.length > 0 && (
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Selected Products:</span>
                <strong>{selectedProducts.filter(p => p.selected !== false).length}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Amount:</span>
                <strong>
                  ₹{selectedProducts
                    .filter(p => p.selected !== false)
                    .reduce((sum, p) => sum + ((p.quantity || 1) * (p.unit_price || 0)), 0)
                    .toFixed(2)}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button 
          onClick={() => setEditMode(!editMode)}
          className={styles.editBtn}
          disabled={loading}
        >
          ✏️ {editMode ? 'Done Editing' : 'Edit Results'}
        </button>
        <button 
          onClick={addToCart}
          className={styles.addBtn}
          disabled={loading || selectedProducts.filter(p => p.selected !== false).length === 0}
        >
          {loading ? '⏳ Processing...' : '✓ Add to Cart'}
        </button>
        <button 
          onClick={onClose}
          className={styles.closeBtn}
          disabled={loading}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default OCRResults;
