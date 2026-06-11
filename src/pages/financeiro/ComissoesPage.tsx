import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { CommissionsDashboard } from "@/components/financial/CommissionsDashboard";

export default function ComissoesPage() {
	return (
		<PageLayout>
			<PageContainer>
				<CommissionsDashboard />
			</PageContainer>
		</PageLayout>
	);
}
