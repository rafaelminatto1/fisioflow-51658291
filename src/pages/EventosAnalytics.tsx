import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventosAnalytics } from "@/components/eventos/EventosAnalytics";

export default function EventosAnalyticsPage() {
	const navigate = useNavigate();

	return (
		<PageLayout>
			<PageContainer>
				<PageHeader
					title="Analytics de Eventos"
					subtitle="Visualize métricas e estatísticas detalhadas dos seus eventos"
					actions={
						<>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => navigate("/eventos")}
							>
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</>
					}
				/>
				<div className="p-6 space-y-6 animate-fade-in">
					{/* Header */}

					{/* Analytics */}
					<EventosAnalytics />
				</div>
			</PageContainer>
		</PageLayout>
	);
}
