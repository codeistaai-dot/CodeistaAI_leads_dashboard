'use client';

import React from 'react';
import { LeadTableRow } from '@/server/services/admin-leads.service';
import { formatDateIST } from '@/server/utils/timezone';

interface LeadsTableProps {
  leads: LeadTableRow[];
  isLoading: boolean;
  onSelectLead: (userId: string) => void;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onResetFilters: () => void;
}

export default function LeadsTable({
  leads,
  isLoading,
  onSelectLead,
  pagination,
  onPageChange,
  onLimitChange,
  onResetFilters,
}: LeadsTableProps) {
  const getPythonBadgeClass = (point: string) => {
    switch (point) {
      case 'new':
        return 'badge-python-new';
      case 'basics':
        return 'badge-python-basics';
      case 'practice':
        return 'badge-python-practice';
      default:
        return 'badge-python-default';
    }
  };

  const getPythonLabel = (point: string) => {
    switch (point) {
      case 'new':
        return 'New to Python';
      case 'basics':
        return 'Knows Basics';
      case 'practice':
        return 'Wants Practice';
      default:
        return point;
    }
  };

  return (
    <div className="admin-card table-card">
      <div className="table-header-bar">
        <div className="table-header-title">
          <h2>Lead Enquiries</h2>
          <span className="table-count-badge">
            {pagination.total} {pagination.total === 1 ? 'event' : 'events'}
          </span>
        </div>

        <div className="table-pagination-inline">
          <label htmlFor="table-limit-select" className="limit-label">
            Rows:
          </label>
          <select
            id="table-limit-select"
            className="admin-select limit-select"
            value={pagination.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={isLoading}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <div className="admin-table-container" tabIndex={0} role="region" aria-label="Lead enquiries table">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Lead Name &amp; Contact</th>
              <th scope="col">Python Starting Point</th>
              <th scope="col">Enquiry Date (IST)</th>
              <th scope="col">Repeat Status</th>
              <th scope="col">Enquiry Attribution</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: Math.min(pagination.limit, 5) }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="skeleton-row">
                  <td>
                    <div className="skeleton-line skeleton-name"></div>
                    <div className="skeleton-line skeleton-sub"></div>
                  </td>
                  <td>
                    <div className="skeleton-line skeleton-badge"></div>
                  </td>
                  <td>
                    <div className="skeleton-line skeleton-date"></div>
                  </td>
                  <td>
                    <div className="skeleton-line skeleton-badge"></div>
                  </td>
                  <td>
                    <div className="skeleton-line skeleton-badge"></div>
                  </td>
                  <td className="text-right">
                    <div className="skeleton-line skeleton-btn"></div>
                  </td>
                </tr>
              ))
            ) : leads.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  <div className="empty-state-content">
                    <span className="empty-icon" aria-hidden="true">📭</span>
                    <h3>No lead enquiries found</h3>
                    <p>There are no course enquiries matching your current search or date filters.</p>
                    <button type="button" className="admin-button compact" onClick={onResetFilters}>
                      Reset All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              // Real Data Rows
              leads.map((row) => (
                <tr key={row._id} className="lead-table-row">
                  <td>
                    <div className="lead-primary-name">{row.name}</div>
                    <div className="lead-contact-meta">
                      <a href={`mailto:${row.email}`} className="contact-link" title="Send email">
                        {row.email}
                      </a>
                      <span className="meta-sep">•</span>
                      <a
                        href={`tel:${row.countryCode}${row.phone}`}
                        className="contact-link"
                        title="Call mobile"
                      >
                        {row.countryCode} {row.phone}
                      </a>
                    </div>
                    {row.userStatus !== 'ACTIVE' && (
                      <span className={`status-tag status-${row.userStatus.toLowerCase()}`}>
                        {row.userStatus}
                      </span>
                    )}
                  </td>

                  <td>
                    <span className={`python-badge ${getPythonBadgeClass(row.pythonStartingPoint)}`}>
                      {getPythonLabel(row.pythonStartingPoint)}
                    </span>
                    {row.message && (
                      <div className="enquiry-message-excerpt" title={row.message}>
                        “{row.message.length > 50 ? row.message.slice(0, 50) + '…' : row.message}”
                      </div>
                    )}
                  </td>

                  <td>
                    <time dateTime={new Date(row.createdAt).toISOString()} className="date-cell">
                      {formatDateIST(row.createdAt)}
                    </time>
                  </td>

                  <td>
                    {row.userTotalEnquiries > 1 ? (
                      <span className="repeat-badge repeat-badge-active" title="User has submitted multiple enquiries">
                        Repeat ({row.userTotalEnquiries} total)
                      </span>
                    ) : (
                      <span className="repeat-badge repeat-badge-first">1st Enquiry</span>
                    )}
                  </td>

                  <td>
                    <div className="attribution-status-cell">
                      <span className="attribution-unlinked-badge" title="No direct database foreign key exists between enquiries and campaigns">
                        Unknown / not linked
                      </span>
                      <small className="touchpoint-count-label">
                        {row.userCampaignTouchpointCount > 0
                          ? `(${row.userCampaignTouchpointCount} user campaign ${row.userCampaignTouchpointCount === 1 ? 'record' : 'records'})`
                          : '(No campaign touchpoints)'}
                      </small>
                    </div>
                  </td>

                  <td className="text-right">
                    <button
                      type="button"
                      className="view-lead-btn"
                      onClick={() => onSelectLead(row.userId)}
                      aria-label={`View full history for ${row.name}`}
                    >
                      View History ↗
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && leads.length > 0 && (
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total enquiries)
          </div>

          <div className="pagination-actions">
            <button
              type="button"
              className="pagination-nav-btn"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage || isLoading}
              aria-label="Previous page"
            >
              ← Previous
            </button>
            <span className="page-current-indicator">{pagination.page}</span>
            <button
              type="button"
              className="pagination-nav-btn"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage || isLoading}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
