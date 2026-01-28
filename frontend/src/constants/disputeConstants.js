/**
 * disputeConstants.js - Shared constants for dispute system
 */

export const DISPUTE_REASONS = [
  { value: 'damaged', label: 'Item Damaged/Broken', description: 'Item arrived damaged or broken' },
  { value: 'not_delivered', label: 'Not Delivered', description: 'Order not delivered yet' },
  { value: 'wrong_item', label: 'Wrong Item Received', description: 'Received wrong item or wrong quantity' },
  { value: 'quality_issue', label: 'Quality Issue', description: 'Item quality not as expected' },
  { value: 'missing_items', label: 'Missing Items', description: 'Some items missing from order' },
  { value: 'other', label: 'Other', description: 'Other issue not listed above' }
];

export const DISPUTE_STATUSES = [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'REFUNDED',
  'REJECTED'
];

export const REFUND_METHODS = [
  { value: 'wallet', label: 'Add to Wallet', description: 'Credit will be added to customer wallet' },
  { value: 'original_payment', label: 'Original Payment Method', description: 'Refund to original payment method' },
  { value: 'manual', label: 'Manual Transfer', description: 'Admin will manually arrange refund' }
];

export const STATUS_COLORS = {
  'OPEN': 'bg-blue-100 text-blue-800 border-blue-300',
  'INVESTIGATING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'RESOLVED': 'bg-green-100 text-green-800 border-green-300',
  'REFUNDED': 'bg-purple-100 text-purple-800 border-purple-300',
  'REJECTED': 'bg-red-100 text-red-800 border-red-300'
};

export const STATUS_ICONS = {
  'OPEN': 'AlertCircle',
  'INVESTIGATING': 'Search',
  'RESOLVED': 'CheckCircle',
  'REFUNDED': 'CheckCircle2',
  'REJECTED': 'XCircle'
};

export const MESSAGE_TYPES = {
  USER: 'USER',
  SYSTEM: 'SYSTEM'
};

/**
 * Get reason label
 */
export const getReasonLabel = (value) => {
  const reason = DISPUTE_REASONS.find(r => r.value === value);
  return reason ? reason.label : value;
};

/**
 * Get reason description
 */
export const getReasonDescription = (value) => {
  const reason = DISPUTE_REASONS.find(r => r.value === value);
  return reason ? reason.description : '';
};

/**
 * Get refund method label
 */
export const getRefundMethodLabel = (value) => {
  const method = REFUND_METHODS.find(m => m.value === value);
  return method ? method.label : value;
};

/**
 * Get refund method description
 */
export const getRefundMethodDescription = (value) => {
  const method = REFUND_METHODS.find(m => m.value === value);
  return method ? method.description : '';
};

/**
 * Check if status is final (no further actions possible)
 */
export const isStatusFinal = (status) => {
  return ['RESOLVED', 'REFUNDED', 'REJECTED'].includes(status);
};

/**
 * Check if dispute is open for messages
 */
export const isDisputeOpen = (status) => {
  return !isStatusFinal(status);
};

export default {
  DISPUTE_REASONS,
  DISPUTE_STATUSES,
  REFUND_METHODS,
  STATUS_COLORS,
  STATUS_ICONS,
  MESSAGE_TYPES,
  getReasonLabel,
  getReasonDescription,
  getRefundMethodLabel,
  getRefundMethodDescription,
  isStatusFinal,
  isDisputeOpen
};
