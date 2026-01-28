import React, { useState, useEffect, useRef } from 'react';
import styles from './SearchComponents.module.css';

/**
 * SearchBar Component
 * Search input with autocomplete suggestions and recent searches
 */
export const SearchBar = ({
  searchType = 'orders',
  onSearch,
  onSuggestionSelect,
  placeholder = 'Search...',
  showRecent = true,
  showTrending = true,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch suggestions from API
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search/suggestions?search_type=${searchType}&partial=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        const data = await response.json();
        setSuggestions(data || []);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [query, searchType]);

  // Load recent and trending searches on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Get trending searches
        if (showTrending) {
          const trendingResponse = await fetch(
            `/api/search/trending?search_type=${searchType}&days=7`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }
          );
          const trendingData = await trendingResponse.json();
          setTrendingSearches((trendingData || []).slice(0, 5));
        }

        // Get recent searches from localStorage
        if (showRecent) {
          const recent = JSON.parse(localStorage.getItem(`recent_searches_${searchType}`) || '[]');
          setRecentSearches(recent.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, [searchType, showRecent, showTrending]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    const recent = JSON.parse(localStorage.getItem(`recent_searches_${searchType}`) || '[]');
    const updated = [searchQuery, ...recent.filter(s => s !== searchQuery)].slice(0, 10);
    localStorage.setItem(`recent_searches_${searchType}`, JSON.stringify(updated));

    // Callback
    onSearch(searchQuery);
    setShowDropdown(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const showDropdownMenu = query.length >= 2 || (showDropdown && (recentSearches.length > 0 || trendingSearches.length > 0));

  return (
    <div className={styles.searchBarContainer}>
      <div className={styles.searchInputWrapper}>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.searchInput}
          aria-label="Search"
        />
        {loading && <span className={styles.loadingSpinner} />}
        <button
          onClick={() => handleSearch()}
          className={styles.searchButton}
          aria-label="Search button"
        >
          🔍
        </button>
      </div>

      {showDropdownMenu && (
        <div ref={dropdownRef} className={styles.searchDropdown}>
          {/* Suggestions */}
          {suggestions.length > 0 && query.length >= 2 && (
            <div className={styles.dropdownSection}>
              <div className={styles.sectionTitle}>Suggestions</div>
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className={styles.dropdownItem}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className={styles.itemIcon}>💡</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {showRecent && recentSearches.length > 0 && query.length < 2 && (
            <div className={styles.dropdownSection}>
              <div className={styles.sectionTitle}>Recent Searches</div>
              {recentSearches.map((search, idx) => (
                <div
                  key={idx}
                  className={styles.dropdownItem}
                  onClick={() => handleSuggestionClick(search)}
                >
                  <span className={styles.itemIcon}>⏱️</span>
                  <span>{search}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {showTrending && trendingSearches.length > 0 && query.length < 2 && (
            <div className={styles.dropdownSection}>
              <div className={styles.sectionTitle}>Trending Searches</div>
              {trendingSearches.map((item, idx) => (
                <div
                  key={idx}
                  className={styles.dropdownItem}
                  onClick={() => handleSuggestionClick(item._id)}
                >
                  <span className={styles.itemIcon}>🔥</span>
                  <span>{item._id}</span>
                  <span className={styles.itemCount}>{item.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {suggestions.length === 0 && query.length >= 2 && (
            <div className={styles.emptyState}>
              No suggestions found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * FilterPanel Component
 * Advanced filters for search results
 */
export const FilterPanel = ({
  searchType = 'orders',
  onFilterChange,
  onApply,
  isOpen = true,
}) => {
  const [filters, setFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState({});
  const [loading, setLoading] = useState(true);

  // Load available filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/search/filters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ search_type: searchType }),
        });
        const data = await response.json();
        setAvailableFilters(data || {});
      } catch (error) {
        console.error('Failed to load filters:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFilters();
  }, [searchType]);

  const handleFilterChange = (field, value) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
    if (onFilterChange) {
      onFilterChange(updated);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(filters);
    }
  };

  const handleClear = () => {
    setFilters({});
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterHeader}>
        <h3>Filters</h3>
        <button
          className={styles.clearButton}
          onClick={handleClear}
        >
          Clear All
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingMessage}>Loading filters...</div>
      ) : (
        <div className={styles.filterList}>
          {Object.entries(availableFilters).map(([field, values]) => (
            <div key={field} className={styles.filterGroup}>
              <label className={styles.filterLabel}>{field}</label>

              {Array.isArray(values) && values[0] === true ? (
                // Boolean filter
                <input
                  type="checkbox"
                  checked={filters[field] || false}
                  onChange={(e) => handleFilterChange(field, e.target.checked)}
                  className={styles.filterCheckbox}
                />
              ) : Array.isArray(values) ? (
                // Multiple choice filter
                <div className={styles.filterOptions}>
                  {values.map((value) => (
                    <label key={value} className={styles.filterOption}>
                      <input
                        type="checkbox"
                        checked={(filters[field] || []).includes(value)}
                        onChange={(e) => {
                          const current = filters[field] || [];
                          const updated = e.target.checked
                            ? [...current, value]
                            : current.filter((v) => v !== value);
                          handleFilterChange(field, updated);
                        }}
                        className={styles.filterCheckbox}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className={styles.filterFooter}>
        <button
          className={styles.applyButton}
          onClick={handleApply}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

/**
 * SearchResults Component
 * Display search results with pagination and sorting
 */
export const SearchResults = ({
  results = [],
  totalCount = 0,
  currentPage = 1,
  pageSize = 20,
  executionTime = 0,
  facets = {},
  onPageChange,
  onSort,
  onExport,
}) => {
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    if (onSort) {
      onSort(field, newOrder);
    }
  };

  const handlePageChange = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  return (
    <div className={styles.searchResults}>
      {/* Results Header */}
      <div className={styles.resultsHeader}>
        <div className={styles.resultsMeta}>
          <span className={styles.resultCount}>
            {totalCount > 0 ? (
              <>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
                <strong>{totalCount}</strong> results
              </>
            ) : (
              'No results found'
            )}
          </span>
          {executionTime > 0 && (
            <span className={styles.executionTime}>
              in {executionTime.toFixed(2)}ms
            </span>
          )}
        </div>

        {results.length > 0 && onExport && (
          <button
            className={styles.exportButton}
            onClick={() => onExport('csv')}
            title="Export as CSV"
          >
            📥 Export
          </button>
        )}
      </div>

      {/* Results List */}
      {results.length > 0 ? (
        <>
          <div className={styles.resultsList}>
            {results.map((result) => (
              <div key={result.id} className={styles.resultItem}>
                <div className={styles.resultContent}>
                  <h3 className={styles.resultTitle}>{result.title}</h3>
                  <p className={styles.resultDescription}>{result.description}</p>

                  {result.metadata && (
                    <div className={styles.resultMetadata}>
                      {Object.entries(result.metadata)
                        .filter(([, value]) => value != null)
                        .map(([key, value]) => (
                          <span key={key} className={styles.metadataItem}>
                            <strong>{key}:</strong> {String(value)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {result.relevance_score > 0 && (
                  <div className={styles.relevanceScore}>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreFill}
                        style={{ width: `${result.relevance_score * 100}%` }}
                      />
                    </div>
                    <span className={styles.scoreText}>
                      {(result.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                ⏮️ First
              </button>

              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ◀️ Previous
              </button>

              <div className={styles.pageNumbers}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`${styles.pageNumber} ${
                        pageNum === currentPage ? styles.active : ''
                      }`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next ▶️
              </button>

              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last ⏭️
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>No results found</p>
          <p className={styles.emptyStateHint}>
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Facets */}
      {Object.keys(facets).length > 0 && (
        <div className={styles.facets}>
          <h4>Refine Results</h4>
          {Object.entries(facets).map(([field, values]) => (
            <div key={field} className={styles.facetGroup}>
              <h5>{field}</h5>
              {values.map(([value, count]) => (
                <div key={value} className={styles.facetItem}>
                  <span>{value}</span>
                  <span className={styles.facetCount}>({count})</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default { SearchBar, FilterPanel, SearchResults };
