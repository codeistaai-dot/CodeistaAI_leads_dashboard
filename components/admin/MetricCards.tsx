'use client';

import React from 'react';

export interface MetricsData {
  totalEnquiriesFiltered: number;
  uniqueLeadsFiltered: number;
  todayEnquiriesIST: number;
  totalCampaignTouchpointsAllTime: number;
  activeRangeLabel: string;
}

interface MetricCardsProps {
  metrics?: MetricsData;
  isLoading?: boolean;
}

export default function MetricCards({ metrics, isLoading }: MetricCardsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="admin-metrics-grid" aria-label="Loading summary metrics">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="admin-card metric-card skeleton-card">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-value"></div>
            <div className="skeleton-line skeleton-desc"></div>
          </div>
        ))}
      </div>
    );
  }

  const {
    totalEnquiriesFiltered,
    uniqueLeadsFiltered,
    todayEnquiriesIST,
    totalCampaignTouchpointsAllTime,
    activeRangeLabel,
  } = metrics;

  return (
    <div className="admin-metrics-grid" role="region" aria-label="Summary statistics">
      <div className="admin-card metric-card">
        <div className="metric-header">
          <span className="metric-tag">ENQUIRY EVENTS</span>
          <span className="metric-range-tag">{activeRangeLabel}</span>
        </div>
        <div className="metric-value lime-glow">{totalEnquiriesFiltered.toLocaleString('en-IN')}</div>
        <h3 className="metric-title">Total Enquiries</h3>
        <p className="metric-desc">
          Total course enquiries submitted matching your selected range and filters.
        </p>
      </div>

      <div className="admin-card metric-card">
        <div className="metric-header">
          <span className="metric-tag warm-tag">DISTINCT PROSPECTS</span>
          <span className="metric-range-tag">{activeRangeLabel}</span>
        </div>
        <div className="metric-value warm-glow">{uniqueLeadsFiltered.toLocaleString('en-IN')}</div>
        <h3 className="metric-title">Unique Leads</h3>
        <p className="metric-desc">
          Unique users who submitted enquiries in this period (excluding repeat joins).
        </p>
      </div>

      <div className="admin-card metric-card">
        <div className="metric-header">
          <span className="metric-tag purple-tag">CALENDAR DAY</span>
          <span className="metric-range-tag">Asia/Kolkata</span>
        </div>
        <div className="metric-value">{todayEnquiriesIST.toLocaleString('en-IN')}</div>
        <h3 className="metric-title">Today’s Enquiries</h3>
        <p className="metric-desc">
          Submissions received today (00:00–23:59 IST, fixed to current calendar day).
        </p>
      </div>

      <div className="admin-card metric-card">
        <div className="metric-header">
          <span className="metric-tag muted-tag">MARKETING TOUCHPOINTS</span>
          <span className="metric-range-tag">All Time</span>
        </div>
        <div className="metric-value">{totalCampaignTouchpointsAllTime.toLocaleString('en-IN')}</div>
        <h3 className="metric-title">User Campaign Records</h3>
        <p className="metric-desc">
          Total user-level campaign records captured. (Enquiries have no FK join to campaigns).
        </p>
      </div>
    </div>
  );
}
