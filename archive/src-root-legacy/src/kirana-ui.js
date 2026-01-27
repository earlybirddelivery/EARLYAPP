/**
 * EarlyBird Kirana-Style Dense Layout System
 * Transforms card-based UI to handwritten notebook style
 * Single-line items: Product — Brand — Qty — Price format
 * Tight line spacing, minimal design, maximum information density
 * 
 * Features:
 * - Dense list layout (name — brand — qty — price per line)
 * - Remove card backgrounds (transparent or light)
 * - Tight line spacing (18px instead of 60px per item)
 * - Images hidden by default
 * - Monospace font options for prices
 * - Quick action buttons inline
 * - Handwritten-style decorative elements
 * 
 * @author EarlyBird Team
 * @version 2.0
 * @date January 2026
 */

class EarlyBirdKiranaUI {
  constructor() {
    this.theme = 'dense';
    this.spacing = {
      item: '18px',      // Line height per item
      section: '12px',   // Section gap
      label: '10px',     // Label margin
      padding: '8px'     // Internal padding
    };
    this.colors = {
      text: '#1a1a1a',
      secondary: '#666666',
      tertiary: '#999999',
      border: '#e0e0e0',
      background: '#ffffff',
      highlight: '#fff3cd'
    };
  }

  /**
   * Generate CSS for dense layout
   * @returns {string} CSS rules
   */
  generateDenseCSS() {
    return `
      /* Kirana Dense Layout Theme */

      /* Remove card backgrounds */
      .card {
        background: transparent !important;
        border: none !important;
        border-bottom: 1px solid ${this.colors.border};
        padding: 0 !important;
        margin-bottom: ${this.spacing.section} !important;
        border-radius: 0 !important;
      }

      .card h3 {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: ${this.spacing.label} 0;
        color: ${this.colors.tertiary};
      }

      /* Dense list items */
      .dense-item {
        display: grid;
        grid-template-columns: 1.5fr 1fr 80px 80px 60px;
        gap: 12px;
        align-items: center;
        padding: ${this.spacing.padding} 0;
        border-bottom: 1px solid #f0f0f0;
        min-height: ${this.spacing.item};
        font-size: 13px;
      }

      .dense-item:hover {
        background-color: ${this.colors.highlight};
      }

      .dense-item__name {
        font-weight: 600;
        color: ${this.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dense-item__brand {
        font-size: 12px;
        color: ${this.colors.secondary};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .dense-item__qty {
        text-align: center;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        font-weight: 500;
      }

      .dense-item__price {
        text-align: right;
        font-family: 'Monaco', 'Courier New', monospace;
        font-weight: 600;
        color: var(--primary);
      }

      .dense-item__actions {
        display: flex;
        gap: 4px;
      }

      .dense-item__actions button {
        padding: 4px 8px;
        font-size: 11px;
        border: 1px solid ${this.colors.border};
        background: white;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.2s;
      }

      .dense-item__actions button:hover {
        background: ${this.colors.highlight};
        border-color: var(--primary);
      }

      /* Hide images */
      img.product-image,
      img.item-image {
        display: none !important;
      }

      /* Dense section headers */
      .dense-section-header {
        display: grid;
        grid-template-columns: 1.5fr 1fr 80px 80px 60px;
        gap: 12px;
        padding: ${this.spacing.padding} 0;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${this.colors.tertiary};
        border-bottom: 2px solid ${this.colors.border};
        margin-bottom: 4px;
      }

      /* Dense forms */
      .dense-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: ${this.spacing.section};
      }

      .dense-form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .dense-form-group label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${this.colors.tertiary};
      }

      .dense-form-group input,
      .dense-form-group select,
      .dense-form-group textarea {
        padding: 6px 8px;
        font-size: 13px;
        border: 1px solid ${this.colors.border};
        border-radius: 3px;
        font-family: 'Monaco', 'Courier New', monospace;
      }

      /* Dense tables */
      .dense-table {
        width: 100%;
        border-collapse: collapse;
        margin: ${this.spacing.section} 0;
      }

      .dense-table th {
        background: transparent;
        border-bottom: 2px solid ${this.colors.border};
        padding: 6px 0;
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${this.colors.tertiary};
      }

      .dense-table td {
        padding: 6px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
      }

      .dense-table tr:hover {
        background-color: ${this.colors.highlight};
      }

      /* Stats display (compact) */
      .stat-card {
        padding: 12px;
        border: 1px solid ${this.colors.border};
        border-radius: 3px;
        background: white;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px;
        align-items: center;
        font-size: 13px;
      }

      .stat-card__value {
        font-size: 18px;
        font-weight: 700;
        font-family: 'Monaco', 'Courier New', monospace;
      }

      .stat-card__label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${this.colors.tertiary};
      }

      /* Button styles for dense layout */
      .btn-dense {
        padding: 6px 12px;
        font-size: 12px;
        border: 1px solid ${this.colors.border};
        background: white;
        border-radius: 3px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }

      .btn-dense:hover {
        background: var(--light);
        border-color: var(--primary);
      }

      .btn-dense.primary {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .btn-dense.primary:hover {
        opacity: 0.9;
      }

      /* Decorative elements (handwritten style) */
      .dense-divider {
        height: 1px;
        background: linear-gradient(to right, transparent, ${this.colors.border}, transparent);
        margin: ${this.spacing.section} 0;
      }

      .dense-note {
        padding: 8px 12px;
        background: ${this.colors.highlight};
        border-left: 3px solid var(--primary);
        font-size: 12px;
        font-style: italic;
        line-height: 1.4;
        margin: ${this.spacing.section} 0;
        border-radius: 2px;
      }

      /* Monthly list specific */
      .monthly-list-item {
        display: grid;
        grid-template-columns: 1.5fr 80px 60px 50px;
        gap: 12px;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid #f0f0f0;
        min-height: 24px;
      }

      .monthly-list-item:hover {
        background: ${this.colors.highlight};
      }

      .monthly-list-item__name {
        font-weight: 600;
        font-size: 13px;
      }

      .monthly-list-item__qty {
        border: 1px solid ${this.colors.border};
        padding: 4px 6px;
        text-align: center;
        font-size: 12px;
        border-radius: 2px;
      }

      .monthly-list-item__unit {
        font-size: 11px;
        color: ${this.colors.secondary};
        text-align: center;
      }

      /* Order summary (compact) */
      .order-summary {
        display: grid;
        grid-template-columns: 1fr 80px 80px;
        gap: 12px;
        padding: 8px 0;
        font-size: 12px;
        border-bottom: 1px solid ${this.colors.border};
      }

      .order-summary__status {
        display: inline-block;
        padding: 2px 6px;
        background: var(--light);
        border-radius: 2px;
        font-size: 10px;
        font-weight: 700;
      }

      /* Subscription line item */
      .subscription-item {
        display: grid;
        grid-template-columns: 1.5fr 80px 1fr 80px;
        gap: 12px;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
      }

      /* Wallet transactions (tight) */
      .transaction-item {
        display: grid;
        grid-template-columns: auto 1fr 80px 80px;
        gap: 12px;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 12px;
      }

      .transaction-item__icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .transaction-item__type {
        font-weight: 600;
      }

      .transaction-item__amount {
        text-align: right;
        font-family: 'Monaco', 'Courier New', monospace;
        font-weight: 600;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .dense-item,
        .dense-section-header {
          grid-template-columns: 1fr 60px 60px;
          gap: 8px;
        }

        .dense-item__brand {
          display: none;
        }

        .monthly-list-item {
          grid-template-columns: 1fr 50px 40px;
        }

        .subscription-item {
          grid-template-columns: 1fr 70px;
        }
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .dense-item:hover,
        .dense-table tr:hover {
          background-color: rgba(255, 243, 205, 0.1);
        }

        .dense-form-group input,
        .dense-form-group select {
          background: #2a2a2a;
          color: #e0e0e0;
          border-color: #444;
        }
      }
    `;
  }

