import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { MovementAnalysis } from "@/components/biofeedback/MovementAnalysis";
import { Activity } from "lucide-react";

const Biofeedback = () => {
	return (
		<PageLayout>
			<PageContainer>
				<PageHeader
					title="Biofeedback"
					subtitle="Análise de movimento em tempo real com IA"
				/>
				<div className="space-y-6 animate-fade-in">
					<MovementAnalysis />
				</div>
			</PageContainer>
		</PageLayout>
	);
};

export default Biofeedback;
