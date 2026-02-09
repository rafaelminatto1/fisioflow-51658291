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
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-full">
        <AdminAnalyticsDashboard />
      </div>
    </MainLayout>
  );
}

export default AdminPage;