  /**
   * Create dense list HTML for items
   * @param {array} items - Array of items with name, brand, qty, price
   * @param {object} options - { showBrand, showPrice, actions }
   * @returns {string} HTML
   */
  renderDenseList(items, options = {}) {
    const { showBrand = true, showPrice = true, actions = ['edit', 'delete'] } = options;

    let html = '<div class="dense-list">';

    // Header
    html += `
      <div class="dense-section-header">
        <div>PRODUCT</div>
        ${showBrand ? '<div>BRAND</div>' : ''}
        <div>QTY</div>
        ${showPrice ? '<div style="text-align: right;">PRICE</div>' : ''}
        <div></div>
      </div>
    `;

    // Items
    items.forEach(item => {
      html += `
        <div class="dense-item">
          <div class="dense-item__name">${item.name}</div>
          ${showBrand ? `<div class="dense-item__brand">${item.brand || '-'}</div>` : ''}
          <div class="dense-item__qty">${item.qty}</div>
          ${showPrice ? `<div class="dense-item__price">₹${item.price}</div>` : ''}
          <div class="dense-item__actions">
            ${actions.map(action => `<button onclick="this.parentElement.dispatchEvent(new CustomEvent('${action}', {detail: '${item.id}'}))">${action === 'edit' ? '✏️' : '🗑️'}</button>`).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Create dense form
   * @param {array} fields - Form fields
   * @returns {string} HTML
   */
  renderDenseForm(fields) {
    let html = '<form class="dense-form">';

    fields.forEach(field => {
      html += `
        <div class="dense-form-group">
          <label>${field.label}</label>
          ${field.type === 'select' 
            ? `<select name="${field.name}">${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select>`
            : `<input type="${field.type}" name="${field.name}" placeholder="${field.placeholder || ''}" />`
          }
        </div>
      `;
    });

    html += '</form>';
    return html;
  }

  /**
   * Create dense table
   * @param {array} data - Table data
   * @param {array} columns - Column definitions
   * @returns {string} HTML
   */
  renderDenseTable(data, columns) {
    let html = '<table class="dense-table"><thead><tr>';

    columns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });

    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        html += `<td>${row[col.key] || '-'}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Create stat cards (compact)
   * @param {array} stats - Stat definitions
   * @returns {string} HTML
   */
  renderStatCards(stats) {
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">';

    stats.forEach(stat => {
      html += `
        <div class="stat-card">
          <div>
            <div class="stat-card__label">${stat.label}</div>
            <div class="stat-card__value">${stat.value}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Create note/annotation
   * @param {string} text - Note text
   * @param {string} type - Type (info, warning, success)
   * @returns {string} HTML
   */
  renderNote(text, type = 'info') {
    const colors = {
      info: '#fff3cd',
      warning: '#f8d7da',
      success: '#d4edda'
    };

    return `
      <div class="dense-note" style="background: ${colors[type]};">
        ${text}
      </div>
    `;
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.EarlyBirdKiranaUI = EarlyBirdKiranaUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EarlyBirdKiranaUI;
}
