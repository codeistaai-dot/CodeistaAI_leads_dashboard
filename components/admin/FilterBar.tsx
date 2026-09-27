'use client';

import React from 'react';

export interface FilterState {
  search: string;
  range: 'all' | 'today' | 'yesterday' | '7days' | '1month' | 'custom';
  startDate: string;
  endDate: string;
  pythonStartingPoint: 'all' | 'new' | 'basics' | 'practice';
  attributionStatus: 'all' | 'linked' | 'unlinked';
  limit: number;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export default function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  isLoading,
}: FilterBarProps) {
  const isCustomRange = filters.range === 'custom';
  const hasActiveFilters =
    filters.search !== '' ||
    filters.range !== 'all' ||
    filters.pythonStartingPoint !== 'all' ||
    filters.attributionStatus !== 'all';

  return (
    <div className="admin-filter-bar admin-card" role="search" aria-label="Lead filters">
      <div className="filter-row primary-row">
        {/* Search Field */}
        <div className="filter-group search-group">
          <label htmlFor="lead-search-input" className="filter-label">
            Search Leads
          </label>
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              id="lead-search-input"
              type="text"
              className="admin-input search-input"
              placeholder="Filter by name, email, or 10-digit mobile..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              maxLength={100}
              autoComplete="off"
            />
            {filters.search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => onFilterChange({ search: '' })}
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Date Range Preset */}
        <div className="filter-group">
          <label htmlFor="date-range-select" className="filter-label">
            Date Range (IST)
          </label>
          <select
            id="date-range-select"
            className="admin-select"
            value={filters.range}
            onChange={(e) =>
              onFilterChange({
                range: e.target.value as FilterState['range'],
              })
            }
          >
            <option value="all">All Time</option>
            <option value="today">Today (IST)</option>
            <option value="yesterday">Yesterday (IST)</option>
            <option value="7days">Last 7 Days</option>
            <option value="1month">Last 30 Days</option>
            <option value="custom">Custom Date Range...</option>
          </select>
        </div>

        {/* Python Starting Point */}
        <div className="filter-group">
          <label htmlFor="python-point-select" className="filter-label">
            Python Starting Point
          </label>
          <select
            id="python-point-select"
            className="admin-select"
            value={filters.pythonStartingPoint}
            onChange={(e) =>
              onFilterChange({
                pythonStartingPoint: e.target.value as FilterState['pythonStartingPoint'],
              })
            }
          >
            <option value="all">All Levels</option>
            <option value="new">New to Python</option>
            <option value="basics">Know the Basics</option>
            <option value="practice">Want More Practice</option>
          </select>
        </div>

        {/* Attribution Status */}
        <div className="filter-group">
          <label htmlFor="attribution-select" className="filter-label">
            User Campaign Touchpoint
          </label>
          <select
            id="attribution-select"
            className="admin-select"
            value={filters.attributionStatus}
            onChange={(e) =>
              onFilterChange({
                attributionStatus: e.target.value as FilterState['attributionStatus'],
              })
            }
          >
            <option value="all">All Enquiries</option>
            <option value="linked">User Has Campaign Records</option>
            <option value="unlinked">User Has No Campaign (Organic)</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Row */}
      {isCustomRange && (
        <div className="filter-row custom-date-row">
          <div className="filter-group">
            <label htmlFor="start-date-input" className="filter-label">
              Start Date (IST)
            </label>
            <input
              id="start-date-input"
              type="date"
              className="admin-input"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date-input" className="filter-label">
              End Date (IST)
            </label>
            <input
              id="end-date-input"
              type="date"
              className="admin-input"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Filter Status Bar */}
      <div className="filter-footer">
        <div className="filter-status-text">
          {hasActiveFilters ? (
            <span className="active-filter-indicator">
              <span className="active-dot" aria-hidden="true"></span>
              Active filters applied
            </span>
          ) : (
            <span className="muted-filter-indicator">Showing all leads without restriction</span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="admin-reset-btn"
            onClick={onResetFilters}
            disabled={isLoading}
          >
            Reset Filters ↺
          </button>
        )}
      </div>
    </div>
  );
}
