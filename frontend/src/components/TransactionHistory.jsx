/**
 * Transaction History Component
 * Displays paginated transaction history with filters
 */

import React, { useState, useEffect } from 'react';
import WalletService from '../../services/walletService';
import styles from './CustomerWallet.module.css';

const TransactionHistory = ({ customerId }) => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    limit: 20,
    skip: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, [customerId, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await WalletService.getTransactions(
        customerId,
        filters.limit,
        filters.skip,
        filters.type || null
      );
      setTransactions(data.transactions);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      skip: 0
    }));
  };

  const handlePagination = (newSkip) => {
    setFilters(prev => ({
      ...prev,
      skip: newSkip
    }));
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'CREDIT':
        return '➕';
      case 'DEBIT':
        return '➖';
      case 'REFUND':
        return '↩️';
      default:
        return '💳';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'CREDIT':
        return styles.transactionCredit;
      case 'DEBIT':
        return styles.transactionDebit;
      case 'REFUND':
        return styles.transactionRefund;
      default:
        return '';
    }
  };

  const currentPage = Math.floor(filters.skip / filters.limit) + 1;
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className={styles.container}>
      <h2>Transaction History</h2>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="type">Filter by Type:</label>
          <select
            id="type"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className={styles.filterSelect}
          >
            <option value="">All Transactions</option>
            <option value="CREDIT">Credits Added</option>
            <option value="DEBIT">Credits Used</option>
            <option value="REFUND">Refunds</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="limit">Show:</label>
          <select
            id="limit"
            name="limit"
            value={filters.limit}
            onChange={handleFilterChange}
            className={styles.filterSelect}
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className={styles.loading}>Loading transactions...</div>
      ) : error ? (
        <div className={styles.error}>Error: {error}</div>
      ) : transactions.length === 0 ? (
        <div className={styles.noData}>No transactions found</div>
      ) : (
        <>
          <div className={styles.transactionsList}>
            {transactions.map(tx => (
              <div
                key={tx._id}
                className={`${styles.transactionItem} ${getTransactionColor(tx.type)}`}
              >
                <div className={styles.transactionIcon}>
                  {getTransactionIcon(tx.type)}
                </div>

                <div className={styles.transactionDetails}>
                  <div className={styles.transactionReason}>{tx.reason}</div>
                  <div className={styles.transactionDate}>
                    {new Date(tx.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {tx.source && (
                    <span className={styles.transactionSource}>{tx.source}</span>
                  )}
                </div>

                <div className={styles.transactionAmount}>
                  <span className={`${styles.amount} ${tx.type === 'DEBIT' ? styles.debit : styles.credit}`}>
                    {tx.type === 'DEBIT' ? '-' : '+'}
                    {WalletService.formatCurrency(tx.amount)}
                  </span>
                </div>

                {tx.expiry_date && (
                  <div className={styles.transactionExpiry}>
                    Expires: {new Date(tx.expiry_date).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                onClick={() => handlePagination(Math.max(0, filters.skip - filters.limit))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                className={styles.paginationBtn}
                onClick={() => handlePagination(filters.skip + filters.limit)}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionHistory;
