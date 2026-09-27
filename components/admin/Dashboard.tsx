'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MetricCards, { MetricsData } from '@/components/admin/MetricCards';
import FilterBar, { FilterState } from '@/components/admin/FilterBar';
import LeadsTable from '@/components/admin/LeadsTable';
import LeadDetailDrawer from '@/components/admin/LeadDetailDrawer';
import { LeadTableRow } from '@/server/services/admin-leads.service';

const INITIAL_FILTERS: FilterState = {
  search: '',
  range: 'all',
  startDate: '',
  endDate: '',
  pythonStartingPoint: 'all',
  attributionStatus: 'all',
  limit: 10,
};

export default function AdminDashboardPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState<number>(1);
  const [leads, setLeads] = useState<LeadTableRow[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | undefined>(undefined);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch leads data from /api/admin/leads
  const fetchLeads = useCallback(async (currentFilters: FilterState, currentPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(currentFilters.limit));

      if (currentFilters.range) params.set('range', currentFilters.range);
      if (currentFilters.range === 'custom') {
        if (currentFilters.startDate) params.set('startDate', currentFilters.startDate);
        if (currentFilters.endDate) params.set('endDate', currentFilters.endDate);
      }
      if (currentFilters.pythonStartingPoint !== 'all') {
        params.set('pythonStartingPoint', currentFilters.pythonStartingPoint);
      }
      if (currentFilters.attributionStatus !== 'all') {
        params.set('attributionStatus', currentFilters.attributionStatus);
      }
      if (currentFilters.search.trim()) {
        params.set('search', currentFilters.search.trim());
      }

      const res = await fetch(`/api/admin/leads?${params.toString()}`);

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to load leads from database.');
        setLeads([]);
        return;
      }

      setLeads(data.data.leads || []);
      setMetrics(data.data.metrics);
      setPagination(data.data.pagination);
    } catch {
      setError('Network communication failure. Please verify database connection.');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(filters, page);
    }, 250);

    return () => clearTimeout(timer);
  }, [filters, page, fetchLeads]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to page 1 on filter modification
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (newLimit: number) => {
    setFilters((prev) => ({ ...prev, limit: newLimit }));
    setPage(1);
  };

  return (
    <div className="admin-dashboard-view">
      {/* Page Title & Refresh */}
      <div className="dashboard-top-bar">
        <div>
          <h1 className="dashboard-main-heading">Lead Enquiries &amp; Attribution</h1>
          <p className="dashboard-main-sub">
            Real-time pipeline of Python course enquiries and lead touchpoints.
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            type="button"
            className="admin-button compact secondary"
            onClick={() => fetchLeads(filters, page)}
            disabled={isLoading}
            aria-label="Refresh leads data"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Data ↺'}
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="admin-alert-error" role="alert">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <div className="alert-content">
            <strong>Database Notice:</strong> {error}
          </div>
          <button
            type="button"
            className="admin-button compact"
            onClick={() => fetchLeads(filters, page)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Metrics */}
      <MetricCards metrics={metrics} isLoading={isLoading && !metrics} />

      {/* Interactive Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Leads Table */}
      <LeadsTable
        leads={leads}
        isLoading={isLoading}
        onSelectLead={(userId) => setSelectedUserId(userId)}
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onResetFilters={handleResetFilters}
      />

      {/* Slide-out Lead Detail Drawer */}
      <LeadDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
