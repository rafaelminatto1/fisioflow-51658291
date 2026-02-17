/**
 * Cohort Analysis Page
 *
 * Displays cohort comparison and analysis for the admin panel
 */

import { CohortComparison } from '@/components/admin/CohortComparison';
import { MainLayout } from '@/components/layout/MainLayout';

function CohortAnalysisPage() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <CohortComparison />
      </div>
    </MainLayout>
  );
}

export default CohortAnalysisPage;
