import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { DemonstrativoMensalContent } from "./components/DemonstrativoMensalContent";

export default function DemonstrativoMensalPage() {
  return (
    <PageLayout>
      <PageContainer>
        <PageHeader title="Raio-X Financeiro" subtitle="Inteligência e Performance Mensal" />
        <div className="p-6 max-w-7xl mx-auto">
          <DemonstrativoMensalContent />
        </div>
      </PageContainer>
    </PageLayout>
  );
}
