/**
 * Admin Page
 *
 * Administrative dashboard for clinic-wide analytics and patient management.
 */

import { AdminAnalyticsDashboard } from "@/components/admin";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";

function AdminPage() {
	return (
		<PageLayout>
			<PageContainer>
				<div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-full">
					<AdminAnalyticsDashboard />
				</div>
			</PageContainer>
		</PageLayout>
	);
}

export default AdminPage;
