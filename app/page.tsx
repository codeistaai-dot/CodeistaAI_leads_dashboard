import React from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import Dashboard from '@/components/admin/Dashboard';

export default function LeadDashboardPage() {
  return (
    <div className="admin-layout-root">
      <AdminHeader />
      <main id="admin-main-content" className="admin-main">
        <div className="admin-wrap">
          <Dashboard />
        </div>
      </main>
    </div>
  );
}
