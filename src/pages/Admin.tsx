/**
 * Admin Page
 *
 * Administrative dashboard for clinic-wide analytics and patient management.
 */

import { AdminAnalyticsDashboard } from '@/components/admin';
import { MainLayout } from '@/components/layout/MainLayout';

function AdminPage() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <AdminAnalyticsDashboard />
      </div>
    </MainLayout>
  );
}

export default AdminPage;
