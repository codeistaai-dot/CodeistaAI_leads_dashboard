'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminHeader() {
  return (
    <header className="admin-header" role="banner">
      <div className="admin-wrap admin-header-inner">
        <div className="admin-header-brand">
          <Link href="/" className="brand-link" aria-label="CodeistaAI Leads Dashboard">
            <Image
              src="/logo-dark.svg"
              alt="CodeistaAI"
              className="brand-logo"
              width={154}
              height={24}
              priority
            />
          </Link>
          <span className="admin-badge">LEADS DASHBOARD</span>
        </div>

        <div className="admin-header-controls">
          <div className="admin-tz-indicator" title="All displayed dates and boundaries use Asia/Kolkata">
            <span className="admin-tz-dot" aria-hidden="true"></span>
            <span>Asia/Kolkata (IST)</span>
          </div>

          <div className="admin-user-pill">
            <span className="admin-user-icon" aria-hidden="true">⚡</span>
            <span className="admin-user-name">Live Pipeline</span>
          </div>
        </div>
      </div>
    </header>
  );
}
