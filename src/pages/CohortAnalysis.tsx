/**
 * Cohort Analysis Page
 *
 * Displays cohort comparison and analysis for the admin panel
 */

import { CohortComparison } from "@/components/admin/CohortComparison";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";

function CohortAnalysisPage() {
	return (
		<PageLayout>
			<PageContainer>
				<div className="container mx-auto p-6">
					<CohortComparison />
				</div>
			</PageContainer>
		</PageLayout>
	);
}

export default CohortAnalysisPage;
