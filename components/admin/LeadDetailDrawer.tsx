'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatDateIST } from '@/server/utils/timezone';

interface LeadDetailData {
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    timezone: string;
    status: 'ACTIVE' | 'DELETED' | 'ONHOLD';
    createdAt: string;
  };
  enquiryHistory: Array<{
    _id: string;
    pythonStartingPoint: string;
    message?: string;
    createdAt: string;
    attributionStatus: string;
  }>;
  campaignTouchpoints: Array<{
    _id: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    gclid?: string;
    fbclid?: string;
    platform?: string;
    device?: string;
    route?: string;
    createdAt: string;
  }>;
  relationshipNotice: string;
}

interface LeadDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
}

export default function LeadDetailDrawer({ userId, onClose }: LeadDetailDrawerProps) {
  const [data, setData] = useState<LeadDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enquiries' | 'campaigns'>('enquiries');

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const loadLeadDetails = async () => {
      try {
        const res = await fetch(`/api/admin/leads/${userId}`);
        if (!res.ok) {
          throw new Error(`Failed to load lead details (HTTP ${res.status})`);
        }
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setData(json.data);
            setError(null);
          } else {
            setError(json.message || 'Unable to retrieve lead data');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Network error occurred');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setTimeout(() => closeButtonRef.current?.focus(), 50);
        }
      }
    };

    loadLeadDetails();

    return () => {
      isMounted = false;
      document.body.style.overflow = prevOverflow;
    };
  }, [userId]);

  // Keyboard accessibility: close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!userId) return null;

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div
        className="drawer-container"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <span className="drawer-eyebrow">LEAD PROFILE &amp; AUDIT</span>
            <h2 id="drawer-title" className="drawer-title">
              {isLoading ? 'Loading profile...' : data?.user.name || 'Lead Details'}
            </h2>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close lead detail panel"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {isLoading && (
            <div className="drawer-loading-state">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-value"></div>
              <div className="skeleton-line skeleton-desc"></div>
            </div>
          )}

          {error && (
            <div className="drawer-error-state" role="alert">
              <p className="error-msg">⚠️ {error}</p>
              <button
                type="button"
                className="admin-button compact"
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  fetch(`/api/admin/leads/${userId}`)
                    .then((r) => r.json())
                    .then((j) => setData(j.data))
                    .catch((e) => setError(e.message))
                    .finally(() => setIsLoading(false));
                }}
              >
                Retry Loading
              </button>
            </div>
          )}

          {data && (
            <>
              {/* User Overview Card */}
              <div className="profile-overview-card admin-card">
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="profile-item-label">Email Address</span>
                    <a href={`mailto:${data.user.email}`} className="profile-link">
                      {data.user.email}
                    </a>
                  </div>

                  <div className="profile-item">
                    <span className="profile-item-label">Mobile Number</span>
                    <a href={`tel:${data.user.countryCode}${data.user.phone}`} className="profile-link">
                      {data.user.countryCode} {data.user.phone}
                    </a>
                  </div>

                  <div className="profile-item">
                    <span className="profile-item-label">Account Status</span>
                    <span className={`status-pill status-${data.user.status.toLowerCase()}`}>
                      {data.user.status}
                    </span>
                  </div>

                  <div className="profile-item">
                    <span className="profile-item-label">Registered Date</span>
                    <span className="profile-item-val">{formatDateIST(data.user.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Explicit Attribution Limitation Box */}
              <div className="attribution-notice-box" role="note">
                <div className="notice-icon" aria-hidden="true">ℹ️</div>
                <div className="notice-text">
                  <strong>Attribution Architecture Note:</strong>
                  <p>
                    {data.relationshipNotice}
                  </p>
                </div>
              </div>

              {/* Timeline Navigation Tabs */}
              <div className="drawer-tabs-bar" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'enquiries'}
                  className={`drawer-tab-btn ${activeTab === 'enquiries' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('enquiries')}
                >
                  Course Enquiries ({data.enquiryHistory.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'campaigns'}
                  className={`drawer-tab-btn ${activeTab === 'campaigns' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('campaigns')}
                >
                  Campaign Touchpoints ({data.campaignTouchpoints.length})
                </button>
              </div>

              {/* Tab Content: Enquiries */}
              {activeTab === 'enquiries' && (
                <div className="drawer-timeline" role="tabpanel">
                  <h3 className="timeline-section-title">Enquiry Events History</h3>
                  <div className="timeline-items-list">
                    {data.enquiryHistory.map((enquiry, idx) => (
                      <div key={enquiry._id} className="timeline-card">
                        <div className="timeline-card-header">
                          <span className="timeline-counter">#{data.enquiryHistory.length - idx}</span>
                          <span className="python-badge badge-python-basics">
                            Level: {enquiry.pythonStartingPoint}
                          </span>
                          <time className="timeline-date">{formatDateIST(enquiry.createdAt)}</time>
                        </div>
                        {enquiry.message ? (
                          <div className="timeline-message">
                            <strong>Note/Message:</strong> “{enquiry.message}”
                          </div>
                        ) : (
                          <div className="timeline-empty-message">No message included</div>
                        )}
                        <div className="timeline-attribution-note">
                          Attribution: <span className="muted-pill">{enquiry.attributionStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Content: Campaign Touchpoints */}
              {activeTab === 'campaigns' && (
                <div className="drawer-timeline" role="tabpanel">
                  <h3 className="timeline-section-title">User Campaign Touchpoints</h3>
                  {data.campaignTouchpoints.length === 0 ? (
                    <div className="empty-touchpoints-card">
                      <p className="empty-title">🌱 Organic Lead (No UTM Records)</p>
                      <p className="empty-desc">
                        This user signed up directly with no tracked campaign or ad parameters attached.
                      </p>
                    </div>
                  ) : (
                    <div className="timeline-items-list">
                      {data.campaignTouchpoints.map((c, idx) => (
                        <div key={c._id} className="timeline-card campaign-card">
                          <div className="timeline-card-header">
                            <span className="timeline-counter">Touchpoint #{data.campaignTouchpoints.length - idx}</span>
                            <time className="timeline-date">{formatDateIST(c.createdAt)}</time>
                          </div>
                          <div className="campaign-params-grid">
                            {c.utm_source && (
                              <div className="campaign-param-row">
                                <span className="param-k">Source:</span>
                                <span className="param-v">{c.utm_source}</span>
                              </div>
                            )}
                            {c.utm_medium && (
                              <div className="campaign-param-row">
                                <span className="param-k">Medium:</span>
                                <span className="param-v">{c.utm_medium}</span>
                              </div>
                            )}
                            {c.utm_campaign && (
                              <div className="campaign-param-row">
                                <span className="param-k">Campaign:</span>
                                <span className="param-v">{c.utm_campaign}</span>
                              </div>
                            )}
                            {c.utm_content && (
                              <div className="campaign-param-row">
                                <span className="param-k">Content:</span>
                                <span className="param-v">{c.utm_content}</span>
                              </div>
                            )}
                            {c.utm_term && (
                              <div className="campaign-param-row">
                                <span className="param-k">Term:</span>
                                <span className="param-v">{c.utm_term}</span>
                              </div>
                            )}
                            {c.gclid && (
                              <div className="campaign-param-row">
                                <span className="param-k">GCLID:</span>
                                <span className="param-v code-val">{c.gclid}</span>
                              </div>
                            )}
                            {c.fbclid && (
                              <div className="campaign-param-row">
                                <span className="param-k">FBCLID:</span>
                                <span className="param-v code-val">{c.fbclid}</span>
                              </div>
                            )}
                            {c.platform && (
                              <div className="campaign-param-row">
                                <span className="param-k">Platform:</span>
                                <span className="param-v">{c.platform}</span>
                              </div>
                            )}
                            {c.device && (
                              <div className="campaign-param-row">
                                <span className="param-k">Device:</span>
                                <span className="param-v">{c.device}</span>
                              </div>
                            )}
                            {c.route && (
                              <div className="campaign-param-row">
                                <span className="param-k">Route:</span>
                                <span className="param-v">{c.route}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
